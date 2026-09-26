"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 to-amber-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-serif text-red-600 mb-4">Oops</h1>
        <h2 className="text-2xl font-serif text-stone-800 mb-4">
          Something went wrong
        </h2>
        <p className="text-stone-600 mb-8">
          We are sorry for the inconvenience. Please try again.
        </p>
        <button
          onClick={reset}
          className="bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition"
        >
          Try again
        </button>
      </div>
    </main>
  );
}