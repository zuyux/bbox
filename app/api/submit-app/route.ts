import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

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

    // Prepare the app data
    const appData = {
      name: body.name,
      description: body.description,
      category: body.category,
      tags: body.tags || [],
      version: body.version || '1.0.0',
      icon_cid: body.icon_cid || '',
      website_url: body.website_url || '',
      github_url: body.github_url || '',
      documentation_url: body.documentation_url || '',
      platforms: body.platforms || [],
      supported_networks: body.supported_networks || [],
      license: body.license || 'MIT',
      pricing_model: body.pricing_model || 'free',
      price_usd: body.price_usd || 0,
      accepts_lightning: body.accepts_lightning || false,
      lightning_address: body.lightning_address || '',
      privacy_policy_url: body.privacy_policy_url || '',
      terms_of_service_url: body.terms_of_service_url || '',
      data_collection_summary: body.data_collection_summary || '',
      open_source: body.open_source !== false,
      publisher_address: body.publisher_address,
      publisher_name: body.publisher_name || '',
      publisher_email: body.publisher_email,
      status: 'pending',
      verified: false,
      featured: false,
      downloads: 0,
      rating: 0.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert the app into the database
    const { data, error } = await supabaseAdmin
      .from('apps')
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
