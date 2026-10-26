import { WebResearchLibrary } from "@/components/shared/web-research-library";
import { auth } from "@/lib/auth";
import { getDefaultPublicLanguage } from "@/lib/public-navigation";
export default async function ResearchPage(){const [session,language]=await Promise.all([auth(),getDefaultPublicLanguage()]);if(!session?.user||!language)return <p className="p-6">Sign in and choose a language to open the research library.</p>;return <WebResearchLibrary languageId={language.id}/>;}
