"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Users, Shield, Languages, Settings, ChartColumn, History, Database, FolderCheck, Brain } from "lucide-react";
import type { AppAccount } from "@/lib/account-contract";
import { canManageUsers, canViewAnalytics, hasAnyAdminRole } from "@/lib/permissions";
import type { FeatureRequest } from "./learning-hub";
import { StaffWorkspace } from "./staff-workspace";

type Language = { id: number; code: string; nativeName: string; name?: string; isActive?: boolean };
type Props = { request: FeatureRequest; transport: typeof fetch; account: AppAccount | null; languageId: number; englishLanguageId?: number; languages?: Language[] };
const primary = "min-h-11 rounded-full bg-amber-900 px-5 py-2 font-semibold text-white disabled:opacity-50";
const secondary = "min-h-11 rounded-full border border-stone-500 px-4 py-2 text-sm disabled:opacity-50";
const field = "mt-1 block min-h-11 w-full rounded-lg border border-stone-400 bg-white p-3 text-stone-900";
const panel = "space-y-4 rounded-xl border border-stone-300 bg-white/90 p-5";
const roleChoices = ["uploader", "cultural_expert", "content_editor", "publisher", "language_admin"];
const settingGroups = [
  { name: "General", fields: [["site_name", "Site name"], ["support_email", "Support email"]] },
  { name: "Account email", fields: [["smtp_provider", "Email provider (resend or sendgrid)"], ["smtp_from", "Verified sender email"], ["smtp_password", "Email service key"]] },
  { name: "AI and media services", fields: [["gemini_api_key", "Gemini service key"], ["gemini_model", "Chat model"], ["gemini_fallback_model", "Fallback chat model"], ["cloudinary_cloud_name", "Cloudinary cloud name"], ["cloudinary_api_key", "Cloudinary API key"], ["cloudinary_api_secret", "Cloudinary secret"]] },
  { name: "Maintenance", fields: [["maintenance_mode", "Maintenance mode (on or off)"], ["maintenance_message", "Message to readers"]] },
] as const;

export function managementTabs(account: AppAccount | null) {
  const session = account ? { user: account } : null;
  const superAdmin = !!(account?.isSuperAdmin || account?.isMasterSuperAdmin);
  return [
    { key: "content", title: "Content", icon: FolderCheck, allowed: hasAnyAdminRole(session) },
    { key: "people", title: "Users", icon: Users, allowed: canManageUsers(session) },
    { key: "staff", title: "Staff", icon: Shield, allowed: superAdmin },
    { key: "languages", title: "Languages", icon: Languages, allowed: superAdmin },
    { key: "analytics", title: "Analytics", icon: ChartColumn, allowed: canViewAnalytics(session) },
    { key: "ai", title: "AI activity", icon: Brain, allowed: hasAnyAdminRole(session) },
    { key: "audit", title: "History", icon: History, allowed: superAdmin },
    { key: "settings", title: "System", icon: Settings, allowed: superAdmin },
    { key: "backups", title: "Backups", icon: Database, allowed: !!account?.isMasterSuperAdmin },
  ].filter(tab => tab.allowed);
}

export function ManagementWorkspace(props: Props) {
  const { request, transport, account, languageId, languages = [] } = props;
  const tabs = managementTabs(account);
  const access = JSON.stringify({ id: account?.id, super: account?.isSuperAdmin, master: account?.isMasterSuperAdmin, roles: account?.languageRoles });
  const [tab, setTab] = useState("content"), [rows, setRows] = useState<any>(null);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false), [page, setPage] = useState(1), [query, setQuery] = useState("");
  const [search, setSearch] = useState(""), [form, setForm] = useState(false);
  const epoch = useRef(0);
  const reload = useCallback(async () => {
    const current = ++epoch.current;
    if (tab === "content") return;
    setLoading(true); setError(""); setRows(null);
    const endpoints: Record<string, string> = {
      people: `/api/users?${account?.isMasterSuperAdmin ? "" : `languageId=${languageId}&`}limit=50&page=${page}&q=${encodeURIComponent(search)}`,
      staff: "/api/super-admin/admins", languages: "/api/languages?manage=true",
      settings: "/api/super-admin/settings", backups: "/api/super-admin/backup",
      analytics: `/api/analytics?languageId=${languageId}`, ai: `/api/ai/monitoring?languageId=${languageId}`,
      audit: `/api/audit-logs?limit=50&page=${page}`,
    };
    try { const result = await request(endpoints[tab]); if (current === epoch.current) setRows(result); }
    catch (reason) { if (current === epoch.current) setError(reason instanceof Error ? reason.message : "Could not load this workspace."); }
    finally { if (current === epoch.current) setLoading(false); }
  }, [request, tab, languageId, page, search, account?.isMasterSuperAdmin]);
  useEffect(() => { setRows(null); setForm(false); void reload(); return () => { epoch.current++; }; }, [reload, access]);
  useEffect(() => { if (!managementTabs(account).some(item => item.key === tab)) { setTab("content"); setRows(null); } }, [access, account, tab]);
  async function act(path: string, method: string, data?: unknown, message = "Saved.") {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try { await request(path, { method, ...(data === undefined ? {} : { body: JSON.stringify(data) }) }); setNotice(message); setForm(false); await reload(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The action could not be saved."); }
    finally { setBusy(false); }
  }
  async function downloadBackup(id: string, filename: string) {
    setBusy(true); setError("");
    try {
      const response = await transport(`/api/super-admin/backup/${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error("The backup could not be downloaded. Refresh and check your access.");
      const file = new File([await response.blob()], filename.replace(/[^A-Za-z0-9._-]/g, "_"), { type: "application/json" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Private database backup" });
      else { const url = URL.createObjectURL(file); const link = document.createElement("a"); link.href = url; link.download = file.name; document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 60000); }
      setNotice("Keep the downloaded backup in an approved private location.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Download unavailable."); }
    finally { setBusy(false); }
  }
  if (!tabs.length || !account) return <p className="p-5">Sign in with an assigned staff role to open the workspace.</p>;
  if (!tabs.some(item => item.key === tab)) return <p className="p-5" role="status">Your access changed. Reloading the available workspace…</p>;
  return <section className="space-y-4 p-3 text-stone-900 md:p-6">
    <header className="workspace-heading space-y-3" data-sticky-controls>
      <h1 className="font-serif text-2xl md:text-3xl">Staff workspace</h1>
      <nav className="flex flex-nowrap gap-2 overflow-x-auto pb-2" aria-label="Staff workspace sections">{tabs.map(({ key, title, icon: Icon }) => <button key={key} title={title} aria-label={title} aria-pressed={tab === key} onClick={() => { setTab(key); setRows(null); setPage(1); setForm(false); setNotice(""); }} className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full border px-3 ${tab === key ? "border-stone-900 bg-stone-900 text-white" : "border-stone-500 bg-white/70"}`}><Icon aria-hidden="true" size={18} /><span className="sr-only sm:not-sr-only">{title}</span></button>)}</nav>
    </header>
    {tab === "content" ? <StaffWorkspace {...props} embedded /> : <>
      <div className="flex flex-wrap items-center gap-3"><h2 className="font-serif text-2xl">{tabs.find(item => item.key === tab)?.title}</h2><button disabled={busy || loading} className={secondary} onClick={() => void reload()}>Refresh</button></div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-900">{error}</p>}{notice && <p role="status" className="rounded-lg bg-green-50 p-4 text-green-900">{notice}</p>}
      {loading && <p role="status">Loading current records…</p>}
      {tab === "people" && <form className="flex items-end gap-3" onSubmit={event => { event.preventDefault(); setPage(1); setSearch(query); }}><label className="flex-1">Find a user<input className={field} value={query} onChange={event => setQuery(event.target.value)} maxLength={200} placeholder="Name or email" /></label><button className={primary}>Search</button></form>}
      {tab === "staff" && <><p>Create only the role and language the person needs. Super Admin authority is reserved for the Master Super Admin.</p><button className={primary} disabled={busy} onClick={() => setForm(value => !value)}>{form ? "Close staff form" : "Add staff account"}</button>{form && <StaffForm busy={busy} master={account.isMasterSuperAdmin} languages={account.isMasterSuperAdmin ? languages : languages.filter(language => account.languageRoles.some(role => role.languageId === language.id))} onSave={body => act("/api/super-admin/admins", "POST", body, "Staff account created. Share the temporary access details privately.")} />}</>}
      {(tab === "people" || tab === "staff") && Array.isArray(rows) && <div className="space-y-3">{!rows.length && <p className={panel}>No matching accounts.</p>}{rows.map((person: any) => <article key={person.id} className={panel}><h3 className="text-lg font-semibold">{person.name || person.email}</h3><p className="break-all">{person.email}</p><p>{person.status}{person.isMasterSuperAdmin ? " · Master Super Admin" : person.isSuperAdmin ? " · Super Admin" : ""}</p><ul>{person.languageRoles?.map((role: any) => <li key={role.id}>{role.language?.nativeName}: {role.role.replaceAll("_", " ")}</li>)}</ul>
        {tab === "staff" && account.isMasterSuperAdmin && !person.isMasterSuperAdmin && person.id !== account.id && <div className="flex flex-wrap gap-3"><button className={secondary} disabled={busy} onClick={() => { if (confirm(`${person.status === "suspended" ? "Activate" : "Deactivate"} ${person.email}?`)) void act(`/api/super-admin/admins/${person.id}`, "PATCH", { status: person.status === "suspended" ? "active" : "suspended" }); }}>{person.status === "suspended" ? "Activate account" : "Deactivate account"}</button><button className={secondary} disabled={busy} onClick={() => { if (confirm(`Remove all staff duties from ${person.email}? Their account will remain.`)) void act(`/api/super-admin/admins/${person.id}`, "DELETE"); }}>Revoke staff duties</button></div>}
        {tab === "people" && account.isMasterSuperAdmin && !person.isMasterSuperAdmin && <TeachingResearchForm person={person} languages={languages} busy={busy} onGrant={body => act(`/api/users/${person.id}/roles`, "POST", body, "Assigned access saved. The person can refresh their account to use it.")} onRemove={id => act(`/api/users/${person.id}/roles?roleId=${id}`, "DELETE", undefined, "Assigned access removed.")} />}
      </article>)}</div>}
      {tab === "languages" && <><button className={primary} disabled={busy} onClick={() => setForm(value => !value)}>{form ? "Close language form" : "Add language"}</button>{form && <form className={panel} onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); void act("/api/languages", "POST", Object.fromEntries(f), "Language created. Review its labels and content before activation."); }}><label className="block">Language code<input name="code" className={field} pattern="[a-z]{2,8}(-[a-z0-9]+)?" required maxLength={20} /></label><label className="block">Name<input name="name" className={field} required maxLength={100} /></label><label className="block">Local name<input name="nativeName" className={field} required maxLength={100} /></label><button className={primary} disabled={busy}>Create inactive language</button></form>}
        {Array.isArray(rows) && rows.map((language: Language) => <article key={language.id} className={panel}><h3 className="text-lg font-semibold">{language.nativeName}</h3><p>{language.name} · {language.code} · {language.isActive ? "Active" : "Inactive"}</p><button disabled={busy} className={secondary} onClick={() => { if (confirm(`${language.isActive ? "Deactivate" : "Activate"} ${language.nativeName}?`)) void act(`/api/languages/${language.id}/activate`, "POST"); }}>{language.isActive ? "Deactivate language" : "Activate language"}</button></article>)}</>}
      {tab === "settings" && rows && <>{settingGroups.map(group => <form key={group.name} className={panel} onSubmit={event => { event.preventDefault(); void act("/api/super-admin/settings", "PATCH", Object.fromEntries(new FormData(event.currentTarget)), "Settings saved."); }}><h3 className="font-serif text-xl">{group.name}</h3>{group.fields.map(([key, label]) => <label key={`${key}:${rows[key] || ""}`} className="block">{label}<input name={key} type={/secret|password|api_key/.test(key) ? "password" : "text"} className={field} defaultValue={rows[key] || ""} autoComplete="off" maxLength={2000} /></label>)}<button disabled={busy} className={primary}>Save {group.name.toLowerCase()}</button>{group.name === "Account email" && <button type="button" disabled={busy} className={secondary} onClick={() => void act("/api/super-admin/settings/test-email", "POST", undefined, "The provider accepted a test email to your own account. Check your inbox.")}>Send test email to my account</button>}</form>)}{account.isMasterSuperAdmin && <form className={panel} onSubmit={event => { event.preventDefault(); void act("/api/super-admin/settings", "PATCH", Object.fromEntries(new FormData(event.currentTarget)), "Public Terms and Privacy text saved."); }}><h3 className="font-serif text-xl">Terms and Privacy</h3>{[["terms_content", "Terms"], ["privacy_content", "Privacy"]].map(([key, label]) => <label key={key} className="block">{label}<textarea name={key} className={field} rows={10} defaultValue={rows[key] || ""} maxLength={50000} required /></label>)}<button disabled={busy} className={primary}>Save public legal text</button></form>}</>}
      {tab === "backups" && <><p>Database backups contain private account information. Media file bytes need a separate storage backup.</p><button disabled={busy} className={primary} onClick={() => void act("/api/super-admin/backup", "POST", undefined, "Database backup created.")}>Backup now</button>{Array.isArray(rows) && rows.map((backup: any) => <article key={backup.id} className={panel}><h3 className="break-all font-semibold">{backup.filename}</h3><p>{new Date(backup.createdAt).toLocaleString()} · {Math.ceil(Number(backup.sizeBytes) / 1024)} KB</p><button disabled={busy} className={secondary} onClick={() => void downloadBackup(backup.id, backup.filename)}>Download private backup</button></article>)}</>}
      {tab === "analytics" && rows && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Metric label="Recorded events" value={rows.totalEvents} /><Metric label="Signed-in visitors" value={rows.identifiedVisitors} /></div><p>{rows.visitorCountScope}</p><ReportList title="Popular searches" items={rows.topSearches} label="query" /><ReportList title="Content activity" items={rows.topContent} label="title" /><ReportList title="Daily events" items={rows.trend} label="date" /><ReportList title="Recorded geographic reach" items={rows.geo} label="country" /></div>}
      {tab === "ai" && rows && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Metric label="Recorded questions" value={rows.chatbot?.totalQueries} /><Metric label="Flagged responses" value={rows.chatbot?.flaggedCount} /><Metric label="Rated responses" value={rows.chatbot?.ratedCount} /><Metric label="Positive ratings (%)" value={rows.chatbot?.satisfactionPct} /></div><p>Ratings describe recorded feedback, not a measured cultural-accuracy score.</p>{rows.flagged?.map((item: any) => <article key={item.id} className={panel}><h3 className="font-semibold">Flagged response</h3><p className="whitespace-pre-wrap">{item.query}</p><p className="whitespace-pre-wrap">{item.response}</p><p>{new Date(item.createdAt).toLocaleString()}</p></article>)}</div>}
      {tab === "audit" && Array.isArray(rows) && <div className="space-y-3">{!rows.length && <p>No recorded actions on this page.</p>}{rows.map((item: any) => <article key={item.id} className={panel}><h3 className="font-semibold">{item.action}</h3><p>{item.user?.name || item.user?.email || "System"} · {new Date(item.createdAt).toLocaleString()}</p><p className="break-all">{item.entityType} · {item.entityId}</p></article>)}</div>}
      {(tab === "people" || tab === "audit") && Array.isArray(rows) && <div className="flex gap-3"><button className={secondary} disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>Previous page</button><p className="self-center">Page {page}</p><button className={secondary} disabled={rows.length < 50 || loading} onClick={() => setPage(value => value + 1)}>Next page</button></div>}
    </>}
  </section>;
}

function Metric({ label, value }: { label: string; value: unknown }) { return <div className={panel}><h3>{label}</h3><p className="text-3xl font-semibold">{typeof value === "number" ? value.toLocaleString() : "No recorded value"}</p></div>; }
function ReportList({ title, items, label }: { title: string; items?: any[]; label: string }) { return <section className={panel}><h3 className="font-serif text-xl">{title}</h3>{items?.length ? <ul className="space-y-2">{items.map((item, index) => <li key={index} className="flex justify-between gap-3"><span>{item[label] || "Unlabelled"}</span><strong>{item.count ?? item.views ?? ""}</strong></li>)}</ul> : <p>No activity recorded.</p>}</section>; }
function StaffForm({ languages, master, busy, onSave }: { languages: Language[]; master: boolean; busy: boolean; onSave: (body: unknown) => Promise<void> }) {
  const [role, setRole] = useState("uploader");
  return <form className={panel} onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget); const selected = fields.getAll("languageIds").map(Number); void onSave({ email: fields.get("email"), name: fields.get("name"), password: fields.get("password"), role, languageId: selected[0], languageIds: selected }); }}>
    <label className="block">Name<input name="name" className={field} required maxLength={100} /></label><label className="block">Email<input name="email" type="email" className={field} required maxLength={254} /></label><label className="block">Temporary password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} className={field} required /></label>
    <label className="block">Duty<select className={field} value={role} onChange={event => setRole(event.target.value)}>{[...roleChoices, ...(master ? ["super_admin"] : [])].map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
    <label className="block">{role === "super_admin" ? "Languages to oversee (select one or more)" : "Assigned language"}<select name="languageIds" multiple={role === "super_admin"} className={field} required>{languages.map(language => <option key={language.id} value={language.id}>{language.nativeName}</option>)}</select></label><p>Share the temporary password privately. The person should choose their own password through account recovery.</p><button className={primary} disabled={busy || !languages.length}>Create staff account</button>
  </form>;
}

function TeachingResearchForm({person,languages,busy,onGrant,onRemove}:{person:any;languages:Language[];busy:boolean;onGrant:(body:unknown)=>Promise<void>;onRemove:(id:number)=>Promise<void>}) {
 return <details className="rounded border p-3"><summary className="min-h-11 cursor-pointer font-semibold">Teaching and research access</summary><p>These duties grant access to permitted teaching or research material. They do not make the person an administrator.</p><form className="space-y-3" onSubmit={event=>{event.preventDefault();const fields=new FormData(event.currentTarget);void onGrant({languageId:Number(fields.get("languageId")),role:fields.get("role")});}}><label className="block">Language<select name="languageId" className={field} required>{languages.map(language=><option key={language.id} value={language.id}>{language.nativeName}</option>)}</select></label><label className="block">Duty<select name="role" className={field}><option value="teacher">Teacher</option><option value="researcher">Researcher</option></select></label><button className={primary} disabled={busy||!languages.length}>Grant assigned access</button></form>{person.languageRoles?.filter((role:any)=>["teacher","researcher"].includes(role.role)).map((role:any)=><button key={role.id} disabled={busy} className="mr-3 min-h-11 underline" onClick={()=>{if(confirm('Remove this assigned access?'))void onRemove(role.id);}}>Remove {role.language?.nativeName} {role.role} access</button>)}</details>;
}
