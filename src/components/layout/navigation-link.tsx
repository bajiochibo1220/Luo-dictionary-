"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function PendingIndicator() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span role="status" aria-label="Loading page" className="ml-2 inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

export function NavigationLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props}>{children}<PendingIndicator /></Link>;
}
