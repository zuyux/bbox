
import { LocalizedText } from '@/components/LocalizedText';
import Link from 'next/link';
import { Metadata } from 'next';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'BBOX Documentation',
  description: 'Learn what BBOX is, how it works, and how to contribute to the universal registry for verified software.'
};

const sections = [
  {
    title: 'Funding Transparency',
    body: 'Milestones, escrow, and community reporting make it clear how every satoshi is allocated.'
  },
  {
    title: 'Open Discovery',
    body: 'Browse verified, community-reviewed open-source apps with rich metadata and direct source links.'
  },
  {
    title: 'Readable App Records',
    body: 'Review source links, publisher identity, funding context, and app metadata from one place.'
  }
];

const howItWorks = [
  {
    step: '1',
    title: 'List your app',
    detail: 'Publish a profile with images, repositories, and live demos so funders can understand your roadmap.'
  },
  {
    step: '2',
    title: 'Define milestones',
    detail: 'Break work into reviewable checkpoints. BBOX escrow protects both publishers and funders.'
  },
  {
    step: '3',
    title: 'Ship and verify',
    detail: 'Upload proofs, receive community validation, and unlock funds once milestones are approved.'
  }
];

export default function DocumentationPage() {
  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 pt-16 pb-20">
        <section className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.35em] text-orange-500 mb-4"><LocalizedText>Documentation</LocalizedText></p>
          <h1 className="title text-4xl md:text-5xl font-bold mb-6"><LocalizedText>BBOX in Plain English</LocalizedText></h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            <LocalizedText>BBOX is an open, community-run registry for verified software. It combines discovery, on-chain reputation,
            and milestone-based funding so useful open-source projects get attention and publishers remain accountable.
          </LocalizedText></p>
        </section>

        <section className="grid gap-6 md:grid-cols-3 mb-20">
          {sections.map(({ title, body }) => (
            <article key={title} className="border border-border rounded-2xl p-6 bg-card">
              <h2 className="title text-xl font-semibold mb-2">{title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
            </article>
          ))}
        </section>

        <section className="mb-20">
          <div className="border border-border rounded-3xl px-6 sm:px-10 py-12 bg-card">
            <h2 className="title text-3xl font-bold mb-8 text-center"><LocalizedText>How BBOX Works</LocalizedText></h2>
            <div className="grid gap-8 md:grid-cols-3">
              {howItWorks.map(({ step, title, detail }) => (
                <article key={title} className="text-center">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 font-semibold mb-4">
                    {step}
                  </span>
                  <h3 className="text-lg font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-20">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="border border-border rounded-2xl p-8 bg-card">
              <h2 className="title text-2xl font-semibold mb-4"><LocalizedText>For Publishers</LocalizedText></h2>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><LocalizedText>• Showcase apps with media assets, repos, and milestone history.</LocalizedText></li>
                <li><LocalizedText>• Connect verified wallets and identities to earn trust.</LocalizedText></li>
                <li><LocalizedText>• Receive staged payouts once reviewers confirm delivery.</LocalizedText></li>
              </ul>
              <Button className="mt-6 bg-orange-500 hover:bg-orange-600" asChild>
                <Link href="/settings#developer-mode"><LocalizedText>Open Developer Mode</LocalizedText></Link>
              </Button>
            </div>
            <div className="border border-border rounded-2xl p-8 bg-card">
              <h2 className="title text-2xl font-semibold mb-4"><LocalizedText>For Funders</LocalizedText></h2>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><LocalizedText>• Track milestone progress and escrow balances in real time.</LocalizedText></li>
                <li><LocalizedText>• Filter apps by category, traction, or verification status.</LocalizedText></li>
                <li><LocalizedText>• Support teams publicly or privately with multisig payouts.</LocalizedText></li>
              </ul>
              <Button variant="default" className="mt-6" asChild>
                <Link href="/apps"><LocalizedText>Explore Apps</LocalizedText></Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="text-center">
          <h2 className="title text-3xl font-bold mb-4"><LocalizedText>Need Something Else?</LocalizedText></h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            <LocalizedText>This page focuses on the big picture. For SDKs, API references, or integration guides, reach out and we will share the latest builds.
          </LocalizedText></p>
          <Button variant="ghost" asChild>
            <Link href="mailto:40230@pm.me"><LocalizedText>Email the BBOX Team</LocalizedText></Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
