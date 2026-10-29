"use client";
import { Component, type ReactNode } from "react";
import { InterfaceText } from "./interface-language";

/** Keep navigation usable when a downloaded screen fails to load or render. */
export class ScreenBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div role="alert" className="space-y-4 p-5 text-stone-900">
      <p><InterfaceText source="This screen could not load. Check your connection and try again." /></p>
      <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-full bg-teal-800 px-5 py-2 font-semibold text-white"><InterfaceText source="Try again" /></button>
    </div>;
  }
}
