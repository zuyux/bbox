import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type BarRelayResponse = {
  txId?: string;
  txid?: string;
  inscriptionId?: string;
  inscription_id?: string;
};

export async function POST(request: NextRequest) {
  try {
    const endpoint = process.env.BAR_INSCRIPTION_ENDPOINT;
    const apiKey = process.env.BAR_INSCRIPTION_API_KEY;

    if (!endpoint) {
      return NextResponse.json(
        {
          error:
            'BAR passkey inscription relay is not configured. Set BAR_INSCRIPTION_ENDPOINT or use an inscription-capable extension wallet.',
        },
        { status: 501 }
      );
    }

    const body = await request.json();
    const { payload, authorization, feeEstimate } = body;

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'BAR payload is required' }, { status: 400 });
    }

    if (!authorization?.signature || !authorization?.address || !authorization?.message) {
      return NextResponse.json({ error: 'Passkey authorization signature is required' }, { status: 400 });
    }

    const relayResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        protocol: 'brc-app',
        contentType: 'application/json',
        payload,
        authorization,
        feeEstimate,
      }),
    });

    const relayBody = (await relayResponse.json().catch(() => ({}))) as BarRelayResponse & {
      error?: string;
      message?: string;
    };

    if (!relayResponse.ok) {
      return NextResponse.json(
        { error: relayBody.error || relayBody.message || 'BAR inscription relay rejected the request' },
        { status: relayResponse.status }
      );
    }

    const txId = relayBody.txId || relayBody.txid;
    if (!txId) {
      return NextResponse.json({ error: 'BAR inscription relay did not return a transaction ID' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      txId,
      inscriptionId: relayBody.inscriptionId || relayBody.inscription_id || null,
    });
  } catch (error) {
    console.error('BAR inscription API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
