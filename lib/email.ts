import nodemailer from 'nodemailer';

// Email configuration
const createTransporter = () => {
  // Check if we have SMTP configuration
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback to Gmail if configured
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // Development/test mode - use Ethereal (fake SMTP)
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ No email configuration found. Using test mode.');
    return null; // Will be handled in sendEmail function
  }

  throw new Error('No email configuration found. Please set SMTP or Gmail environment variables.');
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
    const transporter = createTransporter();
    
    // In development, just log the email instead of sending
    if (!transporter || process.env.NODE_ENV === 'development') {
      console.log('📧 [DEV MODE] Email would be sent:', {
        to: options.to,
        subject: options.subject,
        from: options.from || process.env.SMTP_FROM || process.env.GMAIL_USER || 'noreply@bbox.app',
      });
      return { success: true, messageId: 'dev-mode-' + Date.now() };
    }

    const mailOptions = {
      from: options.from || process.env.SMTP_FROM || process.env.GMAIL_USER || 'noreply@bbox.app',
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      ...(options.cc && { cc: Array.isArray(options.cc) ? options.cc.join(', ') : options.cc }),
      ...(options.bcc && { bcc: Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc }),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    
    return { success: true, messageId: info.messageId };
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
      <div style="background:#18181b;padding:32px 24px;border-radius:16px;color:#fff;font-family:Chakra Petch,sans-serif;text-align:center;max-width:480px;margin:auto;">
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

  accountCreated: (address: string) => ({
    subject: "BBOX Account Created Successfully",
    html: `
      <div style="background:#18181b;padding:32px 24px;border-radius:16px;color:#fff;font-family:Chakra Petch,sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#ff006a;margin-bottom:20px;">Welcome to BBOX!</h2>
        <p>Your account has been created successfully.</p>
        <p><strong>Address:</strong> <code style="background:#333;padding:4px 8px;border-radius:4px;color:#fff;">${address}</code></p>
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