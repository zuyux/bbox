import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, emailTemplates } from '@/lib/email';
import { createEmailToken } from '@/lib/emailVerification';

const VERIFICATION_WINDOW_HOURS = 48;

export async function POST(request: NextRequest) {
  try {
    const { email, address } = await request.json();
    if (!email || !address) {
      return NextResponse.json({ error: 'Missing email or address' }, { status: 400 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const verifyToken = createEmailToken({ email, address, type: 'verify', expiresInHours: VERIFICATION_WINDOW_HOURS });
    const removeToken = createEmailToken({ email, address, type: 'remove', expiresInHours: VERIFICATION_WINDOW_HOURS });

    const verifyUrl = `${baseUrl}/email/verify?token=${encodeURIComponent(verifyToken)}`;
    const removeUrl = `${baseUrl}/email/remove?token=${encodeURIComponent(removeToken)}`;

    const emailTemplate = emailTemplates.accountCreated({
      address,
      verifyUrl,
      removeUrl,
      expiresInHours: VERIFICATION_WINDOW_HOURS,
    });
    await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send account created email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
