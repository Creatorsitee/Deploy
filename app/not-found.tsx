import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] text-neutral-900 px-6">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold tracking-tighter">404</h1>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-600">Page not found</h2>
        <p className="text-sm text-neutral-500 max-w-xs mx-auto">
          The project or page you are looking for does not exist or has been moved.
        </p>
        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-neutral-950 px-6 text-xs font-semibold text-white transition hover:bg-neutral-800 active:scale-95 shadow-sm"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
