"use client";
import { InterfaceText } from "@/components/shared/interface-language";

import type { AppAccount, ConversationHistory } from "@/lib/account-contract";

export function AccountHistoryView({ account, history, archived, loading, error, onArchivedChange, onRetry, onOpenChat }: {
  account: AppAccount; history: ConversationHistory; archived: boolean; loading: boolean; error: string;
  onArchivedChange: (value: boolean) => void; onRetry: () => void;
  onOpenChat?: (id: string) => void;
}) {
  return <section className="mx-auto max-w-3xl space-y-6 px-5 py-8 sm:px-8">
    <div className="workspace-heading"><h1 className="font-serif text-3xl"><InterfaceText source="My account" /></h1><p className="mt-2">{account.name || account.email}</p><p className="text-sm text-stone-700">{account.email}</p></div>
    <div className="rounded-2xl bg-white/90 p-5"><h2 className="font-serif text-xl"><InterfaceText source="My access" /></h2>
      {account.isSuperAdmin && <p className="mt-2"><InterfaceText source={account.isMasterSuperAdmin ? "Master Super Admin" : "Super Admin"} /></p>}
      {account.languageRoles.length ? <ul className="mt-2 space-y-1">{account.languageRoles.map(role => <li key={`${role.languageId}:${role.role}`}>{role.languageName}: {role.role.replace(/_/g, " ")}</li>)}</ul> : <p className="mt-2"><InterfaceText source="Community member" /></p>}
    </div>
    <div className="rounded-2xl bg-white/90 p-5">
      <h2 className="font-serif text-2xl"><InterfaceText source="Saved chats" /></h2>
      <p className="mt-2 text-sm text-stone-600"><InterfaceText source="Your saved chats use the same account on every device." /></p>
      <div className="my-4 flex gap-2" role="group" aria-label="Chat history filter">
        {[false, true].map(value => <button key={String(value)} type="button" aria-pressed={archived === value} onClick={() => onArchivedChange(value)} className={`rounded-full px-4 py-2 text-sm ${archived === value ? "bg-[#6b4724] text-white" : "bg-stone-100 text-stone-800"}`}><InterfaceText source={value ? "Archived" : "Recent"} /></button>)}
      </div>
      {loading ? <p role="status"><InterfaceText source="Loading saved chats…" /></p> : error ? <div role="alert"><p>{error}</p><button type="button" className="mt-3 underline" onClick={onRetry}><InterfaceText source="Try again" /></button></div>
        : history.length ? <ul className="divide-y divide-stone-200">{history.map(chat => <li key={chat.id} className="py-3"><p className="font-medium">{onOpenChat ? <button type="button" className="text-left underline decoration-amber-800/40 underline-offset-4" onClick={() => onOpenChat(chat.id)}><InterfaceText source={chat.pinned ? "Pinned · " : ""} />{chat.title}</button> : <><InterfaceText source={chat.pinned ? "Pinned · " : ""} />{chat.title}</>}</p><p className="mt-1 text-sm text-stone-600">{chat.messageCount}<InterfaceText source=" messages · " />{new Date(chat.updatedAt).toLocaleDateString()}</p></li>)}</ul>
        : <p><InterfaceText source="No " /><InterfaceText source={archived ? "archived" : "saved"} /><InterfaceText source=" chats yet." /></p>}
    </div>
  </section>;
}
