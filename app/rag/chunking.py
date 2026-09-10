"""
Document Extraction and Semantic Chunking Module
Extracts text from PDF, DOCX, TXT, and CSV documents with structural metadata
and performs semantic boundary chunking with overlap.
"""

import os
import csv
import io
import re
import uuid
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("rag_chunking")

SUPPORTED_MIME_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/csv": "csv",
    "application/vnd.ms-excel": "csv"
}

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".csv"}


class ExtractionError(Exception):
    """Raised when text extraction fails from an unsupported or corrupted file."""
    pass


def validate_file_type(filename: str, mime_type: str) -> str:
    """Validates that the file type is among supported extensions and mime types."""
    ext = os.path.splitext(filename.lower())[1]
    if ext not in SUPPORTED_EXTENSIONS:
        raise ExtractionError(f"Unsupported file format '{ext}'. Allowed formats are: PDF, DOCX, TXT, CSV.")
    return ext


def extract_text_from_pdf(file_path: str) -> List[Dict[str, Any]]:
    """Extracts text from PDF preserving 1-indexed page numbers."""
    from pypdf import PdfReader
    try:
        reader = PdfReader(file_path)
        pages_content = []
        for idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                pages_content.append({
                    "text": text.strip(),
                    "page": idx + 1,
                    "section": None
                })
        if not pages_content:
            raise ExtractionError("PDF contains no extractable text.")
        return pages_content
    except Exception as err:
        logger.error(f"PDF extraction failed for {file_path}: {err}")
        raise ExtractionError(f"Failed to extract text from PDF: {str(err)}") from err


def extract_text_from_docx(file_path: str) -> List[Dict[str, Any]]:
    """Extracts text from DOCX preserving headings and section structure."""
    import docx
    try:
        doc = docx.Document(file_path)
        sections_content = []
        current_heading = "Introduction"
        current_paragraphs = []

        for p in doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue

            # Check if paragraph has a heading style
            if p.style.name.startswith("Heading"):
                if current_paragraphs:
                    sections_content.append({
                        "text": "\n".join(current_paragraphs),
                        "page": None,
                        "section": current_heading
                    })
                    current_paragraphs = []
                current_heading = text
            else:
                current_paragraphs.append(text)

        if current_paragraphs:
            sections_content.append({
                "text": "\n".join(current_paragraphs),
                "page": None,
                "section": current_heading
            })

        if not sections_content:
            raise ExtractionError("DOCX document contains no text content.")
        return sections_content
    except Exception as err:
        logger.error(f"DOCX extraction failed for {file_path}: {err}")
        raise ExtractionError(f"Failed to extract text from DOCX: {str(err)}") from err


def extract_text_from_txt(file_path: str) -> List[Dict[str, Any]]:
    """Extracts text from TXT preserving section headers where detected."""
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            raw_text = f.read()

        if not raw_text.strip():
            raise ExtractionError("TXT file is empty.")

        lines = raw_text.splitlines()
        sections_content = []
        current_section = "General"
        current_lines = []

        header_pattern = re.compile(
            r"^(?:#{1,4}\s+|[0-9]+\.[0-9]*\s+|SECTION\s+[0-9A-Z]+:?\s*)(.+)$",
            re.IGNORECASE
        )

        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue

            match = header_pattern.match(stripped)
            if match and len(stripped) < 120:
                if current_lines:
                    sections_content.append({
                        "text": "\n".join(current_lines),
                        "page": None,
                        "section": current_section
                    })
                    current_lines = []
                current_section = match.group(1).strip() if match.group(1).strip() else stripped
            else:
                current_lines.append(stripped)

        if current_lines:
            sections_content.append({
                "text": "\n".join(current_lines),
                "page": None,
                "section": current_section
            })

        if not sections_content:
            sections_content.append({
                "text": raw_text.strip(),
                "page": None,
                "section": "General"
            })

        return sections_content
    except Exception as err:
        logger.error(f"TXT extraction failed for {file_path}: {err}")
        raise ExtractionError(f"Failed to read TXT file: {str(err)}") from err


def extract_text_from_csv(file_path: str) -> List[Dict[str, Any]]:
    """Converts CSV rows into searchable textual records while preserving column metadata."""
    try:
        records = []
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            if not reader.fieldnames:
                raise ExtractionError("CSV contains no columns or header row.")

            headers = [h.strip() for h in reader.fieldnames if h]
            row_num = 1
            for row in reader:
                entries = [f"{k}: {v.strip()}" for k, v in row.items() if k and v and v.strip()]
                if entries:
                    record_text = f"Record {row_num} [{', '.join(headers)}]:\n" + "; ".join(entries)
                    records.append({
                        "text": record_text,
                        "page": row_num,
                        "section": f"Row {row_num}"
                    })
                    row_num += 1

        if not records:
            raise ExtractionError("CSV contains no valid data rows.")
        return records
    except Exception as err:
        logger.error(f"CSV extraction failed for {file_path}: {err}")
        raise ExtractionError(f"Failed to extract text from CSV: {str(err)}") from err


def extract_document_content(file_path: str, filename: str, mime_type: str = "") -> List[Dict[str, Any]]:
    """Main extraction router handling PDF, DOCX, TXT, and CSV."""
    if not os.path.exists(file_path):
        raise ExtractionError(f"File not found on disk: {file_path}")

    ext = validate_file_type(filename, mime_type)

    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext == ".docx":
        return extract_text_from_docx(file_path)
    elif ext == ".txt":
        return extract_text_from_txt(file_path)
    elif ext == ".csv":
        return extract_text_from_csv(file_path)
    else:
        raise ExtractionError(f"Unsupported file type: {ext}")


def chunk_document(
    sections: List[Dict[str, Any]],
    document_id: str,
    organization_id: str,
    project_id: Optional[str] = None,
    category: str = "Other",
    filename: str = "",
    target_chunk_size: int = 500,
    chunk_overlap: int = 100
) -> List[Dict[str, Any]]:
    """
    Chunks extracted sections into semantic chunks respecting paragraphs and headings.
    Ensures overlapping windowing to preserve context across boundaries.
    """
    chunks = []
    chunk_idx = 0

    for section_block in sections:
        raw_text = section_block["text"].strip()
        page = section_block.get("page")
        section = section_block.get("section")

        if len(raw_text) <= target_chunk_size:
            chunk_id = f"chk_{document_id[:8]}_{chunk_idx:04d}"
            chunks.append({
                "chunk_id": chunk_id,
                "document_id": document_id,
                "chunk_index": chunk_idx,
                "text": raw_text,
                "page": page,
                "section": section,
                "organization_id": organization_id,
                "project_id": project_id,
                "category": category,
                "filename": filename
            })
            chunk_idx += 1
            continue

        # Split text on paragraph or sentence boundaries
        paragraphs = [p.strip() for p in raw_text.split("\n\n") if p.strip()]
        current_chunk = ""

        for para in paragraphs:
            if not current_chunk:
                current_chunk = para
            elif len(current_chunk) + len(para) + 2 <= target_chunk_size:
                current_chunk += "\n\n" + para
            else:
                chunk_id = f"chk_{document_id[:8]}_{chunk_idx:04d}"
                chunks.append({
                    "chunk_id": chunk_id,
                    "document_id": document_id,
                    "chunk_index": chunk_idx,
                    "text": current_chunk.strip(),
                    "page": page,
                    "section": section,
                    "organization_id": organization_id,
                    "project_id": project_id,
                    "category": category,
                    "filename": filename
                })
                chunk_idx += 1

                # Retain overlap from end of current chunk
                overlap_text = current_chunk[-chunk_overlap:] if len(current_chunk) > chunk_overlap else current_chunk
                current_chunk = overlap_text + "\n" + para

        if current_chunk.strip():
            chunk_id = f"chk_{document_id[:8]}_{chunk_idx:04d}"
            chunks.append({
                "chunk_id": chunk_id,
                "document_id": document_id,
                "chunk_index": chunk_idx,
                "text": current_chunk.strip(),
                "page": page,
                "section": section,
                "organization_id": organization_id,
                "project_id": project_id,
                "category": category,
                "filename": filename
            })
            chunk_idx += 1

    return chunks
