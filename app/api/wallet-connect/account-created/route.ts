import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, emailTemplates } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, address } = await request.json();
    if (!email || !address) {
      return NextResponse.json({ error: 'Missing email or address' }, { status: 400 });
    }

    const emailTemplate = emailTemplates.accountCreated(address);
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
