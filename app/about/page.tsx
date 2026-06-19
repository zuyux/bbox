import Link from "next/link";
import Image from "next/image";

export default function AboutPage() {
  return (
    <main className="max-w-2xl mx-auto py-36 px-4">
      <h1 className="title text-3xl font-bold mb-4">What is BBOX?</h1>
      <p className="mb-4">
        <strong>BBOX</strong> is a universal registry for verified open-source software. It helps developers publish, fund, and coordinate high-integrity apps across Bitcoin, other chains, privacy tooling, developer utilities, safe AI, and independent off-chain software.
      </p>
      <p className="mb-4">
        BBOX anchors canonical app records through the Bitcoin App Registry protocol, giving publishers control over their metadata while preserving a public audit trail on Bitcoin Layer 1.
      </p>
      <p className="mb-4">
        BBOX is developed and maintained by <Link href="https://zuyux.org" className="hover:underline"><strong>zuyux</strong></Link>, an IT R&amp;D Lab based in Peru, dedicated to building innovative solutions for the decentralized web.
      </p>
      <p className="mb-4">
        This project received a grant from the <strong>Stacks Foundation</strong> through the <a href="https://degrants.xyz/" target="_blank" rel="noopener noreferrer" className="underline">degrants.xyz</a> initiative in October 2025, supporting its mission to advance open-source and decentralized technologies.
      </p>
      <p className="mb-4">
        You can explore the source code, contribute, or report issues on our GitHub repository:
        <br />
        <Link href="https://github.com/zuyux/bbox">
            <Image src="/github.svg" height={18} width={18} alt="" className="invert my-12" />
        </Link>
      </p>
    </main>
  );
}
