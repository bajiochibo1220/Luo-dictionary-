import Link from "next/link";

export function MaintenanceNotice({ message }: { message: string }) {
  return <main className="min-h-screen flex items-center justify-center p-8 bg-stone-50">
    <div className="max-w-xl"><h1 className="text-3xl font-serif mb-4">Library maintenance</h1>
      <p className="mb-6">{message}</p><Link href="/login" className="underline">Administrator sign in</Link></div>
  </main>;
}
