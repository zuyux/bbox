
import { LocalizedText } from "@/components/LocalizedText";
import Link from "next/link";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto py-36 px-4">
      <h1 className="title text-3xl font-bold mb-4"><LocalizedText>What is BBOXX?</LocalizedText></h1>
      <p className="mb-4">
        <strong><LocalizedText>BBOXX</LocalizedText></strong> <LocalizedText>is a universal registry for verified open-source software. It helps people discover, compare, fund, and coordinate high-integrity apps across Bitcoin, privacy tooling, safe AI, and independent off-chain software.
      </LocalizedText></p>
      <p className="mb-4">
        <LocalizedText>BBOXX anchors canonical app records through the Bitcoin App Registry protocol, giving publishers control over their metadata while preserving a public audit trail on Bitcoin Layer 1.
      </LocalizedText></p>
      <p className="mb-4">
        <LocalizedText>BBOXX is developed and maintained by </LocalizedText><Link href="https://zuyux.xyz" className="hover:underline"><strong><LocalizedText>zuyux</LocalizedText></strong></Link><LocalizedText>, an IT R&amp;D Lab based in Peru, dedicated to building innovative solutions for the decentralized web.
      </LocalizedText></p>
      <p className="mb-4">
        <LocalizedText>This project received a grant from the </LocalizedText><strong><LocalizedText>Stacks Foundation</LocalizedText></strong> <LocalizedText>through the </LocalizedText><a href="https://degrants.xyz/" target="_blank" rel="noopener noreferrer" className="underline"><LocalizedText>degrants.xyz</LocalizedText></a> <LocalizedText>initiative in October 2025, supporting its mission to advance open-source and decentralized technologies.
      </LocalizedText></p>
      <p className="mb-4">
        <Link href="/documentation" className="font-semibold text-accent underline underline-offset-4">
          BBOXX <LocalizedText>Documentation</LocalizedText>
        </Link>
      </p>
      <p className="mb-4">
        <LocalizedText>Follow BBOXX on Nostr:</LocalizedText><br />
        <Link
          href="https://njump.me/npub1q2puy4swyp723h4guxl7ee9qm33t0glnvhd7tquuer5lwvt29euqatvt6k"
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-medium text-accent underline underline-offset-4"
        >
          npub1q2puy4swyp723h4guxl7ee9qm33t0glnvhd7tquuer5lwvt29euqatvt6k
        </Link>
      </p>
      <div className="mt-8 flex items-center gap-4">
        <Link
          href="https://x.com/bboxxapp"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="BBOXX on X"
          title="BBOXX on X"
          className="text-foreground opacity-70 transition-opacity hover:opacity-100"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
            focusable="false"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.967 6.817H1.68l7.73-8.835L1.254 2.25h6.826l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
          </svg>
        </Link>
        <Link
          href="https://github.com/zuyux/bbox"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="BBOXX on GitHub"
          title="BBOXX on GitHub"
          className="opacity-70 transition-opacity hover:opacity-100"
        >
          <Image src="/github.svg" height={20} width={20} alt="" className="dark:invert" />
        </Link>
      </div>
    </div>
  );
}
