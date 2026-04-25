!macro customInstall
  ; Register context menu for all files, or just PDF. Let's do PDF and docx.
  WriteRegStr HKCR "SystemFileAssociations\.pdf\shell\PdfToolsPro" "" "在 全民好用PDF 中打开"
  WriteRegStr HKCR "SystemFileAssociations\.pdf\shell\PdfToolsPro\command" "" '"$INSTDIR\全民好用pdf.exe" "%1"'
!macroend

!macro customUnInstall
  DeleteRegKey HKCR "SystemFileAssociations\.pdf\shell\PdfToolsPro"
!macroend
