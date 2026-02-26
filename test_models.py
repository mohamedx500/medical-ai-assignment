import os
from google import genai
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

def main():
    api_key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    
    with open("models-utf8.txt", "w", encoding="utf-8") as f:
        for model in client.models.list():
            if "gemini" in model.name.lower():
                f.write(f"{model.name}\n")

if __name__ == "__main__":
    main()
