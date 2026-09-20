import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-shell px-6 py-24">
      <h1 className="text-display-l text-primary">Not found</h1>
      <p className="mt-4 max-w-prose text-body text-secondary">
        That workflow id or collection code is not in the index. Ids look like{' '}
        <code className="rounded-token bg-inset px-1.5 py-0.5 font-mono text-micro">
          F-F_animal-rescue-clip_anamorphic-wide-pass-4shot-eterna
        </code>{' '}
        — collection letter, then the source filename.
      </p>
      <div className="mt-6 flex gap-2">
        <Link
          href="/browse"
          className="inline-flex h-10 items-center rounded-card bg-ember px-4 text-small font-semibold text-canvas"
        >
          Browse the library
        </Link>
        <Link
          href="/categories"
          className="inline-flex h-10 items-center rounded-card border border-edge-subtle px-4 text-small text-secondary hover:border-edge-strong hover:text-primary"
        >
          All collections
        </Link>
      </div>
    </div>
  );
}
