import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromAddress = process.env.RESEND_FROM_EMAIL;
const isTestApiKey = Boolean(resendApiKey?.startsWith('re_test_'));
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

const simulateEmailSend = (options: EmailOptions, reason: string) => {
  console.warn(`📧 Email delivery skipped (${reason}).`);
  console.log('📧 [SIMULATED SEND]', {
    to: options.to,
    subject: options.subject,
    from: options.from || resendFromAddress || 'Configure RESEND_FROM_EMAIL',
  });
  return { success: true, messageId: `${reason}-${Date.now()}` };
};

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export async function sendEmail(options: EmailOptions) {
  try {
    if (!resendFromAddress) {
      const message = 'RESEND_FROM_EMAIL is not configured. Set it to a verified domain or an onresend.com address.';
      if (process.env.NODE_ENV !== 'production') {
        return simulateEmailSend(options, 'missing-from-address');
      }
      throw new Error(message);
    }

    if (!resendClient) {
      if (process.env.NODE_ENV !== 'production') {
        return simulateEmailSend(options, 'missing-api-key');
      }
      throw new Error('Resend API key is not configured. Set RESEND_API_KEY to send emails.');
    }

    if (isTestApiKey) {
      const warning = 'RESEND_API_KEY starts with re_test_. Test keys do not deliver real emails. Create a Live API key in the Resend dashboard.';
      if (process.env.NODE_ENV !== 'production') {
        console.warn(warning);
        return simulateEmailSend(options, 'test-api-key');
      }
      throw new Error(warning);
    }

    const to = Array.isArray(options.to) ? options.to : [options.to];

    const { data, error } = await resendClient.emails.send({
      from: options.from || resendFromAddress,
      to,
      subject: options.subject,
      html: options.html,
      cc: options.cc,
      bcc: options.bcc,
    });

    if (error) {
      throw new Error(error.message ?? 'Resend failed to send email');
    }

    const messageId = data?.id ?? 'resend-' + Date.now();
    console.log('✅ Email sent successfully:', messageId);
    return { success: true, messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw new Error('Failed to send email: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// Email templates
export const emailTemplates = {
  waitlistWelcome: (email: string) => ({
    subject: "Welcome to the BBOX Waitlist!",
    html: `
      <div style="background:#18181b;padding:32px 24px;border-radius:16px;color:#fff;font-family:'Jersey 10',cursive;text-align:center;max-width:480px;margin:auto;">
        <h1 style="font-size:2rem;font-weight:700;margin-bottom:12px;letter-spacing:1px;">Welcome to the BBOX Waitlist!</h1>
        <p style="font-size:1.1rem;margin-bottom:18px;">Hey <b>${email}</b>,</p>
        <p style="font-size:1rem;margin-bottom:18px;">We're excited to have you join the revolution in Bitcoin applications and digital innovation.<br />
        You'll be the first to know about exclusive features, updates, and early access opportunities.</p>
        <div style="margin:24px 0;">
          <a href="https://bbox.app" style="display:inline-block;padding:12px 32px;background:#ff006a;color:#fff;border-radius:8px;font-weight:600;text-decoration:none;font-size:1.1rem;box-shadow:0 2px 8px #0002;">Visit BBOX</a>
        </div>
        <hr style="border:none;border-top:1px solid #333;margin:32px 0;" />
        <p style="color:#898989;font-size:13px;">BBOX &mdash; The Open Bitcoin App Store</p>
      </div>
    `
  }),

  accountCreated: ({ address, verifyUrl, removeUrl, expiresInHours }: {
    address: string;
    verifyUrl: string;
    removeUrl: string;
    expiresInHours: number;
  }) => ({
    subject: "BBOX Account Created Successfully",
    html: `
      <div style="background:#18181b;padding:32px 24px;border-radius:16px;color:#fff;font-family:'Jersey 10',cursive;max-width:600px;margin:auto;">
        <h2 style="color:#ff006a;margin-bottom:20px;">Welcome to BBOX!</h2>
        <p>Your account has been created successfully.</p>
        <p><strong>Address:</strong> <code style="background:#333;padding:4px 8px;border-radius:4px;color:#fff;">${address}</code></p>

        <div style="margin:28px 0;padding:24px;border:1px solid #2f2f33;border-radius:12px;background:#101015;">
          <h3 style="margin-top:0;color:#ffde91;">Verify your email</h3>
          <p style="margin:8px 0 18px;color:#e5e5e5;">Click below to confirm this email belongs to you. Verification is optional, but it helps us keep your account safer.</p>
          <div style="text-align:center;margin-bottom:18px;">
            <a href="${verifyUrl}" style="display:inline-block;padding:12px 26px;background:#00c2ff;color:#050505;border-radius:8px;font-weight:600;text-decoration:none;">Verify Email</a>
          </div>
          <p style="margin:0;font-size:13px;color:#9ca3af;">If you don't verify but also don't remove this email within ${expiresInHours} hours, we'll automatically treat it as verified.</p>
        </div>

        <div style="margin:28px 0;padding:24px;border:1px solid #2f2f33;border-radius:12px;background:#150b0b;">
          <h3 style="margin-top:0;color:#ff6b6b;">Didn't create this wallet?</h3>
          <p style="margin:8px 0 18px;color:#f5d0d0;">Use the link below within ${expiresInHours} hours to remove your email from this wallet so you can register it elsewhere.</p>
          <div style="text-align:center;margin-bottom:8px;">
            <a href="${removeUrl}" style="display:inline-block;padding:12px 26px;background:#ff3b3b;color:#050505;border-radius:8px;font-weight:600;text-decoration:none;">Remove My Email</a>
          </div>
          <p style="margin:0;font-size:13px;color:#f5d0d0;">After the ${expiresInHours}-hour window, the email is locked to this wallet unless you contact support.</p>
        </div>

        <div style="background:#1a1a1a;padding:16px;border-radius:8px;margin:20px 0;">
          <p style="margin:0;color:#ff6b6b;"><strong>⚠️ Important Security Notice:</strong></p>
          <p style="margin:8px 0 0 0;">Keep your mnemonic/seed phrase safe. Never share it with anyone. This is the only way to recover your wallet.</p>
        </div>
        <p style="color:#898989;font-size:13px;">BBOX &mdash; The Open Bitcoin App Store</p>
      </div>
    `
  }),

  walletConnectionLink: (connectionUrl: string) => ({
    subject: "🔐 Account Connection Link - BBOX",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Connection</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Account Connection</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <h2 style="color: #2563eb; margin-top: 0;">Connect Your Account</h2>
          
          <p>Hello!</p>
          
          <p>You requested to connect your account to BBOX. Click the button below to complete the connection process:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${connectionUrl}" 
               style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Connect Account
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            <strong>Important:</strong> This link will expire in 30 minutes for security reasons.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            If you didn't request this connection, please ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            This email was sent by BBOX Platform<br>
            If you can't click the button, copy and paste this link: ${connectionUrl}
          </p>
        </div>
      </body>
      </html>
    `
  })
};