"use client";
import { InterfaceText } from "./interface-language";

export function AccountRequired({ onSignIn, message = "Sign in to use this part of your account. You can keep browsing the public library freely." }: { onSignIn?: () => void; message?: string }) {
  return <section className="mx-auto max-w-xl space-y-4 p-5 text-stone-900"><h1 className="font-serif text-2xl"><InterfaceText source="Continue with your account" /></h1><p><InterfaceText source={message} /></p>{onSignIn ? <button type="button" onClick={onSignIn} className="inline-flex min-h-11 items-center rounded-lg bg-teal-900 px-5 text-sm font-semibold text-white"><InterfaceText source="Sign in" /></button> : <a href="/login" className="inline-flex min-h-11 items-center rounded-lg bg-teal-900 px-5 text-sm font-semibold text-white"><InterfaceText source="Sign in" /></a>}</section>;
}
