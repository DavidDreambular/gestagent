#!/usr/bin/env python3
"""
Simple script to verify our uploaded document exists in the database
"""
import requests
import json

def verify_document(base_url="http://localhost:3001", document_id="0685005c-998b-4bbd-89b3-e20c0a50351a"):
    print(f"🔍 Verifying document: {document_id}")
    
    # Check dashboard stats
    print("\n📊 Dashboard Stats:")
    response = requests.get(f"{base_url}/api/dashboard/stats")
    if response.status_code == 200:
        stats = response.json()
        print(f"Total Documents: {stats.get('data', {}).get('totalDocuments', 0)}")
        print(f"Completed Documents: {stats.get('data', {}).get('completedDocuments', 0)}")
    
    # Check documents list
    print("\n📋 Documents List:")
    response = requests.get(f"{base_url}/api/documents/list")
    if response.status_code == 200:
        result = response.json()
        documents = result.get('documents', [])
        print(f"Documents found: {len(documents)}")
        for doc in documents:
            print(f"  - {doc.get('job_id')}: {doc.get('status')} ({doc.get('document_type')})")
    
    # Try direct document access (this requires auth but let's see the error)
    print(f"\n🔍 Direct Document Access:")
    response = requests.get(f"{base_url}/api/documents/{document_id}")
    print(f"Status: {response.status_code}")
    if response.status_code != 200:
        try:
            error = response.json()
            print(f"Error: {error}")
        except:
            print(f"Response: {response.text[:200]}")

if __name__ == "__main__":
    verify_document()