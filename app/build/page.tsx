
import { LocalizedText } from '@/components/LocalizedText';
import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Build on Bitcoin | BBOXX',
  description: 'Curated launchpad for Bitcoin Layer 1 and Layer 2 developer documentation, SDKs, and sandboxes.'
};

const l1Resources = [
  {
    title: 'Bitcoin Developer Guide',
    description: 'Canonical walkthrough of nodes, consensus, transaction relay, and wallet internals direct from Bitcoin.org.',
    href: 'https://developer.bitcoin.org/devguide/'
  },
  {
    title: 'Bitcoin Core RPC & REST',
    description: 'Reference for every Core RPC call, config flag, and REST endpoint with usage notes and examples.',
    href: 'https://bitcoincore.org/en/doc/latest/'
  },
  {
    title: 'BIPs Catalog',
    description: 'All Bitcoin Improvement Proposals (BIPs) covering consensus upgrades, wallet standards, and best practices.',
    href: 'https://github.com/bitcoin/bips'
  },
  {
    title: 'Mastering Bitcoin',
    description: 'The open-source O’Reilly book that explains Bitcoin from keys to scripts to network propagation.',
    href: 'https://github.com/bitcoinbook/bitcoinbook'
  }
];

const l2Resources = [
  {
    title: 'Lightning Protocol Spec (BOLTs)',
    description: 'Detailed requirements for channel negotiation, onion routing, invoices, and gossip propagation.',
    href: 'https://github.com/lightning/bolts'
  },
  {
    title: 'LND Developer Docs',
    description: 'gRPC/REST APIs, Macaroon auth, and sample workflows for building services on top of LND.',
    href: 'https://api.lightning.community/'
  },
  {
    title: 'Core Lightning Guide',
    description: 'Plugin system, commando RPC, and scalable node deployments for CLN.',
    href: 'https://docs.corelightning.org/'
  },
  {
    title: 'RGB & Taproot Assets',
    description: 'Client-side smart contract frameworks for issuing assets over Bitcoin and Lightning.',
    href: 'https://rgb.tech/docs/'
  }
];

const toolkits = [
  {
    title: 'Bitcoin Dev Kit (BDK)',
    description: 'Rust-based wallet toolkit with descriptors, Miniscript, and hardware signer integrations.',
    href: 'https://bitcoindevkit.org/'
  },
  {
    title: 'Lightning Dev Kit (LDK)',
    description: 'Modular Lightning node stack for mobile and server apps, written in Rust.',
    href: 'https://lightningdevkit.org/'
  },
  {
    title: 'Stacks Documentation',
    description: 'Build smart contracts that settle on Bitcoin using Clarity and the Stacks L2.',
    href: 'https://docs.stacks.co/'
  },
  {
    title: 'Fedimint Docs',
    description: 'Federated Chaumian mints for community custody, with Lightning gateways and module SDK.',
    href: 'https://fedimint.org/docs/'
  }
];

const ResourceGrid = ({ title, blurb, items }: { title: string; blurb: string; items: typeof l1Resources }) => (
  <section className="mb-16">
    <div className="mb-6 text-center md:text-left">
      <p className="text-sm uppercase tracking-[0.4em] text-orange-500 mb-2">{title}</p>
      <p className="text-muted-foreground text-base max-w-2xl">{blurb}</p>
    </div>
    <div className="grid gap-6 md:grid-cols-2">
      {items.map(resource => (
        <Card key={resource.title} className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">{resource.title}</CardTitle>
            <CardDescription>{resource.description}</CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
            <Button variant="ghost" className="px-0" asChild>
              <Link href={resource.href} target="_blank" rel="noreferrer">
                <LocalizedText>View docs
                </LocalizedText><ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  </section>
);

export default function BuildPage() {
  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 pt-16 pb-20">
        <section className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.35em] text-orange-500 mb-4"><LocalizedText>Start Building</LocalizedText></p>
          <h1 className="title text-4xl md:text-5xl font-bold mb-6"><LocalizedText>Everything You Need to Ship Sovereign Software</LocalizedText></h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            <LocalizedText>Start with the Bitcoin Layer 1 and Layer 2 foundations that anchor BBOXX, then extend into the wallets,
            protocols, scaling systems, and SDKs that power production sovereign apps.
          </LocalizedText></p>
        </section>

        <ResourceGrid
          title="Layer 1 Foundations"
          blurb="Consensus, transactions, mempool policy, and node-level APIs to ground every project in Bitcoin’s base layer."
          items={l1Resources}
        />

        <ResourceGrid
          title="Layer 2 Playbooks"
          blurb="Move fast above the base layer with Lightning, smart contract rollups, and federated systems tuned for UX."
          items={l2Resources}
        />

        <section className="mb-20">
          <div className="mb-6 text-center md:text-left">
            <p className="text-sm uppercase tracking-[0.4em] text-orange-500 mb-2"><LocalizedText>Toolkits & Sandboxes</LocalizedText></p>
            <p className="text-muted-foreground text-base max-w-2xl">
              <LocalizedText>Production-ready SDKs and reference stacks that plug directly into BBOXX submissions and milestone reviews.
            </LocalizedText></p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {toolkits.map(resource => (
              <Card key={resource.title} className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-xl">{resource.title}</CardTitle>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>
                <CardFooter className="pt-0">
                  <Button variant="ghost" className="px-0" asChild>
                    <Link href={resource.href} target="_blank" rel="noreferrer">
                      <LocalizedText>Open resource
                      </LocalizedText><ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        <section className="text-center">
          <Card className="border border-dashed border-orange-500 bg-gradient-to-r from-orange-500/5 via-transparent to-yellow-500/10">
            <CardHeader>
              <CardTitle className="text-2xl"><LocalizedText>Share Your Favorite Stack</LocalizedText></CardTitle>
              <CardDescription>
                <LocalizedText>Missing a guide or SDK? Let us know so every builder hitting /build lands on the most current map of sovereign software infrastructure.
              </LocalizedText></CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link href="mailto:team@bboxx.app"><LocalizedText>Submit a resource</LocalizedText></Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
