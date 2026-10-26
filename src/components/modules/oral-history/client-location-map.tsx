"use client";
import { InterfaceText } from "@/components/shared/interface-language";

import dynamic from "next/dynamic";

export const ClientLocationMap = dynamic(
  () => import("./location-map").then(module => module.LocationMap),
  { ssr: false, loading: () => <div className="h-80 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 text-sm"><InterfaceText source="Loading map..." /></div> }
);
