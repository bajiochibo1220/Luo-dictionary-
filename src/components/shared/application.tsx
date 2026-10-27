"use client";
import { InterfaceButton, InterfaceLanguageProvider, InterfaceLanguageSelector, InterfaceOption, InterfaceSelect, InterfaceText, useInterfaceLanguage } from "@/components/shared/interface-language";
import { ActivityTelemetry } from "./activity-telemetry";
import { PlacesExplorer } from "./places-explorer";
import { KnowledgeExplorer } from "./knowledge-explorer";
import { AiToolsWorkspace } from "./ai-tools-workspace";
import { TutorWorkspace } from "./tutor-workspace";
import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppSidebarView } from "@/components/shared/app-sidebar-view";
import { ExplorePathways } from "./explore-pathways";
import { DashboardOverview } from "@/components/shared/dashboard-overview";
import { PaginatedLibrary } from "@/components/shared/paginated-library";
import { AccountHistoryView } from "@/components/shared/account-history-view";
import { SharedChatInterface } from "@/components/shared/chat-interface";
import { AccountSettings } from "@/components/shared/account-settings";
import { ManagementWorkspace } from "@/components/shared/management-workspace";
import { SavedItems } from "@/components/shared/saved-items";
import { ContributionHub } from "@/components/shared/contribution-hub";
import { Toaster } from "sonner";
import { EducationHub } from "@/components/shared/education-hub";
import { ResearchLibrary } from "@/components/shared/research-library";
import { LearningHub } from "@/components/shared/learning-hub";
import { SidebarPanel, SidebarProvider, SidebarToggle, useSidebar } from "@/components/layout/sidebar-controls";
import type { AppBootstrap, AppLibrary } from "@/lib/app-contract";
import type { AppAccount, ConversationHistory } from "@/lib/account-contract";
import type { ApplicationAdapters, ApplicationSession } from "@/lib/application-adapters";
import { DismissiblePopover, PopoverClose } from "./dismissible-popover";
import { PartnerBranding } from "./partner-branding";
import { AccountHelp } from "./account-help";
import { applicationScreenHref } from "@/lib/app-navigation";
import { BrandMark } from "./brand-mark";
import { APP_NAME } from "@/lib/brand";
import { loginDestination, nativeLoginDestination } from "@/lib/login-destination";
const ApplicationContext = createContext<ApplicationAdapters | null>(null);
function useAdapters() { const value = useContext(ApplicationContext); if (!value) throw new Error("Application adapters are missing."); return value; }
export function SharedApplication({ adapters }: { adapters: ApplicationAdapters }) {
  return <ApplicationContext.Provider value={adapters}><InterfaceLanguageProvider transport={adapters.featureFetch}><SidebarProvider id="mobile-library-sidebar" storageKey="luo-heritage-mobile-sidebar"><App /></SidebarProvider></InterfaceLanguageProvider></ApplicationContext.Provider>;
}

// Give the backend's 30-second database connection window time to return its
// response, while keeping hung requests bounded and cancellable on navigation.
const READ_TIMEOUT_MS = 40000;

function Link({ href, className, children, onClick }: { href: string; className?: string; children: ReactNode; onClick?: () => void }) {
  const { apiOrigin, nativeSession } = useAdapters();
  const screen = applicationScreenHref(href);
  return <a href={screen ? `#${screen}` : new URL(href, apiOrigin).href} className={className} onClick={() => { if (!nativeSession.isNative && ["/login", "/register"].includes(href)) { try { sessionStorage.setItem("application-return", "/application" + (location.hash || "")); } catch {} } onClick?.(); }} target={screen || !nativeSession.isNative ? undefined : "_blank"} rel={screen ? undefined : "noopener noreferrer"}>{children}</a>;
}

function MobileBackLink({ label = "Back", variant }: { href?: string; label?: string; variant?: "default" | "on-dark" | "on-sand" }) {
  return <Link href="/dashboard" className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${variant === "on-dark" ? "text-amber-50" : "text-stone-900"}`}>← {label}</Link>;
}

function App() {
  const { bootstrap, library, apiOrigin, artwork, account, conversations, nativeSession, chatRequest, featureRequest, featureFetch } = useAdapters();
  const [route, setRoute] = useState("/dashboard");
  const interfaceLanguage = useInterfaceLanguage();
  const language = interfaceLanguage.community;
  const setLanguage = (code: string) => interfaceLanguage.select(code, interfaceLanguage.local);
  const [configuration, setConfiguration] = useState<AppBootstrap | null>(null);
  const [content, setContent] = useState<AppLibrary | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<ApplicationSession | null>(null);
  const [profile, setProfile] = useState<AppAccount | null>(null);
  const [history, setHistory] = useState<ConversationHistory>([]);
  const [archived, setArchived] = useState(false);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [personalError, setPersonalError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const identityEpoch = useRef(0);
  const pendingNativeLanding = useRef(false);
  const contentPanel = useRef<HTMLElement>(null);
  const sidebar = useSidebar();
  const closeMobile = sidebar?.closeMobile;
  const isStaff = !!profile && (profile.isSuperAdmin || profile.isMasterSuperAdmin || profile.languageRoles.some(role => ["language_admin", "uploader", "publisher", "content_editor"].includes(role.role)));
  const dashboardHref = nativeSession.isNative ? "/workspace" : loginDestination(profile ? { user: profile } : null);
  const activeModule = new URL(route, "https://client.local").searchParams.get("module");
  const isAccount = route === "/account";
  const routeUrl = new URL(route, "https://client.local");
  const isResearch = routeUrl.pathname === "/research";
  const isLearn = routeUrl.pathname === "/learn";
  const initialResourceId = routeUrl.searchParams.get("resource") || undefined;
  const isEducation = routeUrl.pathname === "/courses" || routeUrl.pathname === "/classrooms";
  const isSettings = route === "/settings";
  const isSaved = route === "/saved";
  const isWorkspace = route === "/workspace";
  const isContribution = route.startsWith("/contribute") || route.startsWith("/my-submissions");
  const contributionModule = route.startsWith("/contribute/") ? route.split("/")[2]?.split("?")[0] : "";
  const isChat = new URL(route, "https://client.local").pathname === "/chatbot";
  const initialConversationId = new URL(route, "https://client.local").searchParams.get("conversation") ?? undefined;
  const onChatSessionExpired = useCallback(() => {
    void nativeSession.signOut().catch(() => {});
    setPersonalError("Your session expired. Please sign in again.");
  }, [nativeSession]);

  useEffect(() => {
    let active = true;
    const unsubscribe = nativeSession.subscribe((value, reason) => {
      if (!active) return;
      identityEpoch.current++;
      if (reason !== "renew") pendingNativeLanding.current = !!value && nativeSession.isNative && (reason === "sign-in" || reason === "restore" && !location.hash);
      setSession(value);
      if (reason !== "renew") { setProfile(null); setHistory([]); setPersonalLoading(false); setArchived(false); }
      setPersonalError("");
      if (value && (reason === "sign-in" || reason === "restore" && !location.hash)) location.hash = "/account";
    });
    let disconnect: (() => void) | undefined;
    nativeSession.connect(message => { if (active) setPersonalError(message); }).then(stop => {
      if (active) disconnect = stop; else stop();
    }).catch(() => { if (active) setPersonalError("The app sign-in connection could not be started."); });
    return () => { active = false; unsubscribe(); disconnect?.(); };
  }, [nativeSession]);
  useEffect(() => {
    if (!session) return;
    let active = true;
    const renew = () => { void nativeSession.resume().catch(reason => {
      if (active) setPersonalError(reason instanceof Error ? reason.message : "Login could not reconnect. Try again when online.");
    }); };
    const timeout = window.setTimeout(renew, Math.max(1000, Date.parse(session.expiresAt) - Date.now() - (session.refreshToken ? 60000 : 0)));
    return () => { active = false; clearTimeout(timeout); };
  }, [session, nativeSession]);
  useEffect(() => {
    if (!session) return;
    const expectedIdentity = identityEpoch.current;
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(new Error("The connection timed out. Please try again.")), READ_TIMEOUT_MS);
    setPersonalLoading(true); setPersonalError(""); setHistory([]);
    Promise.all([account(controller.signal), conversations(archived, controller.signal)])
      .then(([user, chats]) => { if (active && expectedIdentity === identityEpoch.current) {
        setProfile(user); setHistory(chats);
        if (pendingNativeLanding.current) {
          pendingNativeLanding.current = false;
          if (location.hash === "#/account") location.hash = nativeLoginDestination({ user });
        }
      } })
      .catch(reason => { if (active && expectedIdentity === identityEpoch.current) { setProfile(null); setPersonalError(reason instanceof Error ? reason.message : "Unable to load your account."); } })
      .finally(() => { clearTimeout(timeout); if (active && expectedIdentity === identityEpoch.current) setPersonalLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [session, isAccount, archived, retry, account, conversations]);
  async function signIn(intent: "login" | "register" = "login") {
    setSigningIn(true); setPersonalError("");
    try { await nativeSession.start(intent); }
    catch (reason) { setPersonalError(reason instanceof Error ? reason.message : "Unable to start sign-in."); }
    finally { setSigningIn(false); }
  }
  async function signOut() {
    setAccountMenuOpen(false);
    try { await nativeSession.signOut(); }
    catch (reason) { setPersonalError(reason instanceof Error ? reason.message : "Sign-out could not be confirmed."); }
  }

  useEffect(() => {
    const update = () => { const target = location.hash.slice(1) || "/dashboard"; setRoute(applicationScreenHref(target) || "/not-found"); };
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(new Error("The connection timed out. Please try again.")), READ_TIMEOUT_MS);
    setLoading(true); setError(""); setContent(null);
    Promise.all([bootstrap(language, controller.signal), activeModule ? library(language, activeModule, controller.signal) : Promise.resolve(null)])
      .then(([config, records]) => { if (active) { setConfiguration(config); setContent(records); } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Unable to connect."); })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [language, activeModule, retry, bootstrap, library]);
  useEffect(() => { closeMobile?.(); contentPanel.current?.scrollTo({ top: 0, left: 0 }); }, [route, closeMobile]);

  return <div className="heritage-app flex h-dvh overflow-hidden flex-col bg-[#b89a68]">
    {nativeSession.isNative && <Toaster richColors />}
    <header className="institution-masthead flex shrink-0 items-center gap-2 border-b border-amber-100/15 bg-[#5c3a1c] px-3 py-2 text-amber-50 pt-safe">
      <SidebarToggle />
      <Link href="/explore" className="flex min-w-0 flex-1 items-center gap-2"><BrandMark src={artwork} /><span title={APP_NAME} className="min-w-0 truncate font-serif text-base md:text-xl">{APP_NAME}</span></Link><InterfaceLanguageSelector />
      {session ? <DismissiblePopover className="relative shrink-0" open={accountMenuOpen} onClose={() => setAccountMenuOpen(false)}><InterfaceButton type="button" aria-label="Open account menu" aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen(value => !value)} className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 font-serif font-bold text-stone-900">{(profile?.name || profile?.email || "U").charAt(0).toUpperCase()}</InterfaceButton>
        {accountMenuOpen && <div className="absolute right-0 z-50 mt-2 max-h-[75dvh] max-w-[calc(100vw-1rem)] overflow-y-auto w-56 rounded-xl border border-stone-200 bg-white py-2 text-stone-800 shadow-xl"><PopoverClose onClose={() => setAccountMenuOpen(false)} />{isStaff && <Link href={dashboardHref} onClick={() => setAccountMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold"><InterfaceText source="Admin dashboard" /></Link>}<Link href="/account" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-3 text-sm"><InterfaceText source="Saved conversations" /></Link><Link href="/settings" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-3 text-sm"><InterfaceText source="Settings & profile" /></Link><button type="button" onClick={signOut} className="w-full px-4 py-3 text-left text-sm text-red-700"><InterfaceText source="Sign out" /></button></div>}
      </DismissiblePopover>
        : nativeSession.isNative ? <InterfaceButton type="button" aria-label="Sign in" onClick={() => signIn()} disabled={signingIn} className="shrink-0 whitespace-nowrap text-sm font-semibold disabled:opacity-50"><InterfaceText source={signingIn ? "Connecting…" : "Sign in"} /></InterfaceButton>
        : <Link href="/login" className="shrink-0 whitespace-nowrap text-sm font-semibold"><InterfaceText source="Sign in" /></Link>}
    </header>
    {personalError && !isAccount && <div role="alert" className="flex shrink-0 items-start gap-3 bg-red-50 px-4 py-3 text-sm text-red-900"><p className="flex-1">{personalError}</p><InterfaceButton type="button" aria-label="Dismiss sign-in message" onClick={() => setPersonalError("")} className="font-semibold underline"><InterfaceText source="Dismiss" /></InterfaceButton></div>}
    <div className="relative flex min-h-0 flex-1">
      <PartnerBranding request={featureRequest}/>
      <SidebarPanel width={280}><AppSidebarView staffHref={isStaff ? dashboardHref : undefined} modules={configuration?.modules ?? []} pathname={new URL(route, "https://client.local").pathname} activeModule={activeModule} communityControls={<label className="block px-5 py-3 text-sm text-amber-50"><InterfaceText source="Community" /><InterfaceSelect aria-label="Choose community" value={language} onChange={event => { setLanguage(event.target.value); sidebar?.closeMobile(); }} className="mt-2 min-h-11 w-full rounded-lg border border-amber-100/20 bg-[#6b4724] px-3">{(configuration?.languages ?? [{ code: "luo", nativeName: "Dholuo" }]).filter(item => item.code !== "eng").map(item => <InterfaceOption key={item.code} value={item.code}>{item.nativeName}</InterfaceOption>)}</InterfaceSelect></label>} onNavigate={sidebar?.closeMobile} Link={Link} /></SidebarPanel>
      <ActivityTelemetry request={featureRequest} languageId={configuration?.selectedLanguage.id ?? 1} route={route} />
      <main ref={contentPanel} className="heritage-canvas relative min-w-0 flex-1 overflow-y-auto pb-safe heritage-pattern">
        {routeUrl.pathname === "/explore" ? <ExplorePathways Link={Link} request={featureRequest} languageCode={language} initialSubject={routeUrl.searchParams.get("subject") || ""} /> : routeUrl.pathname === "/help" ? session&&personalLoading ? <p role="status" className="p-5"><InterfaceText source="Loading your account guide..."/></p> : <AccountHelp account={profile} Link={Link} workspaceHref="/workspace"/> : routeUrl.pathname === "/not-found" ? <div className="space-y-4 p-5"><h1 className="font-serif text-2xl"><InterfaceText source="This page is unavailable"/></h1><Link href="/dashboard" className="inline-flex min-h-11 items-center underline"><InterfaceText source="Open the public library"/></Link></div> : <>
        {routeUrl.pathname === "/places" ? <PlacesExplorer key={language} request={featureRequest} languageId={configuration?.selectedLanguage.id ?? 1} /> : routeUrl.pathname === "/knowledge" ? <KnowledgeExplorer key={language} request={featureRequest} languageId={configuration?.selectedLanguage.id ?? 1} /> : routeUrl.pathname === "/ai-tools" ? <AiToolsWorkspace key={`${language}:${profile?.id || "guest"}`} request={featureRequest} languageId={configuration?.selectedLanguage.id ?? 1} /> : routeUrl.pathname === "/tutor" ? <TutorWorkspace key={`${language}:${profile?.id || "guest"}`} request={featureRequest} languageId={configuration?.selectedLanguage.id ?? 1} languageCode={language} /> : isResearch ? <ResearchLibrary Link={Link} key={`${language}:${profile?.id || "guest"}`} request={featureRequest} transport={featureFetch} languageId={configuration?.selectedLanguage.id ?? 1} account={profile} /> : isEducation ? <EducationHub key={`${routeUrl.pathname}:${language}:${session?.accountId || profile?.id || "guest"}`} request={featureRequest} languageId={configuration?.selectedLanguage.id ?? 1} userId={session ? profile?.id || session.accountId : undefined} initialView={routeUrl.pathname === "/classrooms" ? "classes" : "courses"} onOpenResource={(id, resourceLanguageId) => { const target = configuration?.languages.find(item => item.id === resourceLanguageId); if (target) setLanguage(target.code); location.hash = `/learn?resource=${encodeURIComponent(id)}`; }} /> : isWorkspace ? <ManagementWorkspace languages={configuration?.languages ?? []} key={session?.accountId || profile?.id || "guest"} request={featureRequest} transport={featureFetch} account={profile} languageId={configuration?.selectedLanguage.id ?? 1} englishLanguageId={configuration?.languages.find(item => item.code === "eng")?.id} /> : isSaved ? <SavedItems key={profile?.id || "guest"} request={featureRequest} Link={Link} /> : isContribution ? <ContributionHub key={`${language}:${session?.accountId || profile?.id || "guest"}`} request={featureRequest} transport={featureFetch} origin={apiOrigin} languageId={configuration?.selectedLanguage.id ?? 1} userId={session ? profile?.id || session.accountId : undefined} initialModule={contributionModule} /> : isSettings ? <AccountSettings key={session?.accountId || profile?.id || "guest"} request={featureRequest} onSignedOut={() => { void signOut(); }} recoveryHref={new URL("/account-recovery", apiOrigin).href} /> : isLearn ? <LearningHub languageCode={language} initialKind={routeUrl.searchParams.get("section") || "lesson"} initialResourceId={initialResourceId} key={`${language}:${routeUrl.searchParams.get("section") || "lesson"}:${initialResourceId || "list"}:${session?.accountId || profile?.id || "guest"}`} request={featureRequest} languageId={configuration?.selectedLanguage.id ?? 1} userId={session ? profile?.id || session.accountId : undefined} origin={apiOrigin} /> : isChat ? <SharedChatInterface key={`${language}:${session?.accountId ?? session?.refreshToken?.split(".")[0] ?? session?.accessToken ?? "guest"}`} languageCode={language} cultureCode={language} guest={!session} request={chatRequest} BackLink={MobileBackLink} Link={Link} onSessionExpired={onChatSessionExpired} initialConversationId={initialConversationId} />
          : isAccount ? session && profile ? <AccountHistoryView account={profile} history={history} archived={archived} loading={personalLoading} error={personalError} onArchivedChange={setArchived} onRetry={() => setRetry(value => value + 1)} onOpenChat={id => { location.hash = `/chatbot?conversation=${encodeURIComponent(id)}`; }} />
          : <div className="p-8"><h1 className="font-serif text-3xl"><InterfaceText source="My account" /></h1><p className="mt-4" role={personalError ? "alert" : "status"}>{personalError || (personalLoading ? "Loading your account…" : "Sign in to view your saved chats.")}</p>{session && <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-4 underline"><InterfaceText source="Try again" /></button>}</div>
          : loading ? <p role="status" className="p-8"><InterfaceText source="Loading library…" /></p> : error ? <div role="alert" className="p-8"><p>{error}</p><button type="button" className="mt-4 rounded-full bg-[#6b4724] px-5 py-2 text-amber-50" onClick={() => setRetry(value => value + 1)}><InterfaceText source="Try again" /></button></div> : content ? <PaginatedLibrary key={`${language}:${activeModule}`} initial={content} request={featureRequest} Link={Link} /> : <DashboardOverview Link={Link} mode={profile?.languageRoles.some(role => role.role === "teacher") ? "teacher" : profile?.languageRoles.some(role => role.role === "researcher") ? "researcher" : "public"} languageName={configuration?.selectedLanguage.nativeName || "Dholuo"} name={session ? profile?.name : undefined} />}
        </>}
      </main>
      {!isChat && <Link href="/chatbot" className={`absolute ${content ? "bottom-24" : "bottom-4"} right-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-600 text-white shadow-xl`}><svg aria-label="Open AI chatbot" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></Link>}
    </div>
  </div>;
}

