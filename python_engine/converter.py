import sys
import json
import os
import platform
import subprocess
import traceback

def pdf_to_docx(input_path, output_path):
    try:
        from pdf2docx import Converter
        cv = Converter(input_path)
        cv.convert(output_path, start=0, end=None)
        cv.close()
        return {"status": "success", "message": "PDF to DOCX conversion successful."}
    except Exception as e:
        return {"status": "error", "message": str(e), "trace": traceback.format_exc()}

def pdf_to_txt(input_path, output_path):
    try:
        import fitz # PyMuPDF
        doc = fitz.open(input_path)
        text = ""
        for page in doc:
            text += page.get_text()
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)
        return {"status": "success", "message": "PDF to TXT conversion successful."}
    except Exception as e:
        return {"status": "error", "message": str(e), "trace": traceback.format_exc()}

def compress_pdf(input_path, output_path):
    try:
        import fitz
        doc = fitz.open(input_path)
        # deflate=True compresses streams, garbage=4 removes unused objects and unifies duplicates
        doc.save(output_path, deflate=True, garbage=4)
        return {"status": "success", "message": "PDF compression successful."}
    except Exception as e:
        return {"status": "error", "message": str(e), "trace": traceback.format_exc()}

def encrypt_pdf(input_path, output_path, password):
    try:
        import fitz
        doc = fitz.open(input_path)
        # Use AES 256 for max security
        doc.save(output_path, encryption=fitz.PDF_ENCRYPT_AES_256, user_pw=password, owner_pw=password)
        return {"status": "success", "message": "PDF encryption successful."}
    except Exception as e:
        return {"status": "error", "message": str(e), "trace": traceback.format_exc()}

def decrypt_pdf(input_path, output_path, password):
    try:
        import fitz
        doc = fitz.open(input_path)
        if doc.needs_pass:
            if not doc.authenticate(password):
                return {"status": "error", "message": "密码错误，无法解密。"}
        # Saving without encryption flags removes the password
        doc.save(output_path)
        return {"status": "success", "message": "PDF decryption successful."}
    except Exception as e:
        return {"status": "error", "message": str(e), "trace": traceback.format_exc()}

def office_to_pdf_linux(input_path, output_path):
    try:
        out_dir = os.path.dirname(output_path)
        # Call libreoffice. Assumes `libreoffice` is in PATH.
        # Command: libreoffice --headless --convert-to pdf input_path --outdir out_dir
        # Note: output filename will be the same as input but with .pdf. 
        # We need to rename it if output_path has a different name.
        result = subprocess.run(
            ['libreoffice', '--headless', '--convert-to', 'pdf', input_path, '--outdir', out_dir],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
        if result.returncode != 0:
            return {"status": "error", "message": f"LibreOffice failed: {result.stderr}"}
            
        expected_out = os.path.join(out_dir, os.path.splitext(os.path.basename(input_path))[0] + ".pdf")
        if os.path.exists(expected_out) and expected_out != output_path:
            # Rename to match requested output path
            if os.path.exists(output_path):
                os.remove(output_path)
            os.rename(expected_out, output_path)
            
        return {"status": "success", "message": "Office to PDF conversion successful via LibreOffice."}
    except FileNotFoundError:
        return {"status": "error", "message": "未检测到 LibreOffice。在 Linux/macOS 环境下，请先安装 LibreOffice 以支持 Office 文件转换。"}
    except Exception as e:
        return {"status": "error", "message": str(e), "trace": traceback.format_exc()}

def office_to_pdf_windows(input_path, output_path):
    ext = os.path.splitext(input_path)[1].lower()
    app_obj = None
    doc_obj = None
    try:
        import win32com.client
        import pythoncom
        pythoncom.CoInitialize()

        abs_in = os.path.abspath(input_path)
        abs_out = os.path.abspath(output_path)

        # Define helper to try multiple progids
        def try_dispatch(progids):
            for progid in progids:
                try:
                    return win32com.client.DispatchEx(progid)
                except:
                    continue
            return None

        if ext in ['.doc', '.docx']:
            word = try_dispatch(['Word.Application', 'KWPS.Application'])
            if not word:
                raise Exception("WordAppNotFound")
            app_obj = word
            word.Visible = False
            doc = word.Documents.Open(abs_in)
            doc_obj = doc
            try:
                doc.ExportAsFixedFormat(abs_out, 17, False, 0, 0, 1, 1, 0, True, True, 1)
            except Exception:
                doc.SaveAs(abs_out, FileFormat=17)
        elif ext in ['.xls', '.xlsx']:
            excel = try_dispatch(['Excel.Application', 'ET.Application'])
            if not excel:
                raise Exception("ExcelAppNotFound")
            app_obj = excel
            excel.Visible = False
            wb = excel.Workbooks.Open(abs_in)
            doc_obj = wb
            wb.ExportAsFixedFormat(0, abs_out) # 0 is xlTypePDF
        elif ext in ['.ppt', '.pptx']:
            ppt = try_dispatch(['PowerPoint.Application', 'WPP.Application'])
            if not ppt:
                raise Exception("PPTAppNotFound")
            app_obj = ppt
            deck = ppt.Presentations.Open(abs_in, WithWindow=False)
            doc_obj = deck
            deck.SaveAs(abs_out, 32) # 32 is ppSaveAsPDF
        else:
            raise ValueError(f"Unsupported Office format: {ext}")

        # Cleanup on success
        if doc_obj:
            try:
                doc_obj.Close(False)
            except Exception:
                pass
        if app_obj:
            try:
                app_obj.Quit()
            except Exception:
                pass
        pythoncom.CoUninitialize()
        return {"status": "success", "message": "Office to PDF conversion successful."}

    except Exception as e:
        # Cleanup on failure to prevent orphaned Office processes
        if doc_obj:
            try:
                doc_obj.Close(False)
            except Exception:
                pass
        if app_obj:
            try:
                app_obj.Quit()
            except Exception:
                pass
        try:
            pythoncom.CoUninitialize()
        except Exception:
            pass
        err_msg = str(e)
        if "NotFound" in err_msg or "Invalid class string" in err_msg:
            return {"status": "error", "message": f"无法调用系统 {ext} 办公软件接口。建议：请确保您的电脑已安装 Microsoft Office 或 WPS 后重试。"}
        return {"status": "error", "message": err_msg, "trace": traceback.format_exc()}

def main():
    if len(sys.argv) < 4:
        print(json.dumps({"status": "error", "message": "Missing arguments. Usage: python converter.py <mode> <input_path> <output_path> [extra_arg]"}))
        sys.exit(1)

    mode = sys.argv[1]
    input_path = sys.argv[2]
    output_path = sys.argv[3]
    extra_arg = sys.argv[4] if len(sys.argv) > 4 else None

    if not os.path.exists(input_path):
        print(json.dumps({"status": "error", "message": f"Input file not found: {input_path}"}))
        sys.exit(1)

    result = {}
    if mode == "pdf2docx":
        result = pdf_to_docx(input_path, output_path)
    elif mode == "pdf2txt":
        result = pdf_to_txt(input_path, output_path)
    elif mode == "compress":
        result = compress_pdf(input_path, output_path)
    elif mode == "encrypt":
        result = encrypt_pdf(input_path, output_path, extra_arg)
    elif mode == "decrypt":
        result = decrypt_pdf(input_path, output_path, extra_arg)
    elif mode == "office2pdf":
        if platform.system() == "Windows":
            result = office_to_pdf_windows(input_path, output_path)
        else:
            result = office_to_pdf_linux(input_path, output_path)
    else:
        result = {"status": "error", "message": f"Unsupported mode: {mode}"}

    print(json.dumps(result))

if __name__ == "__main__":
    main()
