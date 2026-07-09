import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | BBOX',
  description: 'How BBOX collects, uses, shares, and protects information.',
};

const sections = [
  {
    title: 'Information we collect',
    content: (
      <>
        <p>Depending on how you use BBOX, we may collect:</p>
        <ul>
          <li>
            <strong>Account and wallet information:</strong> email address, public wallet addresses,
            wallet type, email-verification records, and authentication data. If you create a
            BBOX-managed wallet, we store an encrypted wallet backup and the technical information
            needed to restore it.
          </li>
          <li>
            <strong>Profile and submission information:</strong> your name or username, biography,
            location, links, contact details, images, app listings, funding information, and other
            content you choose to provide.
          </li>
          <li>
            <strong>Community activity:</strong> reviews, ratings, comments, signatures, ownership
            claims, and other interactions with the registry.
          </li>
          <li>
            <strong>Technical information:</strong> IP address, browser and device details, request
            logs, error data, and local browser storage used to keep you signed in and remember
            preferences.
          </li>
        </ul>
        <p>
          Please do not send us a seed phrase or private key. Wallet extensions sign transactions
          without intentionally sharing those secrets with BBOX.
        </p>
      </>
    ),
  },
  {
    title: 'How we use information',
    content: (
      <>
        <p>We use information to:</p>
        <ul>
          <li>provide, secure, maintain, and improve BBOX;</li>
          <li>create accounts, verify emails, and restore encrypted BBOX-managed wallets;</li>
          <li>publish profiles, app records, reviews, and other content you ask us to publish;</li>
          <li>process submissions, ownership claims, funding activity, and support requests;</li>
          <li>detect fraud, abuse, security incidents, and violations of our terms; and</li>
          <li>send service messages and, where you opt in, product or marketing updates.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Public and decentralized data',
    content: (
      <p>
        BBOX is an open software registry. Public wallet addresses, public profiles, listings,
        reviews, comments, transaction data, and content published to Bitcoin, other public
        blockchains, or IPFS may be visible worldwide. Blockchain and distributed-storage records
        may be permanent and may not be removable by BBOX. Do not publish personal information you
        want to keep private.
      </p>
    ),
  },
  {
    title: 'When we share information',
    content: (
      <>
        <p>
          We do not sell personal information. We may disclose it to vendors that help operate the
          service, including hosting and database, file storage, email-delivery, wallet-connection,
          and blockchain infrastructure providers. These currently include Vercel, Supabase,
          Pinata/IPFS, Resend, and providers selected when you connect a wallet.
        </p>
        <p>
          We may also disclose information when required by law, to protect people or the service,
          to investigate abuse, or as part of a merger, financing, acquisition, or transfer of the
          project. Information you make public is available to anyone.
        </p>
      </>
    ),
  },
  {
    title: 'Storage, retention, and security',
    content: (
      <>
        <p>
          Information may be processed in countries other than your own. We retain it for as long
          as needed to provide BBOX, meet legal and security obligations, resolve disputes, and
          enforce agreements. Retention periods vary by the type of record. Public blockchain and
          IPFS data may remain available indefinitely.
        </p>
        <p>
          We use reasonable administrative and technical safeguards, including encryption for
          BBOX-managed wallet backups. No online system is completely secure. You are responsible
          for protecting your password, devices, wallet credentials, and recovery phrase.
        </p>
      </>
    ),
  },
  {
    title: 'Your choices and rights',
    content: (
      <>
        <p>
          You can edit profile fields and communication preferences in your settings, disconnect
          your wallet, or clear BBOX browser data through your browser. Depending on where you live,
          you may also have rights to access, correct, delete, restrict, or receive a copy of your
          personal information, or object to certain processing.
        </p>
        <p>
          To make a privacy request, email us using the address below. We may need to verify your
          identity or control of the relevant wallet. We cannot erase records controlled by a
          public blockchain, IPFS, or an independent third party.
        </p>
      </>
    ),
  },
  {
    title: 'Children',
    content: (
      <p>
        BBOX is not directed to children under 13, and we do not knowingly collect their personal
        information. If you believe a child has provided personal information, please contact us.
      </p>
    ),
  },
  {
    title: 'Changes to this policy',
    content: (
      <p>
        We may update this policy as BBOX evolves. We will post the revised version here and update
        the effective date. Material changes may also be announced through the service.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
        <header className="mb-12 border-b border-border pb-8">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-orange-500">Legal</p>
          <h1 className="title text-4xl font-bold tracking-tight sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-sm text-muted-foreground">Effective July 9, 2026</p>
          <p className="mt-6 text-base leading-7 text-muted-foreground">
            This policy explains how BBOX, developed and maintained by{' '}
            <Link className="text-foreground underline underline-offset-4" href="https://zuyux.org">
              zuyux
            </Link>
            , handles information when you use bbox.lol and related BBOX services.
          </p>
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
            <h2 className="title text-2xl font-semibold">Contact us</h2>
            <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
              Questions or privacy requests can be sent to{' '}
              <Link
                className="font-medium text-foreground underline underline-offset-4"
                href="mailto:40230@pm.me"
              >
                40230@pm.me
              </Link>
              . You can also report an issue through the{' '}
              <Link
                className="font-medium text-foreground underline underline-offset-4"
                href="https://github.com/zuyux/bbox/issues"
              >
                BBOX GitHub repository
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
