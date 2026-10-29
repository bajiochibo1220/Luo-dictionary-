import { ArrowUpRight, BookOpen, Compass, GraduationCap, Headphones, Heart, Sparkles } from "lucide-react";
import { InterfaceText } from "./interface-language";
import { NavigationIcon } from "./navigation-icon";
import type { AppLink } from "./module-content-view";
const DefaultLink: AppLink = ({ children, ...props }) => <a {...props}>{children}</a>;
const shortcuts = [
  { href: "/dashboard?module=audio_visual", label: "Listen & discover", Icon: Headphones },
  { href: "/learn", label: "Learning centre", Icon: GraduationCap },
  { href: "/tutor", label: "AI language tutor", Icon: Sparkles },
  { href: "/help", label: "My manual", Icon: BookOpen },
];
export function DashboardOverview({ languageName, name, mode = "public", Link = DefaultLink }: { languageName: string; name?: string | null; mode?: "public" | "teacher" | "researcher"; Link?: AppLink }) {
  const assignedTasks = mode === "teacher" ? [
    { title: "Your teaching workspace", description: "Explore published pathways, lessons and learning activities.", href: "/courses", tone: "blue" },
    { title: "Resources for your lessons", description: "Find material permitted for your teaching assignment.", href: "/research", tone: "teal" },
  ] : mode === "researcher" ? [
    { title: "Your research library", description: "Explore publications, datasets and source material permitted for your assignment.", href: "/research", tone: "teal" },
    { title: "Follow cultural connections", description: "Explore relationships between reviewed public records.", href: "/knowledge", tone: "violet" },
  ] : [];
  const destinations = [...assignedTasks, ...[
    { title: "Words that connect us", description: "Explore vocabulary, meanings and pronunciation.", href: "/dashboard?module=dictionary", tone: "teal" },
    { title: "Stories worth keeping", description: "Discover folktales and the wisdom within them.", href: "/dashboard?module=folktales", tone: "rose" },
    { title: "Learn a little, every day", description: "Find lessons, games and activities at your level.", href: "/learn", tone: "blue" },
    { title: "Your language companion", description: "Practise conversation and writing with the AI tutor.", href: "/tutor", tone: "violet" },
    { title: "Explore living heritage", description: "Find places, histories and cultural connections.", href: "/places", tone: "gold" },
    { title: "Knowledge for discovery", description: "Browse publications, transcripts and research materials.", href: "/research", tone: "teal" },
  ]].filter((item, index, all) => all.findIndex(other => other.href === item.href) === index).slice(0, 6);
  return <section className="dashboard-home mx-auto w-full max-w-7xl space-y-7 p-4 pb-24 md:p-8">
    <header className="dashboard-hero"><div className="relative z-10 max-w-2xl space-y-4">
      <span className="hero-eyebrow"><Compass size={15} aria-hidden="true" />{languageName}<span aria-hidden="true">·</span><InterfaceText source="Your heritage, your journey" /></span>
      <h1 className="font-serif text-3xl leading-tight sm:text-4xl lg:text-5xl"><InterfaceText source="Welcome" />{name ? `, ${name.split(" ")[0]}` : ""}<span className="mt-2 block text-teal-100"><InterfaceText source="Keep the connection alive." /></span></h1>
      <p className="max-w-xl text-sm leading-relaxed text-white/85 sm:text-base"><InterfaceText source="Discover the words, stories and living knowledge that bring generations together." /></p>
      <Link href="/explore" className="hero-button"><Compass size={18} aria-hidden="true" /><InterfaceText source="Find your starting point" /><ArrowUpRight size={18} aria-hidden="true" /></Link>
    </div><div className="hero-art" aria-hidden="true"><BookOpen size={100} strokeWidth={1} /><span><Heart size={25} /></span></div></header>
    <nav aria-label="Quick access" className="dashboard-shortcuts">{shortcuts.map(({ href, label, Icon }) => <Link key={href} href={href} className="shortcut-card"><Icon size={21} aria-hidden="true" /><span><InterfaceText source={label} /></span><ArrowUpRight size={16} aria-hidden="true" /></Link>)}</nav>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-eyebrow"><InterfaceText source="Make it your own" /></p><h2 className="font-serif text-2xl text-slate-900"><InterfaceText source="Where would you like to begin?" /></h2></div><Link href="/explore" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal-800"><InterfaceText source="Explore all modules" /><ArrowUpRight size={17} aria-hidden="true" /></Link></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{destinations.map(item => <Link key={item.href} href={item.href} className="destination-card"><span className={`feature-icon tone-${item.tone}`}><NavigationIcon href={item.href} size={25} /></span><h3 className="font-serif text-xl text-slate-900"><InterfaceText source={item.title} /></h3><p className="text-sm leading-relaxed text-slate-600"><InterfaceText source={item.description} /></p><ArrowUpRight size={19} className="destination-arrow" aria-hidden="true" /></Link>)}</div>
    <aside className="guide-banner"><span className="feature-icon tone-gold"><BookOpen size={25} aria-hidden="true" /></span><div className="min-w-0 flex-1"><h2 className="font-semibold text-slate-900"><InterfaceText source="A little guidance goes a long way." /></h2><p className="mt-1 text-sm text-slate-600"><InterfaceText source="Your account manual explains the tools available to you. Read it online or download a copy." /></p></div><Link href="/help" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-teal-900 px-5 py-2 text-sm font-semibold text-white"><InterfaceText source="Open my manual" /><ArrowUpRight size={17} aria-hidden="true" /></Link></aside>
  </section>;
}
