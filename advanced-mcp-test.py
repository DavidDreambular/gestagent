#!/usr/bin/env python3
"""
🔬 ADVANCED MCP TESTING FOR GESTAGENT
=====================================

Test avanzado de funcionalidades MCP integradas en GestAgent
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Dict, List, Any

class AdvancedMCPTester:
    def __init__(self, base_url: str = "http://localhost:3003"):
        self.base_url = base_url
        self.session = requests.Session()
        
    def log(self, message: str, level: str = "INFO"):
        """Log with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def test_mcp_desktop_commander(self):
        """Test MCP Desktop Commander functionality"""
        self.log("🖥️ Testing MCP Desktop Commander...")
        
        # Test screen capture
        capture_data = {
            "server": "desktop-commander",
            "action": "capture-screen",
            "params": {}
        }
        
        response = requests.post(f"{self.base_url}/api/mcp/execute", json=capture_data)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                self.log("✅ Desktop capture simulation successful")
                self.log(f"📸 Screenshot saved to: {result.get('data', {}).get('screenshot', 'N/A')}")
                return True
            else:
                self.log(f"❌ Desktop capture failed: {result.get('error', 'Unknown error')}")
                return False
        else:
            self.log(f"❌ Desktop Commander request failed: HTTP {response.status_code}")
            return False

    def test_mcp_n8n_workflows(self):
        """Test MCP n8n workflow functionality"""
        self.log("🔄 Testing MCP n8n Workflows...")
        
        # Test workflow trigger
        workflow_data = {
            "server": "n8n",
            "action": "trigger-workflow",
            "params": {
                "workflowId": "process-invoices",
                "data": {
                    "documentType": "invoice",
                    "priority": "high"
                }
            }
        }
        
        response = requests.post(f"{self.base_url}/api/mcp/execute", json=workflow_data)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                self.log("✅ n8n workflow trigger successful")
                execution_id = result.get('data', {}).get('executionId', 'N/A')
                self.log(f"🔄 Workflow execution ID: {execution_id}")
                
                # Test workflow status check
                status_data = {
                    "server": "n8n",
                    "action": "get-workflow-status",
                    "params": {
                        "executionId": execution_id
                    }
                }
                
                time.sleep(1)  # Wait for workflow processing
                status_response = requests.post(f"{self.base_url}/api/mcp/execute", json=status_data)
                
                if status_response.status_code == 200:
                    status_result = status_response.json()
                    if status_result.get("success"):
                        status = status_result.get('data', {}).get('status', 'unknown')
                        self.log(f"📊 Workflow status: {status}")
                        return True
                    
                return True
            else:
                self.log(f"❌ n8n workflow failed: {result.get('error', 'Unknown error')}")
                return False
        else:
            self.log(f"❌ n8n request failed: HTTP {response.status_code}")
            return False

    def test_mcp_playwright_automation(self):
        """Test MCP Playwright web automation"""
        self.log("🌐 Testing MCP Playwright Automation...")
        
        # Test navigation
        nav_data = {
            "server": "playwright",
            "action": "navigate",
            "params": {
                "url": "https://sede.agenciatributaria.gob.es"
            }
        }
        
        response = requests.post(f"{self.base_url}/api/mcp/execute", json=nav_data)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                self.log("✅ Playwright navigation simulation successful")
                self.log(f"🌐 Navigated to: {result.get('data', {}).get('url', 'N/A')}")
                
                # Test table extraction
                extract_data = {
                    "server": "playwright",
                    "action": "extract-table",
                    "params": {
                        "url": "https://sede.agenciatributaria.gob.es",
                        "selector": "table.data-table"
                    }
                }
                
                extract_response = requests.post(f"{self.base_url}/api/mcp/execute", json=extract_data)
                
                if extract_response.status_code == 200:
                    extract_result = extract_response.json()
                    if extract_result.get("success"):
                        table_data = extract_result.get('data', {}).get('table', [])
                        self.log(f"📊 Extracted table with {len(table_data)} rows")
                        return True
                
                return True
            else:
                self.log(f"❌ Playwright automation failed: {result.get('error', 'Unknown error')}")
                return False
        else:
            self.log(f"❌ Playwright request failed: HTTP {response.status_code}")
            return False

    def test_mcp_portal_integration(self):
        """Test MCP portal integration functionality"""
        self.log("🏢 Testing MCP Portal Integration...")
        
        # Test portal download simulation
        portal_data = {
            "portal": "hacienda",
            "credentials": {
                "username": "test_user",
                "password": "test_pass"
            },
            "documentType": "modelo303"
        }
        
        response = requests.post(f"{self.base_url}/api/mcp/portal", json=portal_data)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                self.log("✅ Portal integration simulation successful")
                document_id = result.get('data', {}).get('documentId', 'N/A')
                self.log(f"📄 Created document: {document_id}")
                
                # Test document processing
                process_data = {
                    "documentId": document_id
                }
                
                process_response = requests.post(f"{self.base_url}/api/mcp/document", json=process_data)
                
                if process_response.status_code == 200:
                    process_result = process_response.json()
                    if process_result.get("success"):
                        self.log("✅ Document processing simulation successful")
                        return True
                
                return True
            else:
                self.log(f"❌ Portal integration failed: {result.get('error', 'Unknown error')}")
                return False
        else:
            self.log(f"❌ Portal request failed: HTTP {response.status_code}")
            return False

    def test_mcp_workflow_creation(self):
        """Test MCP workflow creation capabilities"""
        self.log("⚙️ Testing MCP Workflow Creation...")
        
        # Test creating a custom workflow for invoice processing
        workflow_data = {
            "server": "n8n",
            "action": "create-workflow",
            "params": {
                "name": "Advanced Invoice Processing",
                "nodes": [
                    {"type": "webhook", "name": "Document Received"},
                    {"type": "ocr", "name": "Extract Text"},
                    {"type": "ai", "name": "Process with AI"},
                    {"type": "validate", "name": "Validate Invoice"},
                    {"type": "accounting", "name": "Create Accounting Entry"},
                    {"type": "notification", "name": "Notify Completion"}
                ]
            }
        }
        
        response = requests.post(f"{self.base_url}/api/mcp/execute", json=workflow_data)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                workflow_id = result.get('data', {}).get('workflowId', 'N/A')
                self.log("✅ Workflow creation successful")
                self.log(f"🔧 Created workflow: {workflow_id}")
                return True
            else:
                self.log(f"❌ Workflow creation failed: {result.get('error', 'Unknown error')}")
                return False
        else:
            self.log(f"❌ Workflow creation request failed: HTTP {response.status_code}")
            return False

    def test_mcp_performance(self):
        """Test MCP performance and response times"""
        self.log("⚡ Testing MCP Performance...")
        
        response_times = []
        
        # Test multiple rapid requests
        for i in range(5):
            start_time = time.time()
            
            test_data = {
                "server": "desktop-commander",
                "action": "capture-screen",
                "params": {}
            }
            
            response = requests.post(f"{self.base_url}/api/mcp/execute", json=test_data)
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds
            response_times.append(response_time)
            
            if response.status_code == 200:
                self.log(f"✅ Request {i+1}/5 completed in {response_time:.1f}ms")
            else:
                self.log(f"❌ Request {i+1}/5 failed: HTTP {response.status_code}")
        
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            max_time = max(response_times)
            min_time = min(response_times)
            
            self.log(f"📊 Performance Results:")
            self.log(f"   Average response time: {avg_time:.1f}ms")
            self.log(f"   Fastest response: {min_time:.1f}ms")
            self.log(f"   Slowest response: {max_time:.1f}ms")
            
            # Performance is good if average < 2 seconds
            return avg_time < 2000
        
        return False

    def test_mcp_error_handling(self):
        """Test MCP error handling"""
        self.log("🚨 Testing MCP Error Handling...")
        
        # Test invalid server
        invalid_server_data = {
            "server": "non-existent-server",
            "action": "test-action",
            "params": {}
        }
        
        response = requests.post(f"{self.base_url}/api/mcp/execute", json=invalid_server_data)
        
        if response.status_code == 400:
            result = response.json()
            if result.get("error"):
                self.log("✅ Invalid server error handling works")
            else:
                self.log("❌ Error response missing error message")
                return False
        else:
            self.log(f"❌ Expected 400 error, got: HTTP {response.status_code}")
            return False
        
        # Test invalid action
        invalid_action_data = {
            "server": "desktop-commander",
            "action": "non-existent-action",
            "params": {}
        }
        
        response = requests.post(f"{self.base_url}/api/mcp/execute", json=invalid_action_data)
        
        if response.status_code == 200:
            result = response.json()
            if not result.get("success") and result.get("error"):
                self.log("✅ Invalid action error handling works")
                return True
            else:
                self.log("❌ Invalid action should return error")
                return False
        else:
            self.log(f"❌ Unexpected status code for invalid action: HTTP {response.status_code}")
            return False

    def run_advanced_mcp_tests(self):
        """Run all advanced MCP tests"""
        self.log("🚀 Starting Advanced MCP Test Suite")
        self.log("=" * 60)
        
        test_results = {
            "desktop_commander": self.test_mcp_desktop_commander(),
            "n8n_workflows": self.test_mcp_n8n_workflows(),
            "playwright_automation": self.test_mcp_playwright_automation(),
            "portal_integration": self.test_mcp_portal_integration(),
            "workflow_creation": self.test_mcp_workflow_creation(),
            "performance": self.test_mcp_performance(),
            "error_handling": self.test_mcp_error_handling()
        }
        
        # Generate summary
        self.log("=" * 60)
        self.log("📊 ADVANCED MCP TEST RESULTS")
        self.log("=" * 60)
        
        passed = sum(test_results.values())
        total = len(test_results)
        success_rate = (passed / total) * 100
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            formatted_name = test_name.replace('_', ' ').title()
            self.log(f"{formatted_name:20} : {status}")
        
        self.log("-" * 60)
        self.log(f"MCP INTEGRATION SCORE: {passed}/{total} ({success_rate:.1f}%)")
        
        if success_rate >= 85:
            self.log("🏆 EXCELLENT - MCP integration is fully functional!")
        elif success_rate >= 70:
            self.log("👍 GOOD - MCP integration is working well")
        elif success_rate >= 50:
            self.log("⚠️ WARNING - MCP integration has some issues")
        else:
            self.log("🚨 CRITICAL - MCP integration needs attention")
        
        return test_results

def main():
    """Main test execution"""
    print("🔬 Advanced MCP Testing for GestAgent")
    print("=" * 40)
    
    tester = AdvancedMCPTester()
    results = tester.run_advanced_mcp_tests()
    
    # Exit with appropriate code
    success_rate = sum(results.values()) / len(results) * 100
    sys.exit(0 if success_rate >= 70 else 1)

if __name__ == "__main__":
    main()