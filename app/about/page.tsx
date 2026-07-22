
import { LocalizedText } from "@/components/LocalizedText";
import Link from "next/link";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto py-36 px-4">
      <h1 className="title text-3xl font-bold mb-4"><LocalizedText>What is BBOX?</LocalizedText></h1>
      <p className="mb-4">
        <strong><LocalizedText>BBOX</LocalizedText></strong> <LocalizedText>is a universal registry for verified open-source software. It helps people discover, compare, fund, and coordinate high-integrity apps across Bitcoin, other chains, privacy tooling, safe AI, and independent off-chain software.
      </LocalizedText></p>
      <p className="mb-4">
        <LocalizedText>BBOX anchors canonical app records through the Bitcoin App Registry protocol, giving publishers control over their metadata while preserving a public audit trail on Bitcoin Layer 1.
      </LocalizedText></p>
      <p className="mb-4">
        <LocalizedText>BBOX is developed and maintained by </LocalizedText><Link href="https://zuyux.org" className="hover:underline"><strong><LocalizedText>zuyux</LocalizedText></strong></Link><LocalizedText>, an IT R&amp;D Lab based in Peru, dedicated to building innovative solutions for the decentralized web.
      </LocalizedText></p>
      <p className="mb-4">
        <LocalizedText>This project received a grant from the </LocalizedText><strong><LocalizedText>Stacks Foundation</LocalizedText></strong> <LocalizedText>through the </LocalizedText><a href="https://degrants.xyz/" target="_blank" rel="noopener noreferrer" className="underline"><LocalizedText>degrants.xyz</LocalizedText></a> <LocalizedText>initiative in October 2025, supporting its mission to advance open-source and decentralized technologies.
      </LocalizedText></p>
      <p className="mb-4">
        <LocalizedText>You can explore the source code, contribute, or report issues on our GitHub repository:
        </LocalizedText><br />
        <Link href="https://github.com/zuyux/bbox">
            <Image src="/github.svg" height={18} width={18} alt="" className="invert my-12" />
        </Link>
      </p>
    </div>
  );
}
