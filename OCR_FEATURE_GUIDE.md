# RakshaAI OCR Feature - Document Analysis Guide

## 📄 What Documents Can Be Analyzed?

RakshaAI can analyze any legal, government, or official document with text, including:

### Legal Documents
- Court summons and legal notices
- Legal demand letters
- Property disputes
- Divorce/custody papers
- Employment termination notices

### Government Notices
- Income tax assessment/notices
- GST notices
- Property tax bills
- Municipal notices
- Land records

### Certificates & Applications
- Birth/Death certificates
- Caste/Income certificates
- Aadhaar/PAN applications
- Passport applications
- Driving license documents

### Other Documents
- Traffic challans/fines
- Consumer complaints
- Insurance claims
- Bank notices
- Utility bills

### Language Support
- ✅ English
- ✅ Hindi (हिन्दी)
- Regional languages with English/Hindi text

---

## 💾 Document Storage Options

### Current Implementation (Privacy-First)

**Default Behavior: NO STORAGE**
- Documents are **NOT stored** on the server
- Images are processed in-memory only
- After analysis, the document is discarded
- Only the AI's analysis text can be saved in chat history

**Why?**
- Maximum privacy protection
- No risk of data breach
- Compliant with privacy regulations
- Users maintain full control of sensitive documents

### Optional Storage (Metadata Only)

If `store_document=True` is passed to the API:
- **Stored:** Filename, file type, size, analysis summary, timestamp
- **NOT Stored:** The actual document image/PDF
- **Purpose:** Keep a history of analyzed documents for reference
- **Database:** MongoDB `documents` collection

**What's Saved:**
```json
{
  "document_id": "doc_abc123",
  "user_id": "user_xyz",
  "filename": "legal_notice.pdf",
  "file_type": "application/pdf",
  "file_size": 245678,
  "analysis_summary": "This is a legal notice regarding...",
  "analyzed_at": "2026-02-21T10:30:00Z"
}
```

---

## 🔒 Security & Privacy

### Current Safeguards
1. **No Full Document Storage** - Images are never saved
2. **User Authentication** - Only logged-in users can upload
3. **File Size Limits** - Max 10MB to prevent abuse
4. **File Type Validation** - Only allowed formats (JPEG, PNG, WEBP, PDF)
5. **Secure Transmission** - All data encrypted via HTTPS
6. **Session-based Access** - Documents tied to user accounts

### What Happens to Your Data?
1. **Upload** → Document sent to backend
2. **Processing** → Converted to image (if PDF), sent to OpenAI Vision API
3. **Analysis** → AI extracts text and provides guidance
4. **Response** → Analysis sent back to user
5. **Cleanup** → Document data discarded (unless storage explicitly requested)

---

## 📊 API Endpoints

### POST /api/documents/analyze
Analyze a legal document

**Parameters:**
- `file` (required): Document file (JPEG, PNG, WEBP, PDF)
- `query` (optional): Specific question about the document
- `store_document` (optional, default=false): Save metadata for history

**Response:**
```json
{
  "success": true,
  "analysis": "Detailed AI analysis...",
  "model_used": "openai/gpt-5.1",
  "document_id": "doc_123" (if stored),
  "stored": false
}
```

### GET /api/documents/history
Get user's document analysis history (metadata only)

**Response:**
```json
{
  "success": true,
  "documents": [
    {
      "document_id": "doc_123",
      "filename": "notice.pdf",
      "analysis_summary": "...",
      "analyzed_at": "2026-02-21T10:30:00Z"
    }
  ]
}
```

---

## 🚀 How to Use

### Via Chat Interface
1. Click the 📎 paperclip icon
2. Select your document (image or PDF)
3. Optionally, type a question like "What should I do?"
4. Click send
5. Wait for AI analysis (usually 5-15 seconds)

### Supported File Types
- ✅ JPEG (.jpg, .jpeg)
- ✅ PNG (.png)
- ✅ WEBP (.webp)
- ✅ PDF (.pdf) - First page only

### File Size Limit
- Maximum: 10 MB
- Recommended: Under 5 MB for faster processing

---

## 🛠️ Technical Details

### PDF Handling
- PDFs are converted to images using `pdf2image` + `poppler`
- Only the first page is analyzed
- Multi-page PDFs: Upload each page separately if needed

### OCR Technology
- **Service:** OpenAI Vision API (GPT-5.1)
- **Method:** Direct image understanding (no separate OCR step)
- **Accuracy:** High for printed text, moderate for handwritten

### Processing Time
- Simple documents: 5-10 seconds
- Complex documents: 10-20 seconds
- Depends on image quality and text density

---

## ⚡ Quick Troubleshooting

**Error: "Failed to analyze document"**
- Check file format (JPEG, PNG, WEBP, PDF only)
- Ensure file size is under 10MB
- Try a clearer image
- Check internet connection

**Error: "Could not extract image from PDF"**
- PDF may be corrupted
- PDF may be password-protected (not supported)
- Try converting PDF to image first

**Poor OCR results**
- Use higher resolution images (300 DPI recommended)
- Ensure good lighting and contrast
- Avoid blurry or distorted images
- Rotate image to correct orientation before upload

---

## 📝 Best Practices

1. **Image Quality:** Use clear, high-resolution scans or photos
2. **Orientation:** Ensure document is right-side up
3. **Cropping:** Crop out unnecessary borders
4. **File Format:** Use PNG for scanned documents, JPEG for photos
5. **Privacy:** Don't upload documents if you're uncomfortable with cloud processing
6. **Backup:** Keep original documents safe - analysis is not a replacement for legal advice

---

## 🔮 Future Enhancements

Potential features to consider:
- Multi-page PDF support
- Batch document upload
- Document comparison
- Automatic categorization
- Export analysis as PDF
- Email/SMS notifications for deadline reminders
- Full document storage (opt-in with encryption)
