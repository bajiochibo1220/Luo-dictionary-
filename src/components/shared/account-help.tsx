"use client";
import { useEffect, useState } from "react";
import { BookOpen, Download, Search } from "lucide-react";
import { accountHelpGuides, type HelpAccount } from "@/lib/account-help";
import { InterfaceInput, InterfaceText, useInterfaceLanguage } from "./interface-language";
import type { AppLink } from "./module-content-view";

export function AccountHelp({account,Link,workspaceHref}: {account:HelpAccount;Link:AppLink;workspaceHref?:string}) {
  const {t}=useInterfaceLanguage();
  const guides=accountHelpGuides(account);
  const signature=guides.map(guide=>guide.id).join(":");
  const firstGuideId=guides[0].id;
  const [selected,setSelected]=useState(guides[0].id),[query,setQuery]=useState("");
  useEffect(()=>{setSelected(firstGuideId);setQuery("");},[signature,firstGuideId]);
  const guide=guides.find(item=>item.id===selected)||guides[0];
  const startHref=workspaceHref&&/^\/(?:admin|super-admin)\//.test(guide.start.href)?workspaceHref:guide.start.href;
  const needle=query.trim().toLocaleLowerCase();
  const topics=guide.topics.filter(topic=>!needle||[topic.title,...topic.steps].flatMap(text=>[text,t(text)]).join(" ").toLocaleLowerCase().includes(needle));
  function download(){
    const text=[t(guide.title),t(guide.introduction),...guide.topics.map(topic=>`${t(topic.title)}\n${topic.steps.map((step,index)=>`${index+1}. ${t(step)}`).join("\n")}`)].join("\n\n");
    const url=URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"}));
    const anchor=document.createElement("a");anchor.href=url;anchor.download=`luo-heritage-${guide.id}-guide.txt`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section className="mx-auto w-full max-w-4xl space-y-5 p-4 pb-24 text-stone-900 md:p-8" aria-labelledby="account-help-title">
    <header className="dashboard-hero space-y-3"><span className="hero-eyebrow"><BookOpen size={18} aria-hidden="true"/><InterfaceText source="Your account manual"/></span><h1 id="account-help-title" className="font-serif text-3xl"><InterfaceText source="Help & training"/></h1><p className="text-sm leading-relaxed text-teal-50"><InterfaceText source="Your guide is selected from the roles assigned to your account."/></p></header>
    {guides.length>1&&<nav aria-label="My account guides" className="flex flex-wrap gap-2">{guides.map(item=><button type="button" key={item.id} aria-pressed={guide.id===item.id} onClick={()=>{setSelected(item.id);setQuery("");}} className={`min-h-11 rounded-full border px-4 text-sm ${guide.id===item.id?"bg-stone-900 text-white":"bg-white"}`}><InterfaceText source={item.title}/></button>)}</nav>}
    <div className="space-y-4 rounded-2xl border border-stone-300 bg-white/95 p-5"><h2 className="font-serif text-2xl" data-help-guide={guide.id}><InterfaceText source={guide.title}/></h2><p><InterfaceText source={guide.introduction}/></p><div className="flex flex-wrap gap-3"><Link href={startHref} className="inline-flex min-h-11 items-center rounded-full bg-amber-900 px-5 py-2 text-sm font-semibold text-white"><InterfaceText source={workspaceHref&&startHref===workspaceHref?"Open my workspace":guide.start.label}/></Link><button type="button" onClick={download} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-400 px-4 text-sm"><Download size={17} aria-hidden="true"/><InterfaceText source="Download my guide"/></button></div></div>
    <label className="flex min-h-11 items-center gap-2 rounded-xl border border-stone-400 bg-white p-3"><Search size={18} aria-hidden="true"/><span className="sr-only"><InterfaceText source="Search my guide"/></span><InterfaceInput aria-label="Search my guide" placeholder="Search my guide" value={query} maxLength={100} onChange={event=>setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none"/></label>
    {topics.length?topics.map(topic=><details key={`${guide.id}:${topic.title}`} open={needle?true:undefined} className="rounded-xl border border-stone-300 bg-white/95 p-4"><summary className="min-h-11 cursor-pointer py-2 font-semibold"><InterfaceText source={topic.title}/></summary><ol className="list-decimal space-y-3 pl-6 pb-2">{topic.steps.map(step=><li key={step}><InterfaceText source={step}/></li>)}</ol></details>):<p role="status" className="rounded-xl bg-white/95 p-4"><InterfaceText source="No matching help topics. Try another word or clear the search."/></p>}
  </section>;
}
