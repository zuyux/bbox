import { LocalizedText } from '@/components/LocalizedText';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | BBOX',
  description: 'The terms that apply when you access or use BBOX.',
};

const sections = [
  {
    title: 'Using BBOX',
    content: (
      <>
        <p>
          <LocalizedText>You may use BBOX only if you can legally enter into this agreement and your use is permitted by applicable law. If you use BBOX for an organization, you represent that you have authority to accept these terms for it.</LocalizedText>
        </p>
        <p>
          <LocalizedText>You are responsible for your devices, internet access, wallet, account credentials, recovery phrase, and all activity performed through them. Keep them secure and notify us if you believe your account or BBOX-managed wallet has been compromised.</LocalizedText>
        </p>
      </>
    ),
  },
  {
    title: 'The registry and third-party software',
    content: (
      <>
        <p>
          <LocalizedText>BBOX is a discovery and registry service for open-source software. A listing, verification mark, review, ranking, link, or other information on BBOX is not an endorsement, warranty, security audit, or promise that an app is accurate, lawful, available, or safe.</LocalizedText>
        </p>
        <p>
          <LocalizedText>Apps, wallets, websites, protocols, repositories, and other services reached through BBOX are operated by third parties under their own terms and privacy practices. You are responsible for evaluating them before installing software, connecting a wallet, signing a message or transaction, or transferring funds.</LocalizedText>
        </p>
      </>
    ),
  },
  {
    title: 'Wallets, blockchains, and transactions',
    content: (
      <>
        <p>
          <LocalizedText>Blockchain transactions are generally irreversible. Network fees, confirmation times, protocol behavior, asset values, and third-party wallet services are outside BBOX&apos;s control. Review every transaction carefully before approving it.</LocalizedText>
        </p>
        <p>
          <LocalizedText>BBOX does not provide financial, investment, legal, or tax advice and does not act as your broker, custodian, fiduciary, or financial institution. You assume the risks associated with wallets, digital assets, smart contracts, and decentralized networks.</LocalizedText>
        </p>
        <p>
          <LocalizedText>Never share a private key or recovery phrase with us. If BBOX creates an encrypted wallet backup for you, you remain responsible for preserving the information and access methods needed to recover it.</LocalizedText>
        </p>
      </>
    ),
  },
  {
    title: 'Your content and submissions',
    content: (
      <>
        <p>
          <LocalizedText>You retain ownership of content you submit. You give BBOX a worldwide, non-exclusive, royalty-free license to host, store, reproduce, adapt for formatting or accessibility, publish, display, and distribute that content as needed to operate, promote, and improve the service.</LocalizedText>
        </p>
        <p>
          <LocalizedText>You represent that you have the rights needed to submit the content, that it is accurate to the best of your knowledge, and that it does not violate law or another person&apos;s rights. You are responsible for app listings, ownership claims, reviews, comments, links, images, and other material you provide.</LocalizedText>
        </p>
        <p>
          <LocalizedText>Some submissions may be written to Bitcoin, another public blockchain, or IPFS. Those records may be public, permanent, and impossible for BBOX to edit or remove.</LocalizedText>
        </p>
      </>
    ),
  },
  {
    title: 'Acceptable use',
    content: (
      <>
        <p><LocalizedText>You must not use BBOX to:</LocalizedText></p>
        <ul>
          <li><LocalizedText>break the law, infringe intellectual-property or privacy rights, or facilitate fraud;</LocalizedText></li>
          <li><LocalizedText>publish malware, deceptive listings, false ownership claims, manipulated reviews, or harmful content;</LocalizedText></li>
          <li><LocalizedText>probe, disrupt, overload, bypass, or gain unauthorized access to the service or another user&apos;s account;</LocalizedText></li>
          <li><LocalizedText>scrape or automate access in a way that harms the service or circumvents reasonable limits; or</LocalizedText></li>
          <li><LocalizedText>misrepresent your identity, affiliation, or the source, security, licensing, or capabilities of software.</LocalizedText></li>
        </ul>
        <p>
          <LocalizedText>We may review, reject, limit, suspend, or remove content or access when reasonably necessary to protect users, enforce these terms, comply with law, or maintain the integrity of the registry. This does not guarantee that we monitor all content.</LocalizedText>
        </p>
      </>
    ),
  },
  {
    title: 'Funding and fees',
    content: (
      <p>
        <LocalizedText>Funding opportunities, grants, tips, swaps, and other transfers shown or initiated through BBOX may depend on third-party providers and blockchain networks. Unless we expressly say otherwise, BBOX is not a party to agreements between funders, developers, or other users and does not guarantee that a project, payment, reward, or funding outcome will be completed.</LocalizedText>
      </p>
    ),
  },
  {
    title: 'BBOX intellectual property',
    content: (
      <p>
        <LocalizedText>BBOX software may be made available under the license in its source-code repository. These terms do not change that license. The BBOX name, branding, site design, and service content remain protected by applicable intellectual-property laws, except for material owned by users or third parties.</LocalizedText>
      </p>
    ),
  },
  {
    title: 'Service availability and changes',
    content: (
      <p>
        <LocalizedText>We may change, suspend, or discontinue any part of BBOX, and the service may experience errors, interruptions, data loss, or security incidents. We may update these terms by posting a revised version and changing the effective date. Continued use after an update means you accept the revised terms.</LocalizedText>
      </p>
    ),
  },
  {
    title: 'Disclaimers',
    content: (
      <p>
        <LocalizedText>To the fullest extent permitted by law, BBOX is provided “as is” and “as available,” without warranties of any kind, whether express, implied, or statutory, including warranties of merchantability, fitness for a particular purpose, title, non-infringement, security, accuracy, or uninterrupted availability.</LocalizedText>
      </p>
    ),
  },
  {
    title: 'Limitation of liability',
    content: (
      <p>
        <LocalizedText>To the fullest extent permitted by law, BBOX and its developers, maintainers, contributors, and service providers will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, data, goodwill, assets, opportunities, or business interruption arising from your use of or inability to use BBOX. Where liability cannot be excluded, it is limited to the greater of US$100 or the amount you paid BBOX during the twelve months before the event giving rise to the claim.</LocalizedText>
      </p>
    ),
  },
  {
    title: 'Indemnity',
    content: (
      <p>
        <LocalizedText>To the extent permitted by law, you will defend, indemnify, and hold harmless BBOX and its developers, maintainers, and contributors from claims, losses, liabilities, and reasonable expenses arising from your content, your use of the service, your violation of these terms, or your violation of another person&apos;s rights.</LocalizedText>
      </p>
    ),
  },
  {
    title: 'General terms',
    content: (
      <p>
        <LocalizedText>If any provision is unenforceable, it will be limited to the minimum extent necessary and the remaining provisions will continue in effect. A failure to enforce a provision is not a waiver. You may not transfer these terms without our consent; we may transfer them as part of a reorganization or transfer of BBOX. These terms, together with the Privacy Policy and any additional terms presented for a feature, are the entire agreement regarding your use of BBOX.</LocalizedText>
      </p>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
        <header className="mb-12 border-b border-border pb-8">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-orange-500"><LocalizedText>Legal</LocalizedText></p>
          <h1 className="title text-4xl font-bold tracking-tight sm:text-5xl"><LocalizedText>Terms of Service</LocalizedText></h1>
          <p className="mt-4 text-sm text-muted-foreground"><LocalizedText>Effective July 22, 2026</LocalizedText></p>
          <p className="mt-6 text-base leading-7 text-muted-foreground">
            <LocalizedText>These terms govern your access to and use of BBOX, developed and maintained by</LocalizedText>{' '}
            <Link className="text-foreground underline underline-offset-4" href="https://zuyux.org">
              <LocalizedText>zuyux</LocalizedText>
            </Link>
            <LocalizedText>. By accessing or using bbox.lol or related BBOX services, you agree to these terms. If you do not agree, do not use BBOX.</LocalizedText>
          </p>
        </header>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title} className="space-y-4">
              <h2 className="title text-2xl font-semibold"><LocalizedText>{section.title}</LocalizedText></h2>
              <div className="space-y-4 text-[15px] leading-7 text-muted-foreground [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
                {section.content}
              </div>
            </section>
          ))}

          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="title text-2xl font-semibold"><LocalizedText>Contact us</LocalizedText></h2>
            <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
              <LocalizedText>Questions about these terms can be sent to</LocalizedText>{' '}
              <Link className="font-medium text-foreground underline underline-offset-4" href="mailto:40230@pm.me">
                <LocalizedText>40230@pm.me</LocalizedText>
              </Link>
              <LocalizedText>. You can also report an issue through the</LocalizedText>{' '}
              <Link className="font-medium text-foreground underline underline-offset-4" href="https://github.com/zuyux/bbox/issues">
                <LocalizedText>BBOX GitHub repository</LocalizedText>
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
