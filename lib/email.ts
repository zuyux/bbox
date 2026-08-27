import { Resend } from 'resend';
import type { Locale } from '@/lib/i18n';

const resendApiKey = process.env.RESEND_API_KEY;
const configuredFromAddress = process.env.RESEND_FROM_EMAIL?.trim();
const isTestApiKey = Boolean(resendApiKey?.startsWith('re_test_'));
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

const normalizeFromAddress = (value?: string) => {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const standardDisplayName = trimmed.match(/^(.+?)\s+<([^<>@\s]+@[^<>@\s]+)>$/);
  if (standardDisplayName) return trimmed;

  const bareEmail = trimmed.match(/^[^<>@\s]+@[^<>@\s]+$/);
  if (bareEmail) return trimmed;

  const wrappedEmail = trimmed.match(/^<([^<>@\s]+@[^<>@\s]+)>$/);
  if (wrappedEmail) return wrappedEmail[1];

  const wrappedNameAndEmail = trimmed.match(/^<(.+?)\s+([^<>@\s]+@[^<>@\s]+)>$/);
  if (wrappedNameAndEmail) {
    return `${wrappedNameAndEmail[1].trim()} <${wrappedNameAndEmail[2]}>`;
  }

  return trimmed;
};

const resendFromAddress = normalizeFromAddress(configuredFromAddress);

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
      const message = 'RESEND_FROM_EMAIL is not configured. Set it to a verified sender, like noreply@example.com or BBOXX <noreply@example.com>.';
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
    const from = normalizeFromAddress(options.from) || resendFromAddress;

    const { data, error } = await resendClient.emails.send({
      from,
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
    subject: "Welcome to the BBOXX Waitlist!",
    html: `
      <div style="background:#000;padding:32px 24px;color:#fff;font-family:'Jersey 10',cursive;">
      <div style="background:#000;padding:32px 24px;border-radius:16px;text-align:center;max-width:480px;margin:auto;">
        <h1 style="color:#ff8a00;font-size:2rem;font-weight:700;margin-bottom:12px;letter-spacing:1px;">Welcome to the BBOXX Waitlist!</h1>
        <p style="font-size:1.1rem;margin-bottom:18px;">Hey <b>${email}</b>,</p>
        <p style="font-size:1rem;margin-bottom:18px;">We're excited to have you join the registry for verified open-source software and digital sovereignty.<br />
        You'll be the first to know about exclusive features, updates, and early access opportunities.</p>
        <div style="margin:24px 0;">
          <a href="https://bboxx.app" style="display:inline-block;padding:12px 32px;background:#ff006a;color:#fff;border-radius:8px;font-weight:600;text-decoration:none;font-size:1.1rem;box-shadow:0 2px 8px #0002;">Visit BBOXX</a>
        </div>
        <hr style="border:none;border-top:1px solid #333;margin:32px 0;" />
        <p style="color:#898989;font-size:13px;">BBOXX &mdash; The Universal Registry for Verified Software</p>
      </div>
      </div>
    `
  }),

  accountCreated: ({ bitcoinAddress, verifyUrl, removeUrl, expiresInHours }: {
    bitcoinAddress: string;
    verifyUrl: string;
    removeUrl: string;
    expiresInHours: number;
  }) => ({
    subject: "BBOXX Account Created Successfully",
    html: `
      <div style="background:#000;padding:32px 24px;color:#fff;font-family:'Jersey 10',cursive;">
      <div style="background:#000;padding:32px 24px;border-radius:16px;max-width:600px;margin:auto;">
        <h2 style="color:#ff8a00;margin-bottom:20px;">Welcome to BBOXX — we're glad you're here!</h2>
        <p>Your account has been created successfully. You are now part of a growing community helping make trustworthy open-source software easier to discover, support, and preserve.</p>

        <div style="margin:28px 0;padding:24px;border:1px solid #2f2f33;border-radius:12px;background:#000;">
          <h3 style="margin-top:0;color:#ff8a00;">What is BBOXX?</h3>
          <p style="margin:8px 0;color:#e5e5e5;"><strong>BBOXX is short for Bitcoin Box</strong> — an open home for high-integrity software and the people who build it.</p>
          <p style="margin:12px 0 0;color:#e5e5e5;">BBOXX is a Bitcoin-anchored registry and funding layer where anyone can discover verified open-source apps, review transparent project information, support public goods, and follow the work behind each project. Builders keep control of their records while Bitcoin provides a durable, auditable foundation.</p>
        </div>

        <p><strong>Bitcoin Address:</strong> <code style="background:#000;border:1px solid #333;padding:4px 8px;border-radius:4px;color:#fff;">${bitcoinAddress}</code></p>

        <div style="margin:28px 0;padding:24px;border:1px solid #2f2f33;border-radius:12px;background:#000;">
          <h3 style="margin-top:0;color:#ff8a00;">Verify your email</h3>
          <p style="margin:8px 0 18px;color:#e5e5e5;">Click below to confirm this email belongs to you. Verification is optional, but it helps us keep your account safer.</p>
          <div style="text-align:center;margin-bottom:18px;">
            <a href="${verifyUrl}" style="display:inline-block;padding:12px 26px;background:#ff6a00;color:#050505;border-radius:8px;font-weight:600;text-decoration:none;">Verify Email</a>
          </div>
          <p style="margin:0;font-size:13px;color:#9ca3af;">If you don't verify but also don't remove this email within ${expiresInHours} hours, we'll automatically treat it as verified.</p>
        </div>

        <div style="margin:28px 0;padding:24px;border:1px solid #2f2f33;border-radius:12px;background:#000;">
          <h3 style="margin-top:0;color:#ff8a00;">Didn't create this wallet?</h3>
          <p style="margin:8px 0 18px;color:#f5d0d0;">Use the link below within ${expiresInHours} hours to remove your email from this wallet so you can register it elsewhere.</p>
          <div style="text-align:center;margin-bottom:8px;">
            <a href="${removeUrl}" style="display:inline-block;padding:12px 26px;background:#ff3b3b;color:#050505;border-radius:8px;font-weight:600;text-decoration:none;">Remove My Email</a>
          </div>
          <p style="margin:0;font-size:13px;color:#f5d0d0;">After the ${expiresInHours}-hour window, the email is locked to this wallet unless you contact support.</p>
        </div>

        <div style="background:#000;border:1px solid #2f2f33;padding:16px;border-radius:8px;margin:20px 0;">
          <p style="margin:0;color:#ff8a00;"><strong>⚠️ Important Security Notice:</strong></p>
          <p style="margin:8px 0 0 0;">Keep your mnemonic/seed phrase safe. Never share it with anyone. This is the only way to recover your wallet.</p>
        </div>
        <p style="color:#898989;font-size:13px;">BBOXX &mdash; The Universal Registry for Verified Software</p>
      </div>
      </div>
    `
  }),

  verifiedAccountCreated: ({ bitcoinAddress, locale = 'en' }: {
    bitcoinAddress: string;
    locale?: Locale;
  }) => {
    const templates = {
      en: {
        subject: 'Welcome to BBOXX - your account is ready',
        heading: "Welcome to BBOXX - we're glad you're here!",
        intro: 'Your Google email has been verified and your account is ready. You are now part of a growing community helping make trustworthy open-source software easier to discover, support, and preserve.',
        whatTitle: 'What is BBOXX?',
        shortFor: 'BBOXX is short for Bitcoin Box',
        whatLead: 'an open home for high-integrity software and the people who build it.',
        whatBody: 'BBOXX is a Bitcoin-anchored registry and funding layer where anyone can discover verified open-source apps, review transparent project information, support public goods, and follow the work behind each project. Builders keep control of their records while Bitcoin provides a durable, auditable foundation.',
        nextTitle: 'What you can do next',
        nextItems: [
          'Explore verified apps across Bitcoin, privacy, infrastructure, developer tools, AI, games, and public-good software.',
          'Keep your builder or user profile useful with links, project details, funding information, and account settings.',
          'Support open work with transparent project records and direct funding paths when available.',
        ],
        addressLabel: 'Bitcoin Address:',
        securityTitle: 'Important Security Notice:',
        securityBody: 'Keep your mnemonic/seed phrase safe. Never share it with anyone. This is the only way to recover your wallet.',
        cta: 'Explore BBOXX',
        footer: 'The Universal Registry for Verified Software',
      },
      es: {
        subject: 'Bienvenido a BBOXX - tu cuenta esta lista',
        heading: 'Bienvenido a BBOXX - nos alegra que estes aqui.',
        intro: 'Tu correo de Google fue verificado y tu cuenta esta lista. Ahora formas parte de una comunidad que ayuda a que el software de codigo abierto confiable sea mas facil de descubrir, apoyar y preservar.',
        whatTitle: 'Que es BBOXX?',
        shortFor: 'BBOXX significa Bitcoin Box',
        whatLead: 'un hogar abierto para software de alta integridad y las personas que lo construyen.',
        whatBody: 'BBOXX es un registro y capa de financiamiento anclados en Bitcoin donde cualquiera puede descubrir aplicaciones de codigo abierto verificadas, revisar informacion transparente de proyectos, apoyar bienes publicos y seguir el trabajo detras de cada proyecto. Los builders mantienen el control de sus registros mientras Bitcoin aporta una base durable y auditable.',
        nextTitle: 'Que puedes hacer ahora',
        nextItems: [
          'Explora apps verificadas de Bitcoin, privacidad, infraestructura, herramientas para desarrolladores, IA, juegos y software de bien publico.',
          'Manten util tu perfil de builder o usuario con enlaces, detalles de proyectos, informacion de financiamiento y ajustes de cuenta.',
          'Apoya trabajo abierto con registros transparentes de proyectos y rutas directas de financiamiento cuando esten disponibles.',
        ],
        addressLabel: 'Direccion Bitcoin:',
        securityTitle: 'Aviso importante de seguridad:',
        securityBody: 'Guarda bien tu frase mnemonica/seed phrase. Nunca la compartas con nadie. Es la unica forma de recuperar tu wallet.',
        cta: 'Explorar BBOXX',
        footer: 'El Registro Universal de Software Verificado',
      },
      pt: {
        subject: 'Bem-vindo ao BBOXX - sua conta esta pronta',
        heading: 'Bem-vindo ao BBOXX - que bom ter voce aqui.',
        intro: 'Seu email do Google foi verificado e sua conta esta pronta. Agora voce faz parte de uma comunidade que ajuda software open-source confiavel a ser mais facil de descobrir, apoiar e preservar.',
        whatTitle: 'O que e BBOXX?',
        shortFor: 'BBOXX significa Bitcoin Box',
        whatLead: 'uma casa aberta para software de alta integridade e para as pessoas que o constroem.',
        whatBody: 'BBOXX e um registro e uma camada de financiamento ancorados em Bitcoin onde qualquer pessoa pode descobrir apps open-source verificados, revisar informacoes transparentes de projetos, apoiar bens publicos e acompanhar o trabalho por tras de cada projeto. Builders mantem controle dos seus registros enquanto Bitcoin oferece uma base duravel e auditavel.',
        nextTitle: 'O que voce pode fazer agora',
        nextItems: [
          'Explore apps verificados de Bitcoin, privacidade, infraestrutura, ferramentas para desenvolvedores, IA, jogos e software de bem publico.',
          'Mantenha seu perfil de builder ou usuario util com links, detalhes de projetos, informacoes de financiamento e configuracoes da conta.',
          'Apoie trabalho aberto com registros transparentes de projetos e caminhos diretos de financiamento quando disponiveis.',
        ],
        addressLabel: 'Endereco Bitcoin:',
        securityTitle: 'Aviso importante de seguranca:',
        securityBody: 'Guarde bem sua frase mnemonica/seed phrase. Nunca a compartilhe com ninguem. Ela e a unica forma de recuperar sua wallet.',
        cta: 'Explorar BBOXX',
        footer: 'O Registro Universal de Software Verificado',
      },
    };
    const copy = templates[locale] ?? templates.en;

    return {
    subject: copy.subject,
    html: `
      <div style="background:#000;padding:32px 24px;color:#fff;font-family:Arial,sans-serif;">
      <div style="background:#000;padding:32px 24px;border-radius:16px;max-width:600px;margin:auto;">
        <h2 style="color:#ff8a00;margin-bottom:20px;">${copy.heading}</h2>
        <p style="color:#e5e5e5;line-height:1.6;">${copy.intro}</p>

        <div style="margin:28px 0;padding:24px;border:1px solid #2f2f33;border-radius:12px;background:#000;">
          <h3 style="margin-top:0;color:#ff8a00;">${copy.whatTitle}</h3>
          <p style="margin:8px 0;color:#e5e5e5;"><strong>${copy.shortFor}</strong> - ${copy.whatLead}</p>
          <p style="margin:12px 0 0;color:#e5e5e5;line-height:1.6;">${copy.whatBody}</p>
        </div>

        <div style="margin:28px 0;padding:24px;border:1px solid #2f2f33;border-radius:12px;background:#000;">
          <h3 style="margin-top:0;color:#ff8a00;">${copy.nextTitle}</h3>
          <ul style="margin:12px 0 0;padding-left:20px;color:#e5e5e5;line-height:1.6;">
            ${copy.nextItems.map((item) => `<li style="margin:8px 0;">${item}</li>`).join('')}
          </ul>
        </div>

        <p><strong>${copy.addressLabel}</strong> <code style="display:inline-block;max-width:100%;overflow-wrap:anywhere;background:#000;border:1px solid #333;padding:4px 8px;border-radius:4px;color:#fff;">${bitcoinAddress}</code></p>
        <div style="background:#000;border:1px solid #2f2f33;padding:16px;border-radius:8px;margin:20px 0;">
          <p style="margin:0;color:#ff8a00;"><strong>${copy.securityTitle}</strong></p>
          <p style="margin:8px 0 0 0;color:#e5e5e5;line-height:1.6;">${copy.securityBody}</p>
        </div>
        <div style="text-align:center;margin:28px 0;">
          <a href="https://bboxx.app" style="display:inline-block;padding:12px 26px;background:#ff6a00;color:#050505;border-radius:8px;font-weight:700;text-decoration:none;">${copy.cta}</a>
        </div>
        <p style="color:#898989;font-size:13px;">BBOXX &mdash; ${copy.footer}</p>
      </div>
      </div>
    `
    };
  },

  emailVerificationCode: ({ code, expiresInMinutes, verifyOnDeviceUrl }: {
    code: string;
    expiresInMinutes: number;
    verifyOnDeviceUrl?: string;
  }) => ({
    subject: "Your BBOXX verification code",
    html: `
      <div style="background:#000;padding:32px 24px;color:#fff;font-family:Arial,sans-serif;">
      <div style="background:#000;padding:32px 24px;border-radius:16px;max-width:520px;margin:auto;">
        <h2 style="color:#ff8a00;margin:0 0 18px;">Verify your email</h2>
        <p style="margin:0 0 18px;color:#e5e5e5;">Enter this code to continue creating your BBOXX wallet.</p>
        <div style="letter-spacing:8px;font-size:32px;font-weight:700;text-align:center;background:#000;border:1px solid #2f2f33;border-radius:12px;padding:22px;margin:24px 0;color:#fff;">
          ${code}
        </div>
        ${verifyOnDeviceUrl ? `
        <div style="text-align:center;margin:0 0 24px;">
          <a href="${verifyOnDeviceUrl}" style="display:inline-block;padding:13px 28px;background:#ff6a00;color:#050505;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;">Click to Verify</a>
        </div>
        ` : ''}
        <p style="margin:0 0 14px;color:#9ca3af;font-size:14px;">This code expires in ${expiresInMinutes} minutes.</p>
        <p style="margin:0;color:#9ca3af;font-size:14px;">If you did not request this, you can ignore this email.</p>
        <p style="color:#898989;font-size:12px;margin-top:28px;">BBOXX &mdash; The Universal Registry for Verified Software</p>
      </div>
      </div>
    `
  }),

  walletConnectionLink: (connectionUrl: string) => ({
    subject: "🔐 Account Connection Link - BBOXX",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Connection</title>
      </head>
      <body style="background:#000;font-family:Arial,sans-serif;line-height:1.6;color:#fff;margin:0;padding:20px;">
        <div style="background:#000;max-width:600px;margin:0 auto;">
        <div style="background:#000;padding:30px;border:1px solid #2f2f33;border-radius:10px 10px 0 0;text-align:center;">
          <h1 style="color:#ff8a00;margin:0;font-size:24px;">🔐 Account Connection</h1>
        </div>
        
        <div style="background:#000;padding:30px;border-radius:0 0 10px 10px;border:1px solid #2f2f33;">
          <h2 style="color:#ff8a00;margin-top:0;">Connect Your Account</h2>
          
          <p>Hello!</p>
          
          <p>You requested to connect your account to BBOXX. Click the button below to complete the connection process:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${connectionUrl}" 
               style="display: inline-block; background: #ff6a00; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Connect Account
            </a>
          </div>
          
          <p style="color:#b3b3b3;font-size:14px;margin-top:30px;">
            <strong>Important:</strong> This link will expire in 30 minutes for security reasons.
          </p>
          
          <p style="color:#b3b3b3;font-size:14px;">
            If you didn't request this connection, please ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            This email was sent by BBOXX Platform<br>
            If you can't click the button, copy and paste this link: ${connectionUrl}
          </p>
        </div>
        </div>
      </body>
      </html>
    `
  })
};
