import os
from PIL import Image

def create_multi_size_icon(png_path, ico_path):
    try:
        img = Image.open(png_path)
        # Ensure image has alpha channel
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Create different sizes for the ico file
        # Windows icons typically need these sizes to avoid black boxes/scaling issues
        sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
        
        img.save(ico_path, format='ICO', sizes=sizes)
        print("Successfully created multi-resolution ICO file.")
    except Exception as e:
        print(f"Error creating icon: {e}")

if __name__ == "__main__":
    import sys
    base_dir = os.path.dirname(os.path.abspath(__file__))
    png_path = os.path.join(base_dir, 'public', 'logo.png')
    ico_path = os.path.join(base_dir, 'build', 'icon.ico')
    create_multi_size_icon(png_path, ico_path)
