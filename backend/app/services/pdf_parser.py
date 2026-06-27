import io
import pdfplumber
import pytesseract
from PIL import Image

async def parse_pdf_content(file_content: bytes) -> str:
    extracted_text = ""
    try:
        # First attempt with pdfplumber for structured text
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
        
        # If pdfplumber didn't extract any text, fallback to OCR
        if not extracted_text.strip():
            import fitz  # PyMuPDF fallback for OCR
            doc = fitz.open("pdf", file_content)
            for page in doc:
                pix = page.get_pixmap(dpi=150)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                extracted_text += pytesseract.image_to_string(img) + "\n"
                
    except Exception as e:
        print(f"Error parsing PDF: {str(e)}")
        raise e
        
    return extracted_text.strip()
