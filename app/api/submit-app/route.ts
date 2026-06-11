import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

function generateAppId(length = 10) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  while (id.length < length) {
    const bytes = crypto.randomBytes(length - id.length);
    for (const byte of bytes) {
      if (id.length >= length) break;
      id += alphabet[byte % alphabet.length];
    }
  }
  return id;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'description', 'category', 'publisher_address', 'publisher_email'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const signature = typeof body.signature === 'string' ? body.signature.trim() : '';
    const signaturePayload = typeof body.signature_payload === 'string' ? body.signature_payload.trim() : '';
    const signatureWalletType = typeof body.signature_wallet_type === 'string' ? body.signature_wallet_type.trim() : '';
    const signaturePublicKey = typeof body.signature_public_key === 'string' ? body.signature_public_key.trim() : '';
    const metadataCid = typeof body.metadata_cid === 'string' ? body.metadata_cid.trim() : '';
    const contractTxId = typeof body.contract_txid === 'string' ? body.contract_txid.trim() : '';
    const contractNetwork = typeof body.contract_network === 'string' ? body.contract_network.trim() : '';
    const contractAppId = typeof body.contract_app_id === 'number' ? body.contract_app_id : null;

    // Prepare the app data with only the known bbox_apps columns.
    const appData: Record<string, unknown> = {
      id: typeof body.id === 'string' && body.id.trim() ? body.id.trim() : generateAppId(10),
      name: body.name,
      description: body.description,
      category: body.category,
      tags: Array.isArray(body.tags)
        ? body.tags
        : typeof body.tags === 'string'
        ? body.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
        : [],
      downloads: '0',
      rating: 0,
      verified: false,
      link: body.website_url || '',
      imgcid: body.icon_cid || '',
    };

    // Signatures are logged for debugging only; they are no longer stored on the apps table

    // Insert the app into the Supabase bbox_apps table
    const { data, error } = await supabaseAdmin
      .from('bbox_apps')
      .insert([appData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Database error: ' + error.message },
        { status: 500 }
      );
    }

    if (signature && signaturePayload) {
      console.log('🔏 Submission signature received', {
        appId: data?.id,
        walletType: signatureWalletType || 'unknown',
        hasPublicKey: Boolean(signaturePublicKey),
      });
    }

    console.log('✅ App submitted to database:', data.id);

    return NextResponse.json({
      success: true,
      app: data,
      message: 'App submitted successfully for review'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
