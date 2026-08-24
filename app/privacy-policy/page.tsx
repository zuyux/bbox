
import { LocalizedText } from '@/components/LocalizedText';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | BBOXX',
  description: 'How BBOXX collects, uses, shares, and protects information.',
};

const sections = [
  {
    title: 'Information we collect',
    content: (
      <>
        <p><LocalizedText>Depending on how you use BBOXX, we may collect:</LocalizedText></p>
        <ul>
          <li>
            <strong><LocalizedText>Account and wallet information:</LocalizedText></strong> <LocalizedText>email address, public wallet addresses,
            wallet type, email-verification records, and authentication data. If you create a
            BBOXX-managed wallet, we store an encrypted wallet backup and the technical information
            needed to restore it.
          </LocalizedText></li>
          <li>
            <strong><LocalizedText>Profile and submission information:</LocalizedText></strong> <LocalizedText>your name or username, biography,
            location, links, contact details, images, app listings, funding information, and other
            content you choose to provide.
          </LocalizedText></li>
          <li>
            <strong><LocalizedText>Community activity:</LocalizedText></strong> <LocalizedText>reviews, ratings, comments, signatures, ownership
            claims, and other interactions with the registry.
          </LocalizedText></li>
          <li>
            <strong><LocalizedText>Technical information:</LocalizedText></strong> <LocalizedText>IP address, browser and device details, request
            logs, error data, and local browser storage used to keep you signed in and remember
            preferences.
          </LocalizedText></li>
        </ul>
        <p>
          <LocalizedText>Please do not send us a seed phrase or private key. Wallet extensions sign transactions
          without intentionally sharing those secrets with BBOXX.
        </LocalizedText></p>
      </>
    ),
  },
  {
    title: 'How we use information',
    content: (
      <>
        <p><LocalizedText>We use information to:</LocalizedText></p>
        <ul>
          <li><LocalizedText>provide, secure, maintain, and improve BBOXX;</LocalizedText></li>
          <li><LocalizedText>create accounts, verify emails, and restore encrypted BBOXX-managed wallets;</LocalizedText></li>
          <li><LocalizedText>publish profiles, app records, reviews, and other content you ask us to publish;</LocalizedText></li>
          <li><LocalizedText>process submissions, ownership claims, funding activity, and support requests;</LocalizedText></li>
          <li><LocalizedText>detect fraud, abuse, security incidents, and violations of our terms; and</LocalizedText></li>
          <li><LocalizedText>send service messages and, where you opt in, product or marketing updates.</LocalizedText></li>
        </ul>
      </>
    ),
  },
  {
    title: 'Public and decentralized data',
    content: (
      <p>
        <LocalizedText>BBOXX is an open software registry. Public wallet addresses, public profiles, listings,
        reviews, comments, transaction data, and content published to Bitcoin, other public
        blockchains, or IPFS may be visible worldwide. Blockchain and distributed-storage records
        may be permanent and may not be removable by BBOXX. Do not publish personal information you
        want to keep private.
      </LocalizedText></p>
    ),
  },
  {
    title: 'When we share information',
    content: (
      <>
        <p>
          <LocalizedText>We do not sell personal information. We may disclose it to vendors that help operate the
          service, including hosting and database, file storage, email-delivery, wallet-connection,
          and blockchain infrastructure providers. These currently include Vercel, Supabase,
          Pinata/IPFS, Resend, and providers selected when you connect a wallet.
        </LocalizedText></p>
        <p>
          <LocalizedText>We may also disclose information when required by law, to protect people or the service,
          to investigate abuse, or as part of a merger, financing, acquisition, or transfer of the
          project. Information you make public is available to anyone.
        </LocalizedText></p>
      </>
    ),
  },
  {
    title: 'Storage, retention, and security',
    content: (
      <>
        <p>
          <LocalizedText>Information may be processed in countries other than your own. We retain it for as long
          as needed to provide BBOXX, meet legal and security obligations, resolve disputes, and
          enforce agreements. Retention periods vary by the type of record. Public blockchain and
          IPFS data may remain available indefinitely.
        </LocalizedText></p>
        <p>
          <LocalizedText>We use reasonable administrative and technical safeguards, including encryption for
          BBOXX-managed wallet backups. No online system is completely secure. You are responsible
          for protecting your password, devices, wallet credentials, and recovery phrase.
        </LocalizedText></p>
      </>
    ),
  },
  {
    title: 'Your choices and rights',
    content: (
      <>
        <p>
          <LocalizedText>You can edit profile fields and communication preferences in your settings, disconnect
          your wallet, or clear BBOXX browser data through your browser. Depending on where you live,
          you may also have rights to access, correct, delete, restrict, or receive a copy of your
          personal information, or object to certain processing.
        </LocalizedText></p>
        <p>
          <LocalizedText>To make a privacy request, email us using the address below. We may need to verify your
          identity or control of the relevant wallet. We cannot erase records controlled by a
          public blockchain, IPFS, or an independent third party.
        </LocalizedText></p>
      </>
    ),
  },
  {
    title: 'Children',
    content: (
      <p>
        <LocalizedText>BBOXX is not directed to children under 13, and we do not knowingly collect their personal
        information. If you believe a child has provided personal information, please contact us.
      </LocalizedText></p>
    ),
  },
  {
    title: 'Changes to this policy',
    content: (
      <p>
        <LocalizedText>We may update this policy as BBOXX evolves. We will post the revised version here and update
        the effective date. Material changes may also be announced through the service.
      </LocalizedText></p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
        <header className="mb-12 border-b border-border pb-8">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-orange-500"><LocalizedText>Legal</LocalizedText></p>
          <h1 className="title text-4xl font-bold tracking-tight sm:text-5xl"><LocalizedText>Privacy Policy</LocalizedText></h1>
          <p className="mt-4 text-sm text-muted-foreground"><LocalizedText>Effective July 9, 2026</LocalizedText></p>
          <p className="mt-6 text-base leading-7 text-muted-foreground">
            <LocalizedText>This policy explains how BBOXX, developed and maintained by</LocalizedText>{' '}
            <Link className="text-foreground underline underline-offset-4" href="https://zuyux.org">
              <LocalizedText>zuyux
            </LocalizedText></Link>
            <LocalizedText>, handles information when you use bboxx.app and related BBOXX services.
          </LocalizedText></p>
        </header>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title} className="space-y-4">
              <h2 className="title text-2xl font-semibold">{section.title}</h2>
              <div className="space-y-4 text-[15px] leading-7 text-muted-foreground [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
                {section.content}
              </div>
            </section>
          ))}

          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="title text-2xl font-semibold"><LocalizedText>Contact us</LocalizedText></h2>
            <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
              <LocalizedText>Questions or privacy requests can be sent to</LocalizedText>{' '}
              <Link
                className="font-medium text-foreground underline underline-offset-4"
                href="mailto:40230@pm.me"
              >
                <LocalizedText>40230@pm.me
              </LocalizedText></Link>
              <LocalizedText>. You can also report an issue through the</LocalizedText>{' '}
              <Link
                className="font-medium text-foreground underline underline-offset-4"
                href="https://github.com/zuyux/bbox/issues"
              >
                <LocalizedText>BBOXX GitHub repository
              </LocalizedText></Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
