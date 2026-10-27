export function BrandMark({ src = "/icons/luo-heritage-512.png" }: { src?: string }) {
  return <img src={src} width={56} height={56} alt="" aria-hidden="true" className="h-12 w-12 shrink-0 rounded-xl object-contain md:h-14 md:w-14" decoding="async" />;
}
