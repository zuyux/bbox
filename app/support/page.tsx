"use client";

export default function SupportPage() {

  return (
    <div className="max-w-2xl mx-auto my-24 p-8 bg-surface-primary rounded-2xl border-[1px] border-border shadow text-foreground">
      <h1 className="text-3xl font-bold mb-8">Support</h1>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Contact Us</h2>
        <p className="text-muted-foreground mb-2">
          For help, questions, or feedback, email us at{" "}
          <a href="mailto:40230@pm.me" className="text-blue-400 hover:underline">
            40230@pm.me
          </a>
        </p>
        <p className="text-muted-foreground text-sm">
          We usually respond within 24 hours.
        </p>
      </div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">FAQ</h2>
        <ul className="text-muted-foreground text-sm space-y-2">
          <li>
            <span className="font-semibold text-foreground">How do I reset my password?</span>
            <br />
            Go to <span className="text-blue-400">Settings &gt; Change Password</span>.
          </li>
          <li>
            <span className="font-semibold text-foreground">How do I contact support?</span>
            <br />
            Use the form below or email us directly.
          </li>
          <li>
            <span className="font-semibold text-foreground">Where can I find documentation?</span>
            <br />
            Visit our <a href="https://bbox.app/docs" className="text-blue-400 hover:underline">documentation page</a>.
          </li>
        </ul>
      </div>
    </div>
  );
}
