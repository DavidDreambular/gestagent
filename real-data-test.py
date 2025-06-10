#!/usr/bin/env python3
"""
📄 TESTING CON DATOS REALES PARA GESTAGENT
===========================================

Script para crear documentos de prueba reales y testear el flujo completo
de procesamiento con OCR y extracción de datos.
"""

import requests
import json
import time
import sys
import os
from datetime import datetime
from typing import Dict, List, Any
import base64
from pathlib import Path

class RealDataTester:
    def __init__(self, base_url: str = "http://localhost:3001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_documents = []
        
    def log(self, message: str, level: str = "INFO"):
        """Log with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def create_test_invoice_pdf(self, filename: str = "test_invoice.pdf"):
        """Create a simple test PDF for testing"""
        self.log("📄 Creating test invoice PDF...")
        
        # Create a test directory for documents
        test_dir = Path("/tmp/gestagent_test_docs")
        test_dir.mkdir(exist_ok=True)
        
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import letter
            
            test_file = test_dir / filename
            
            # Create PDF with reportlab
            c = canvas.Canvas(str(test_file), pagesize=letter)
            
            # Add content to PDF
            c.setFont("Helvetica-Bold", 16)
            c.drawString(100, 750, "FACTURA / INVOICE")
            
            c.setFont("Helvetica", 12)
            c.drawString(100, 720, "Fecha: 10/06/2025")
            c.drawString(100, 700, "Número: INV-2025-001")
            
            c.drawString(100, 670, "EMISOR:")
            c.drawString(120, 650, "Tecnología Avanzada S.A.")
            c.drawString(120, 630, "NIF: A12345678")
            c.drawString(120, 610, "Dirección: Calle Mayor 123, 28001 Madrid")
            c.drawString(120, 590, "Teléfono: +34 91 123 45 67")
            
            c.drawString(100, 560, "RECEPTOR:")
            c.drawString(120, 540, "Retail Solutions S.L.")
            c.drawString(120, 520, "NIF: E55667788")
            c.drawString(120, 500, "Dirección: Avenida Constitución 456, 41001 Sevilla")
            
            c.drawString(100, 470, "CONCEPTOS:")
            c.drawString(120, 450, "- Desarrollo de software personalizado    €2,500.00")
            c.drawString(120, 430, "- Mantenimiento mensual                   €300.00")
            c.drawString(120, 410, "- IVA (21%)                              €588.00")
            c.drawString(120, 390, "                                         ---------")
            c.setFont("Helvetica-Bold", 12)
            c.drawString(120, 370, "TOTAL:                                   €3,388.00")
            
            c.setFont("Helvetica", 12)
            c.drawString(100, 340, "Forma de pago: Transferencia bancaria")
            c.drawString(100, 320, "Vencimiento: 09/07/2025")
            c.drawString(100, 300, "Observaciones: Pago a 30 días")
            
            c.save()
            
            self.log(f"✅ Test PDF created: {test_file}")
            return str(test_file)
            
        except ImportError:
            self.log("⚠️ reportlab not installed, creating minimal PDF manually")
            # Create a minimal valid PDF manually
            test_file = test_dir / filename
            
            # Basic PDF structure with text content
            pdf_content = """%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 800
>>
stream
BT
/F1 12 Tf
50 750 Td
(FACTURA / INVOICE) Tj
0 -20 Td
(Fecha: 10/06/2025) Tj
0 -20 Td
(Numero: INV-2025-001) Tj
0 -30 Td
(EMISOR:) Tj
0 -20 Td
(Tecnologia Avanzada S.A.) Tj
0 -20 Td
(NIF: A12345678) Tj
0 -20 Td
(Direccion: Calle Mayor 123, 28001 Madrid) Tj
0 -30 Td
(RECEPTOR:) Tj
0 -20 Td
(Retail Solutions S.L.) Tj
0 -20 Td
(NIF: E55667788) Tj
0 -20 Td
(Direccion: Avenida Constitucion 456, 41001 Sevilla) Tj
0 -30 Td
(CONCEPTOS:) Tj
0 -20 Td
(- Desarrollo de software personalizado    €2,500.00) Tj
0 -20 Td
(- Mantenimiento mensual                   €300.00) Tj
0 -20 Td
(- IVA \\(21%\\)                              €588.00) Tj
0 -20 Td
(TOTAL:                                   €3,388.00) Tj
0 -30 Td
(Forma de pago: Transferencia bancaria) Tj
0 -20 Td
(Vencimiento: 09/07/2025) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000001126 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
1199
%%EOF"""
            
            with open(test_file, 'w', encoding='utf-8') as f:
                f.write(pdf_content)
            
            self.log(f"✅ Test PDF created manually: {test_file}")
            return str(test_file)

    def upload_document(self, file_path: str):
        """Upload document to GestAgent for processing"""
        self.log(f"📤 Uploading document: {file_path}")
        
        try:
            # Determine file type and read mode
            if file_path.endswith('.pdf'):
                mode = 'rb'
                mime_type = 'application/pdf'
            else:
                mode = 'r'
                mime_type = 'text/plain'
            
            # Read file content
            with open(file_path, mode) as f:
                file_content = f.read()
            
            # Prepare FormData for upload
            files = {
                'file': (
                    os.path.basename(file_path),
                    file_content,
                    mime_type
                )
            }
            
            data = {
                'documentType': 'factura'
            }
            
            # Upload using FormData
            response = requests.post(
                f"{self.base_url}/api/documents/upload", 
                files=files,
                data=data
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    document_id = result.get("jobId")
                    self.log(f"✅ Document uploaded successfully: {document_id}")
                    return document_id
                else:
                    self.log(f"❌ Upload failed: {result.get('error', 'Unknown error')}")
                    return None
            else:
                self.log(f"❌ Upload request failed: HTTP {response.status_code}")
                try:
                    error_detail = response.json()
                    self.log(f"Error details: {error_detail}")
                except:
                    self.log(f"Error response: {response.text[:200]}")
                return None
                
        except Exception as e:
            self.log(f"❌ Exception during upload: {str(e)}")
            return None

    def test_documents_list(self, document_id: str):
        """Test getting documents list to verify our uploaded document"""
        self.log(f"📄 Testing documents list to verify: {document_id}")
        
        response = requests.get(f"{self.base_url}/api/documents/list")
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                documents = result.get("documents", [])
                
                self.log(f"✅ Documents list retrieved: {len(documents)} documents")
                
                # Find our uploaded document
                our_document = None
                for doc in documents:
                    if doc.get('job_id') == document_id:
                        our_document = doc
                        break
                
                if our_document:
                    self.log("✅ Our uploaded document found in the list")
                    self.log(f"📋 Status: {our_document.get('status', 'N/A')}")
                    self.log(f"📊 Document Type: {our_document.get('document_type', 'N/A')}")
                    
                    # Check if data was extracted
                    processed_json = our_document.get('processed_json', {})
                    if processed_json:
                        self.log("✅ Mistral AI extraction completed and visible")
                        
                        # Handle both single invoice and array formats
                        if isinstance(processed_json, list) and len(processed_json) > 0:
                            invoice_data = processed_json[0]
                        else:
                            invoice_data = processed_json
                        
                        supplier = invoice_data.get('supplier', {})
                        customer = invoice_data.get('customer', {})
                        totals = invoice_data.get('totals', {})
                        
                        self.log(f"🏢 Supplier: {supplier.get('name', 'N/A')}")
                        self.log(f"🧾 Invoice Number: {invoice_data.get('invoice_number', 'N/A')}")
                        self.log(f"📅 Date: {invoice_data.get('issue_date', 'N/A')}")
                        self.log(f"💰 Total: {totals.get('total', 'N/A')}")
                        self.log(f"💸 Tax: {totals.get('total_tax_amount', 'N/A')}")
                        
                        return our_document
                    else:
                        self.log("⚠️ Document found but no processed data available")
                        return our_document
                else:
                    self.log("❌ Our uploaded document not found in the list")
                    return None
            else:
                self.log(f"❌ Documents list failed: {result.get('error', 'Unknown error')}")
                return None
        else:
            self.log(f"❌ Documents list request failed: HTTP {response.status_code}")
            return None

    def test_sage_export_all(self):
        """Test SAGE export functionality for all documents"""
        self.log(f"📊 Testing SAGE export for all documents")
        
        response = requests.get(f"{self.base_url}/api/documents/export/sage")
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                self.log("✅ SAGE export successful")
                self.log(f"📊 Export format: {result.get('format', 'N/A')}")
                self.log(f"📄 Total documents: {result.get('total_documents', 'N/A')}")
                self.log(f"📅 Generated at: {result.get('generated_at', 'N/A')}")
                
                return result
            else:
                self.log(f"❌ SAGE export failed: {result.get('error', 'Unknown error')}")
                return None
        else:
            self.log(f"❌ SAGE export request failed: HTTP {response.status_code}")
            return None

    def test_sage_export(self, document_id: str):
        """Test SAGE export functionality"""
        self.log(f"📊 Testing SAGE export for document: {document_id}")
        
        export_data = {
            "document_ids": [document_id],
            "export_format": "sage",
            "export_type": "accounting_entries",
            "date_range": {
                "start": "2025-06-01",
                "end": "2025-06-30"
            }
        }
        
        response = requests.post(f"{self.base_url}/api/exports/sage", json=export_data)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                export_file = result.get("data", {}).get("export_file")
                entries_count = result.get("data", {}).get("entries_count", 0)
                
                self.log(f"✅ SAGE export successful")
                self.log(f"📁 Export file: {export_file}")
                self.log(f"📝 Entries exported: {entries_count}")
                
                return export_file
            else:
                self.log(f"❌ SAGE export failed: {result.get('error', 'Unknown error')}")
                return None
        else:
            self.log(f"❌ SAGE export request failed: HTTP {response.status_code}")
            return None

    def test_full_real_data_workflow(self):
        """Test complete real data workflow"""
        self.log("🚀 Starting Real Data Testing Workflow")
        self.log("=" * 60)
        
        test_results = {
            "document_creation": False,
            "document_upload": False,
            "document_verification": False,
            "ai_extraction": False,
            "sage_export": False
        }
        
        try:
            # Step 1: Create test document
            self.log("📋 Step 1: Creating test invoice document...")
            test_file = self.create_test_invoice_pdf("test_invoice_real.pdf")
            if test_file:
                test_results["document_creation"] = True
            else:
                self.log("❌ Failed to create test document")
                return test_results
            
            # Step 2: Upload document (includes Mistral AI processing)
            self.log("📋 Step 2: Uploading document...")
            document_id = self.upload_document(test_file)
            if document_id:
                test_results["document_upload"] = True
                self.test_documents.append(document_id)
            else:
                self.log("❌ Failed to upload document")
                return test_results
            
            # Step 3: Verify document in list and check AI extraction
            self.log("📋 Step 3: Verifying document and AI extraction...")
            # Wait a moment for the document to be properly indexed
            time.sleep(2)
            document_details = self.test_documents_list(document_id)
            if document_details:
                test_results["document_verification"] = True
                # Check if AI extraction worked
                if document_details.get('processed_json'):
                    test_results["ai_extraction"] = True
                    self.log("✅ Mistral AI extraction verified in document list")
                else:
                    self.log("⚠️ Document uploaded but no AI extraction data found")
            
            # Step 4: SAGE export for all documents
            self.log("📋 Step 4: Testing SAGE export...")
            export_result = self.test_sage_export_all()
            if export_result:
                test_results["sage_export"] = True
            
        except Exception as e:
            self.log(f"❌ Unexpected error during testing: {str(e)}")
        
        return test_results

    def generate_test_report(self, test_results: Dict[str, bool]):
        """Generate detailed test report"""
        self.log("=" * 60)
        self.log("📊 REAL DATA TEST RESULTS")
        self.log("=" * 60)
        
        passed = sum(test_results.values())
        total = len(test_results)
        success_rate = (passed / total) * 100
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            formatted_name = test_name.replace('_', ' ').title()
            self.log(f"{formatted_name:25} : {status}")
        
        self.log("-" * 60)
        self.log(f"REAL DATA TEST SCORE: {passed}/{total} ({success_rate:.1f}%)")
        
        if success_rate >= 85:
            self.log("🏆 EXCELLENT - Real data processing is working perfectly!")
        elif success_rate >= 70:
            self.log("👍 GOOD - Real data processing is working well")
        elif success_rate >= 50:
            self.log("⚠️ WARNING - Real data processing has some issues")
        else:
            self.log("🚨 CRITICAL - Real data processing needs attention")
        
        # Save detailed report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"real_data_test_report_{timestamp}.json"
        
        detailed_report = {
            "timestamp": datetime.now().isoformat(),
            "test_results": test_results,
            "success_rate": success_rate,
            "documents_tested": self.test_documents,
            "summary": {
                "total_tests": total,
                "passed_tests": passed,
                "failed_tests": total - passed,
                "status": "EXCELLENT" if success_rate >= 85 else "GOOD" if success_rate >= 70 else "WARNING" if success_rate >= 50 else "CRITICAL"
            }
        }
        
        with open(report_file, 'w') as f:
            json.dump(detailed_report, f, indent=2)
        
        self.log(f"📄 Detailed report saved: {report_file}")
        
        return test_results

def main():
    """Main test execution"""
    print("📄 Real Data Testing for GestAgent")
    print("=" * 40)
    
    tester = RealDataTester()
    results = tester.test_full_real_data_workflow()
    final_results = tester.generate_test_report(results)
    
    # Exit with appropriate code
    success_rate = sum(final_results.values()) / len(final_results) * 100
    sys.exit(0 if success_rate >= 70 else 1)

if __name__ == "__main__":
    main()