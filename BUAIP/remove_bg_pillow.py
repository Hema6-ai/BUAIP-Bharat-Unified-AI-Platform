from PIL import Image

input_path = 'c:/BUAIP/BUAIP/public/logo.png'
output_path = 'c:/BUAIP/BUAIP/public/logo_transparent.png'

try:
    img = Image.open(input_path)
    img = img.convert("RGBA")
    datas = img.getdata()
    
    newData = []
    # Remove white/light grey background pixels
    for item in datas:
        # Check if the pixel is close to white (e.g., > 240 for R, G, B)
        if item[0] > 230 and item[1] > 230 and item[2] > 230:
            newData.append((255, 255, 255, 0)) # transparent
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")
    print("Successfully removed white background via Pillow!")
except Exception as e:
    print(f"Error: {e}")
