import Image from "next/image";

export function BrandMark({ className = "h-12 w-12" }: { className?: string }) {
  return <Image src="/icons/luo-heritage.svg" alt="" width={64} height={64} className={`shrink-0 rounded-2xl ${className}`} />;
}
