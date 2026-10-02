"use client";

import dynamic from "next/dynamic";

const SitesMap = dynamic(
  () => import("@/components/modules/heritage-sites/sites-map").then((module) => module.SitesMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] rounded-xl border border-stone-200 bg-stone-100 flex items-center justify-center text-sm text-stone-500">
        Loading heritage sites map...
      </div>
    ),
  }
);

export function SitesMapLoader(props: React.ComponentProps<typeof SitesMap>) {
  return <SitesMap {...props} />;
}
