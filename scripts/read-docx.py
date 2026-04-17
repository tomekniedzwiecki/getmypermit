from docx import Document as DocxDocument
from pathlib import Path
import sys

path = Path(__file__).parent.parent / "dane_od_pawla" / "CRM.docx"
doc = DocxDocument(str(path))

for i, p in enumerate(doc.paragraphs, 1):
    if p.text.strip():
        style = p.style.name if p.style else ""
        print(f"[{i:02d}] ({style}) {p.text}")
