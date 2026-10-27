import { InterfaceText } from "@/components/shared/interface-language";
import { getDefaultPublicLanguage } from "@/lib/public-navigation";
import { WebAiTools } from "@/components/shared/web-ai-tools";
export default async function Page() { const language = await getDefaultPublicLanguage(); return language ? <WebAiTools languageId={language.id} /> : <p className="p-6"><InterfaceText source="Choose an active community language." /></p>; }
