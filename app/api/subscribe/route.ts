import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabaseClient';

const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const adminEmail = process.env.SUBSCRIBE_NOTIFY_EMAIL || 'fabohax@gmail.com';

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const website = typeof body?.website === 'string' ? body.website.trim() : '';

    if (website) {
      return NextResponse.json({ success: true, message: 'Subscribed' });
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    const safeEmail = escapeHtml(email);
    const { data: existingSubscription, error: lookupError } = await supabaseAdmin
      .from('subscriptions')
      .select('status')
      .eq('email', email)
      .maybeSingle();

    if (lookupError) {
      console.error('Subscription lookup error:', lookupError);
      return NextResponse.json({ error: 'Unable to subscribe right now' }, { status: 500 });
    }

    if (existingSubscription?.status === 'subscribed') {
      return NextResponse.json({ success: true, message: 'Already subscribed' });
    }

    const now = new Date().toISOString();
    const { error: upsertError } = await supabaseAdmin
      .from('subscriptions')
      .upsert(
        {
          email,
          source: 'footer',
          status: 'subscribed',
          subscribed_at: now,
          unsubscribed_at: null,
          updated_at: now,
        },
        { onConflict: 'email' }
      );

    if (upsertError) {
      console.error('Subscription upsert error:', upsertError);
      return NextResponse.json({ error: 'Unable to subscribe right now' }, { status: 500 });
    }

    try {
      await sendEmail({
        to: email,
        subject: 'You are subscribed to BBOX',
        html: `
          <div style="background:#18181b;color:#fff;font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px 24px;border-radius:12px;">
            <h1 style="margin:0 0 16px;color:#ff7a1a;font-size:28px;">BBOX updates</h1>
            <p style="margin:0 0 16px;line-height:1.6;">Thanks for subscribing, <strong>${safeEmail}</strong>.</p>
            <p style="margin:0 0 24px;line-height:1.6;color:#d4d4d8;">You will get product updates, app registry news, and launch notes from BBOX.</p>
            <a href="https://bbox.app" style="display:inline-block;background:#ff5e00;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;">Visit BBOX</a>
            <p style="margin:28px 0 0;color:#8b8b94;font-size:12px;">BBOX - The Universal Registry for Verified Software</p>
          </div>
        `,
      });

      await sendEmail({
        to: adminEmail,
        subject: `${existingSubscription ? 'BBOX subscriber reactivated' : 'New BBOX subscriber'}: ${email}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;">
            <h2 style="margin:0 0 16px;">${existingSubscription ? 'Subscriber reactivated' : 'New BBOX subscriber'}</h2>
            <p style="margin:0 0 8px;"><strong>Email:</strong> ${safeEmail}</p>
            <p style="margin:0;color:#666;font-size:13px;">Source: footer subscribe form</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Subscription email error:', emailError);
    }

    return NextResponse.json({ success: true, message: 'Subscribed' });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: 'Unable to subscribe right now' }, { status: 500 });
  }
}
