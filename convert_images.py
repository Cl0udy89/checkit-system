import os
from PIL import Image

# Register AVIF plugin if possible
try:
    import pillow_avif
except ImportError:
    pass

directory = r"c:\Users\bartl\Documents\agy\CheckIT\content\it_match\images"

for filename in os.listdir(directory):
    if filename.startswith("pyt_"):
        continue
    
    # We have files like 17.webp, 27.jpg, 33.avif
    name, ext = os.path.splitext(filename)
    if not name.isdigit():
        continue
        
    num = name
    old_path = os.path.join(directory, filename)
    new_path = os.path.join(directory, f"pyt_{num}.webp")
    
    print(f"Processing {filename} -> {new_path}")
    
    if ext.lower() == ".webp":
        os.rename(old_path, new_path)
    else:
        try:
            with Image.open(old_path) as img:
                img.save(new_path, "WEBP", quality=85)
            os.remove(old_path)
            print("Converted successfully.")
        except Exception as e:
            print(f"Error converting {filename}: {e}")
            # Try fallback using ffmpeg if PIL fails (e.g. for AVIF)
            import subprocess
            try:
                subprocess.run(["ffmpeg", "-y", "-i", old_path, "-vcodec", "libwebp", new_path], check=True)
                os.remove(old_path)
                print("Converted with ffmpeg.")
            except Exception as e2:
                print(f"FFMPEG failed too: {e2}")
