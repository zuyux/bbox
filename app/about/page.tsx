import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-4">About BBOX</h1>
      <p className="mb-4">
        <strong>BBOX</strong> is an open-source project designed to empower creators and developers with decentralized tools for publishing, funding, and collaboration. The platform leverages blockchain technology to provide secure, transparent, and censorship-resistant infrastructure for digital content and applications.
      </p>
      <p className="mb-4">
        BBOX is developed and maintained by <strong>zuyux</strong>, an IT R&amp;D Lab based in Peru, dedicated to building innovative solutions for the decentralized web.
      </p>
      <p className="mb-4">
        This project received a grant from the <strong>Stacks Foundation</strong> through the <a href="https://degrants.xyz/" target="_blank" rel="noopener noreferrer" className="underline">degrants.xyz</a> initiative in October 2025, supporting its mission to advance open-source and decentralized technologies.
      </p>
      <p className="mb-4">
        You can explore the source code, contribute, or report issues on our GitHub repository:
        <br />
        <a href="https://github.com/zuyux/bbox" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">github.com/zuyux/bbox</a>
      </p>
      <p className="text-sm text-gray-500 mt-8">
        &copy; {new Date().getFullYear()} zuyux IT R&amp;D Lab, Peru. All rights reserved.
      </p>
    </main>
  );
}
