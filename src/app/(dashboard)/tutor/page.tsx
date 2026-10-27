import { InterfaceText } from "@/components/shared/interface-language";
import { getDefaultPublicLanguage } from "@/lib/public-navigation";
import { WebTutor } from "@/components/shared/web-tutor";
export default async function Page() {
  const language = await getDefaultPublicLanguage();
  return language ? <WebTutor languageId={language.id} languageCode={language.code} /> : <p className="p-6"><InterfaceText source="Choose an active community language." /></p>;
}
