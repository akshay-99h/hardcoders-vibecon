"""
PDF Generation Service for RakshaAI Documents
Enhanced professional formatting with official government-style appearance
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from io import BytesIO
from datetime import datetime
import uuid


class PDFGeneratorService:
    """Service to generate professional PDF documents with official appearance"""
    
    @staticmethod
    def _add_header_footer(canvas_obj, doc):
        """Add official-looking header and footer to each page"""
        canvas_obj.saveState()
        
        width, height = A4
        
        # Header - Official document marker
        canvas_obj.setStrokeColor(colors.HexColor('#003366'))
        canvas_obj.setLineWidth(2)
        canvas_obj.line(0.75*inch, height - 0.5*inch, width - 0.75*inch, height - 0.5*inch)
        
        # Reference number (top right corner)
        canvas_obj.setFont('Times-Roman', 9)
        canvas_obj.setFillColor(colors.HexColor('#666666'))
        ref_num = f"Ref: RAI/{datetime.now().strftime('%Y%m')}/{uuid.uuid4().hex[:8].upper()}"
        canvas_obj.drawRightString(width - 0.75*inch, height - 0.35*inch, ref_num)
        
        # Footer - Page number
        canvas_obj.setFont('Times-Roman', 9)
        canvas_obj.setFillColor(colors.HexColor('#666666'))
        page_text = f"Page {doc.page}"
        canvas_obj.drawCentredString(width/2, 0.5*inch, page_text)
        
        # Footer line
        canvas_obj.setStrokeColor(colors.HexColor('#cccccc'))
        canvas_obj.setLineWidth(0.5)
        canvas_obj.line(0.75*inch, 0.65*inch, width - 0.75*inch, 0.65*inch)
        
        canvas_obj.restoreState()
    
    @staticmethod
    def generate_document_pdf(
        document_type: str,
        document_content: str,
        user_name: str = "Citizen"
    ) -> BytesIO:
        """
        Generate a professional PDF from document content with official government-style formatting
        
        Args:
            document_type: Type of document (RTI, Complaint, etc.)
            document_content: Full text content of the document
            user_name: Name of the user generating the document
            
        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = BytesIO()
        
        # Create PDF with A4 page size and proper margins
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1*inch,
            leftMargin=1*inch,
            topMargin=1*inch,
            bottomMargin=1*inch,
        )
        
        # Add header/footer to each page
        doc.build = lambda story: SimpleDocTemplate.build(
            doc, story, 
            onFirstPage=PDFGeneratorService._add_header_footer,
            onLaterPages=PDFGeneratorService._add_header_footer
        )
        
        # Container for PDF elements
        elements = []
        
        # Define professional styles using Times-Roman for more formal appearance
        styles = getSampleStyleSheet()
        
        # Document title style
        title_style = ParagraphStyle(
            'DocumentTitle',
            parent=styles['Heading1'],
            fontSize=14,
            textColor=colors.HexColor('#000000'),
            spaceAfter=0.3*inch,
            alignment=TA_CENTER,
            fontName='Times-Bold',
            leading=18
        )
        
        # Address style (To, From) - Official format
        address_style = ParagraphStyle(
            'Address',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#000000'),
            spaceAfter=6,
            alignment=TA_LEFT,
            fontName='Times-Roman',
            leading=15
        )
        
        # Subject line style - Bold and underlined for emphasis
        subject_style = ParagraphStyle(
            'Subject',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#000000'),
            spaceAfter=14,
            spaceBefore=14,
            alignment=TA_LEFT,
            fontName='Times-Bold',
            leading=15
        )
        
        # Body paragraph style - Justified for formal appearance
        body_style = ParagraphStyle(
            'BodyText',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#000000'),
            spaceAfter=12,
            alignment=TA_JUSTIFY,
            fontName='Times-Roman',
            leading=18,
            firstLineIndent=0
        )
        
        # Salutation style
        salutation_style = ParagraphStyle(
            'Salutation',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#000000'),
            spaceAfter=14,
            alignment=TA_LEFT,
            fontName='Times-Roman',
            leading=15
        )
        
        # Signature block style
        signature_style = ParagraphStyle(
            'Signature',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#000000'),
            spaceAfter=7,
            alignment=TA_LEFT,
            fontName='Times-Roman',
            leading=15
        )
        
        # Date style (top right) - Official format
        date_style = ParagraphStyle(
            'DateStyle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#000000'),
            alignment=TA_RIGHT,
            fontName='Times-Roman'
        )
        
        # Add date at top right
        date_text = f"Date: {datetime.now().strftime('%d %B %Y')}"
        elements.append(Paragraph(date_text, date_style))
        elements.append(Spacer(1, 0.3*inch))
        
        # Process document content
        lines = document_content.split('\n')
        
        in_address_block = False
        in_subject = False
        in_body = False
        in_signature = False
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            if not line:
                # Empty line - add small spacer
                elements.append(Spacer(1, 0.1*inch))
                continue
            
            # Escape special characters
            line = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            
            # Detect different sections
            line_lower = line.lower()
            
            # To/From address blocks
            if line_lower.startswith('to,') or line_lower.startswith('to:'):
                in_address_block = True
                elements.append(Paragraph(line, address_style))
            
            # Subject line
            elif line_lower.startswith('subject:'):
                in_subject = True
                in_address_block = False
                elements.append(Paragraph(f"<b>{line}</b>", subject_style))
            
            # Salutations
            elif any(sal in line_lower for sal in ['respected sir', 'dear sir', 'sir/madam', 'dear madam']):
                in_body = True
                in_subject = False
                elements.append(Paragraph(line, salutation_style))
            
            # Closing (Yours faithfully, Thanking you, etc.)
            elif any(closing in line_lower for closing in ['yours faithfully', 'yours sincerely', 'thanking you', 'regards']):
                in_body = False
                in_signature = True
                elements.append(Spacer(1, 0.15*inch))
                elements.append(Paragraph(line, signature_style))
            
            # Enclosures
            elif line_lower.startswith('enclosure'):
                in_signature = True
                elements.append(Spacer(1, 0.15*inch))
                elements.append(Paragraph(f"<b>{line}</b>", signature_style))
            
            # Address block lines
            elif in_address_block:
                elements.append(Paragraph(line, address_style))
            
            # Signature block (name, address, phone)
            elif in_signature:
                elements.append(Paragraph(line, signature_style))
            
            # Body paragraphs
            else:
                # Check if it's a heading/subheading
                if (len(line) < 60 and line.isupper()) or line.endswith(':'):
                    heading_style = ParagraphStyle(
                        'Heading',
                        parent=styles['Heading3'],
                        fontSize=11,
                        textColor=colors.HexColor('#000000'),
                        spaceAfter=8,
                        spaceBefore=12,
                        fontName='Helvetica-Bold',
                        leading=14
                    )
                    elements.append(Paragraph(line, heading_style))
                else:
                    # Regular body text
                    elements.append(Paragraph(line, body_style))
        
        # Add professional footer section
        elements.append(Spacer(1, 0.4*inch))
        
        # Separator line
        elements.append(Table(
            [['']], 
            colWidths=[6.5*inch],
            style=TableStyle([
                ('LINEABOVE', (0, 0), (-1, 0), 0.5, colors.HexColor('#cccccc')),
            ])
        ))
        
        elements.append(Spacer(1, 0.15*inch))
        
        # Instructions box
        instruction_style = ParagraphStyle(
            'Instruction',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#444444'),
            alignment=TA_LEFT,
            leftIndent=10,
            spaceAfter=4,
            fontName='Helvetica'
        )
        
        instructions = [
            "<b>📋 Filing Instructions:</b>",
            "• Print this document on standard A4 white paper",
            "• Sign where your name appears",
            "• Attach all supporting documents mentioned in 'Enclosures'",
            "• Keep one photocopy for your personal records",
            "• Send by registered post or speed post to the address mentioned",
            "• Preserve the postal receipt as proof of submission"
        ]
        
        for instruction in instructions:
            elements.append(Paragraph(instruction, instruction_style))
        
        # Disclaimer
        elements.append(Spacer(1, 0.2*inch))
        
        disclaimer_style = ParagraphStyle(
            'Disclaimer',
            parent=styles['Normal'],
            fontSize=7,
            textColor=colors.HexColor('#888888'),
            alignment=TA_CENTER,
            fontName='Helvetica-Oblique'
        )
        
        disclaimer = Paragraph(
            "<b>Disclaimer:</b> This is an AI-generated document draft by RakshaAI. "
            "Please verify all details, dates, and information before submission to ensure accuracy. "
            "For complex legal matters, consult a licensed advocate. Free legal aid: NALSA helpline 15100 | nalsa.gov.in",
            disclaimer_style
        )
        elements.append(disclaimer)
        
        # Build PDF
        doc.build(elements)
        
        # Reset buffer position
        buffer.seek(0)
        return buffer
