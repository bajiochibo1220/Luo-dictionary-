import { InterfaceText } from "@/components/shared/interface-language";
import { getDefaultPublicLanguage } from "@/lib/public-navigation";
import { WebKnowledge } from "@/components/shared/web-knowledge";
export default async function Page(){const language=await getDefaultPublicLanguage();return language?<WebKnowledge languageId={language.id}/>:<p className="p-6"><InterfaceText source="Choose an active community language." /></p>;}
