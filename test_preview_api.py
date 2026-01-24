import requests
import os

url = "http://localhost:8000/api/file/preview-columns"
file_path = "d:/Git/MultiIQToolkit/test_preview.csv"

# Ensure API is running on localhost:8000. 
# The context says `python main.py` is running, likely on port 8000 (uvicorn default).

try:
    with open(file_path, "rb") as f:
        files = {"file": ("test_preview.csv", f, "text/csv")}
        response = requests.post(url, files=files)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Response JSON:")
        print(response.json())
    else:
        print("Error Response:")
        print(response.text)
except Exception as e:
    print(f"Request failed: {e}")
