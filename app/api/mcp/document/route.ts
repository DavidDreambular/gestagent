import { NextRequest, NextResponse } from 'next/server';
import { mcpIntegration } from '@/lib/mcp-integration';
import { dbAdapter } from '@/lib/db-adapter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Get document from database
    const document = await dbAdapter.getDocumentById(documentId);
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Process document with MCP
    const result = await mcpIntegration.processDocumentWithMCP(document);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Processing failed' },
        { status: 400 }
      );
    }

    // Update document status
    await dbAdapter.updateDocument(documentId, {
      status: 'processed',
      metadata: {
        ...document.metadata,
        mcpProcessing: result.data,
        processedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        documentId,
        processing: result.data,
      },
    });
  } catch (error) {
    console.error('MCP document processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}