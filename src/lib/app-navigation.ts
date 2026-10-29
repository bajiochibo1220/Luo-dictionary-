// Framework-independent navigation shared by the web and packaged clients.
export const APP_ROUTES = {
  overview: "/dashboard",
  login: "/login",
  register: "/register",
  profile: "/profile",
  contribute: "/contribute",
  submissions: "/my-submissions",
  chatbot: "/chatbot",
  tutor: "/tutor",
  aiTools: "/ai-tools",
  knowledge: "/knowledge",
  places: "/places",
  admin: "/admin/dashboard",
  superAdmin: "/super-admin/dashboard",
  appUpdates: "/mobile-apps",
  help: "/help",
} as const;

export function accountDashboardHref({ isAdmin, isSuperAdmin }: { isAdmin: boolean; isSuperAdmin: boolean }) {
  return isSuperAdmin ? APP_ROUTES.superAdmin : isAdmin ? APP_ROUTES.admin : APP_ROUTES.overview;
}

// One route contract for links and hash navigation in the packaged application.
export function applicationScreenHref(href: string): string | null {
  if (!href.startsWith("/") || href.startsWith("//") || href.length > 4096 || /[\\\u0000-\u001f]/.test(href)) return null;
  const url = new URL(href, "https://client.local");
  if (url.pathname === "/application") return "/dashboard" + url.search;
  if (["/admin/help", "/super-admin/help"].includes(url.pathname)) return "/help";
  if (url.pathname === "/profile") return "/settings";
  if (url.pathname === "/classrooms") return "/courses" + url.search;
  const screens = ["/explore", "/dashboard", "/learn", "/research", "/courses", "/settings", "/saved", "/workspace", "/account", "/chatbot", "/places", "/knowledge", "/ai-tools", "/tutor", "/help", "/contribute", "/my-submissions"];
  return screens.includes(url.pathname) || /^\/contribute\/[a-z0-9_-]+$/.test(url.pathname) ? url.pathname + url.search : null;
}

export function pairedLanguageNavigation(languageCode: string, pathname: string, search: string) {
  const params = new URLSearchParams(search);
  const culture = languageCode === "eng" ? params.get("culture") : languageCode;
  if (!culture || culture === "eng" || !/^[a-z]{2,8}(?:-[a-z0-9]+)?$/.test(culture)) {
    return { alternateHref: "/application", cultureQuery: "", alternateLabel: "Explore heritage" };
  }
  const target = pathname.replace(`/${languageCode}`, languageCode === "eng" ? `/${culture}` : "/eng");
  if (languageCode === "eng") params.delete("culture");
  else params.set("culture", culture);
  return {
    alternateHref: target + (params.size ? `?${params}` : ""),
    cultureQuery: languageCode === "eng" ? `?culture=${encodeURIComponent(culture)}` : "",
    alternateLabel: languageCode === "eng" ? "Community language" : "English",
  };
}

export function moduleHref(code: string) {
  if (!code) return APP_ROUTES.overview;
  if (code === "ai_tutor" || code === "language_tutor" || code === "tutor") return "/tutor";
  if (code === "research") return "/research";
  if (code === "chatbot") return APP_ROUTES.chatbot;
  if (code === "cultural_calendar") return "/learn?section=event";
  if (code === "games") return "/learn?section=game";
  if (code === "learning") return "/learn?section=lesson";
  return `${APP_ROUTES.overview}?module=${encodeURIComponent(code)}`;
}

export function contributionHref(code: string) {
  return `${APP_ROUTES.contribute}/${encodeURIComponent(code)}`;
}

export function publicSourceHref(languageCode: string, source: { id: string; module: string }) {
  if (!/^[a-z]{2,8}(?:-[a-z0-9]+)?$/.test(languageCode) || !/^[A-Za-z0-9_-]{1,128}$/.test(source.id)) return null;
  const paths: Record<string, string> = {
    dictionary: "muma", proverbs: "ngero", riddles: "ngeche", "oral histories": "sigana",
    folktales: "sigana/folktales", "traditional songs": "wende", songs: "wende",
    "cultural artifacts": "gik-luo", artifacts: "gik-luo", "heritage sites": "piny-luo",
  };
  const route = paths[source.module.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ")];
  return route ? `/${languageCode}/${route}/${encodeURIComponent(source.id)}` : null;
}

export const CONTENT_FILTERS = [
  { key: "all", label: "All" },
  { key: "image", label: "Images" },
  { key: "audio", label: "Audio" },
  { key: "video", label: "Video" },
  { key: "transcript", label: "Transcripts" },
] as const;

export const CONTENT_VIEWS = [
  { key: "feed", label: "Feed", icon: "☰" },
  { key: "grid", label: "Grid", icon: "▦" },
] as const;
