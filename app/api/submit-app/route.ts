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
    const contractTxid = typeof body.contract_txid === 'string' ? body.contract_txid.trim() : '';
    const contractNetwork = typeof body.contract_network === 'string' ? body.contract_network.trim() : '';
    const barTxid = typeof body.bar_txid === 'string' ? body.bar_txid.trim() : '';
    const barInscriptionId = typeof body.bar_inscription_id === 'string' ? body.bar_inscription_id.trim() : '';
    const barOwnerAddress = typeof body.bar_owner_address === 'string' ? body.bar_owner_address.trim() : '';
    const githubUrl = typeof body.github_url === 'string' ? body.github_url.trim() : '';

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
      github_url: githubUrl,
      imgcid: body.icon_cid || '',
    };

    if (metadataCid) appData.metadata_cid = metadataCid;
    if (contractTxid) appData.contract_txid = contractTxid;
    if (contractNetwork) appData.contract_network = contractNetwork;
    if (barTxid) appData.bar_txid = barTxid;
    if (barInscriptionId) appData.bar_inscription_id = barInscriptionId;
    if (barOwnerAddress) appData.bar_owner_address = barOwnerAddress;

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
