import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { authorizeProfileMutation, ProfileMutationAuthError } from '@/lib/server/profileMutationAuth';

type DeveloperModePayload = {
  address?: string;
  developer_mode?: boolean;
};

function normalizeDeveloperMode(value: unknown): boolean {
  return value === true;
}

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('developer_mode')
      .ilike('address', address)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading Developer Mode:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      developer_mode: normalizeDeveloperMode(data?.developer_mode),
    });
  } catch (error) {
    if (error instanceof ProfileMutationAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Unexpected error loading Developer Mode:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: DeveloperModePayload = await request.json();
    const { address } = body;
    const developerMode = normalizeDeveloperMode(body.developer_mode);

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    await authorizeProfileMutation({ body: body as Record<string, unknown>, method: 'POST', path: '/api/profile/developer-mode', address });

    const now = new Date().toISOString();
    const { data: existingProfiles, error: lookupError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('address', address)
      .limit(1);

    if (lookupError) {
      console.error('Error looking up Developer Mode profile:', lookupError);
      return NextResponse.json({ error: lookupError.message }, { status: 500 });
    }

    const existingProfileId = existingProfiles?.[0]?.id;

    const result = existingProfileId
      ? await supabaseAdmin
          .from('profiles')
          .update({
            developer_mode: developerMode,
            updated_at: now,
            last_active: now,
          })
          .eq('id', existingProfileId)
          .select('developer_mode')
          .single()
      : await supabaseAdmin
          .from('profiles')
          .insert([
            {
              address,
              developer_mode: developerMode,
              created_at: now,
              updated_at: now,
              last_active: now,
            },
          ])
          .select('developer_mode')
          .single();

    if (result.error) {
      console.error('Error saving Developer Mode:', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      developer_mode: normalizeDeveloperMode(result.data?.developer_mode),
    });
  } catch (error) {
    if (error instanceof ProfileMutationAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Unexpected error saving Developer Mode:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
