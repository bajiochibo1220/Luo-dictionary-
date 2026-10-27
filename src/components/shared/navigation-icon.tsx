import { BookOpen, BookText, BrainCircuit, CalendarDays, CircleHelp, Compass, Database, FileText, FolderOpen, GraduationCap, History, Home, Languages, LayoutDashboard, Library, MapPin, MessageCircle, Mic, Music2, Network, Palette, ScrollText, Settings, ShieldCheck, Sparkles, UploadCloud, Users, WandSparkles, Bookmark, ChartNoAxesCombined, Puzzle } from "lucide-react";

export function NavigationIcon({ href, size = 20 }: { href: string; size?: number }) {
  const url = new URL(href, "https://navigation.local");
  const moduleCode = url.searchParams.get("module");
  const modules = { dictionary: BookText, proverbs: ScrollText, riddles: Puzzle, oral_histories: Mic, folktales: BookOpen, songs: Music2, artifacts: Palette, heritage_sites: MapPin, audio_visual: Library };
  const paths = { explore: Compass, dashboard: LayoutDashboard, learn: GraduationCap, tutor: Sparkles, chatbot: MessageCircle, research: FileText, saved: Bookmark, places: MapPin, knowledge: Network, "ai-tools": WandSparkles, courses: GraduationCap, classrooms: Users, contribute: UploadCloud, "my-submissions": FolderOpen, settings: Settings, help: CircleHelp, workspace: ShieldCheck, content: FolderOpen, "validation-queue": ShieldCheck, "review-queue": ScrollText, "review-history": History, "published-history": History, interface: Languages, media: Library, transcripts: FileText, users: Users, admins: ShieldCheck, languages: Languages, analytics: ChartNoAxesCombined, "ai-monitoring": BrainCircuit, "audit-logs": History, backup: Database, system: Settings, account: Home, event: CalendarDays };
  const key = url.pathname.split("/").filter(Boolean).pop() || "dashboard";
  const Icon = moduleCode && moduleCode in modules ? modules[moduleCode as keyof typeof modules] : paths[key as keyof typeof paths] || Library;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />;
}
