import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 to-amber-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-serif text-amber-600 mb-4">404</h1>
        <h2 className="text-2xl font-serif text-stone-800 mb-4">
          Page not found
        </h2>
        <p className="text-stone-600 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}