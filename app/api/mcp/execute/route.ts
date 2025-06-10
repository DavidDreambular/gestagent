import { NextRequest, NextResponse } from 'next/server';
import { mcpIntegration } from '@/lib/mcp-integration';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { server, action, params } = body;

    if (!server || !action) {
      return NextResponse.json(
        { error: 'Server and action are required' },
        { status: 400 }
      );
    }

    // Execute MCP action
    const result = await mcpIntegration.executeAction({
      server,
      action,
      params: params || {},
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Action failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('MCP execution error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return available MCP servers and actions
  return NextResponse.json({
    servers: {
      'desktop-commander': {
        description: 'Desktop automation and screen capture',
        actions: ['capture-screen', 'capture-window', 'extract-text'],
      },
      'n8n': {
        description: 'Workflow automation',
        actions: ['trigger-workflow', 'get-workflow-status', 'create-workflow'],
      },
      'playwright': {
        description: 'Web automation',
        actions: ['navigate', 'download-document', 'extract-table', 'login'],
      },
    },
  });
}