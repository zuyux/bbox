import { NextRequest, NextResponse } from 'next/server';
import { unpinFromPinata } from '@/lib/pinataUpload';
import { authorizeProfileMutation, ProfileMutationAuthError } from '@/lib/server/profileMutationAuth';
import { enforceApiUsage, ApiUsageError } from '@/lib/server/apiUsage';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const cid = typeof body.cid === 'string' ? body.cid : '';
    const address = typeof body.address === 'string' ? body.address : '';

    if (!cid || !address) {
      return NextResponse.json(
        { error: 'CID and address are required' },
        { status: 400 }
      );
    }

    await authorizeProfileMutation({ body, method: 'POST', path: '/api/remove-banner', address });
    await enforceApiUsage({ request, scope: 'banner-remove', address, windowSeconds: 3600, maxRequests: 20 });
    const { data: owned } = await supabaseAdmin.from('managed_pinata_assets')
      .select('cid').eq('cid', cid).ilike('owner_address', address).eq('asset_kind', 'profile-banner').maybeSingle();
    if (!owned) {
      // Backward-compatible ownership check for banners created before the
      // managed asset registry was introduced.
      const { data: profile } = await supabaseAdmin.from('profiles')
        .select('address').ilike('address', address).eq('banner_cid', cid).maybeSingle();
      if (!profile) return NextResponse.json({ error: 'Asset not found or not owned by this wallet' }, { status: 404 });
    }

    console.log('Removing banner from Pinata:', cid);
    const result = await unpinFromPinata(cid);
    
    if (!result) {
      console.error('Failed to unpin from Pinata');
    }
    await supabaseAdmin.from('managed_pinata_assets').delete().eq('cid', cid).ilike('owner_address', address);

    return NextResponse.json({
      success: true,
      message: 'Banner removed successfully'
    });

  } catch (error) {
    if (error instanceof ProfileMutationAuthError || error instanceof ApiUsageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Banner remove error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
