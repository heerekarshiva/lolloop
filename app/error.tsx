'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight">Oops, that glitched</h1>
      <p className="mt-2 font-semibold opacity-70">Your scores are safe on this device.</p>
      <button onClick={reset} className="mt-6 rounded-full bg-marigold px-7 py-3.5 font-bold">Try again</button>
    </main>
  );
}
