import { NextRequest, NextResponse } from 'next/server';
import { mcpIntegration } from '@/lib/mcp-integration';
import { dbAdapter } from '@/lib/db-adapter';

const SUPPORTED_PORTALS = {
  'hacienda': {
    name: 'Agencia Tributaria',
    url: 'https://sede.agenciatributaria.gob.es',
    documentTypes: ['modelo303', 'modelo347', 'modelo190'],
  },
  'seg-social': {
    name: 'Seguridad Social',
    url: 'https://sede.seg-social.gob.es',
    documentTypes: ['tc1', 'tc2', 'idc'],
  },
  'bancosantander': {
    name: 'Banco Santander',
    url: 'https://www.bancosantander.es',
    documentTypes: ['extracto', 'movimientos'],
  },
  'caixabank': {
    name: 'CaixaBank',
    url: 'https://www.caixabank.es',
    documentTypes: ['extracto', 'movimientos'],
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { portal, credentials, documentType } = body;

    if (!portal || !credentials) {
      return NextResponse.json(
        { error: 'Portal and credentials are required' },
        { status: 400 }
      );
    }

    if (!SUPPORTED_PORTALS[portal]) {
      return NextResponse.json(
        { error: 'Unsupported portal' },
        { status: 400 }
      );
    }

    // Download from portal using MCP
    const result = await mcpIntegration.downloadFromPortal(
      SUPPORTED_PORTALS[portal].url,
      credentials
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Download failed' },
        { status: 400 }
      );
    }

    // Create document record
    const document = await dbAdapter.createDocument({
      name: `${portal}-${documentType || 'document'}-${Date.now()}`,
      type: documentType || 'other',
      status: 'pending',
      metadata: {
        source: 'portal',
        portal,
        downloadedAt: new Date().toISOString(),
        filePath: result.data.filePath,
      },
    });

    // Trigger processing workflow
    const workflowResult = await mcpIntegration.executeAction({
      server: 'n8n',
      action: 'trigger-workflow',
      params: {
        workflowId: 'process-portal-document',
        data: {
          documentId: document.id,
          portal,
          documentType,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        documentId: document.id,
        portal,
        download: result.data,
        workflow: workflowResult.data,
      },
    });
  } catch (error) {
    console.error('Portal download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return supported portals
  return NextResponse.json({
    portals: SUPPORTED_PORTALS,
  });
}