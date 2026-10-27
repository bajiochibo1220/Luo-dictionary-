import { InterfaceText } from "@/components/shared/interface-language";
import { getDefaultPublicLanguage } from "@/lib/public-navigation";
import { WebPlaces } from "@/components/shared/web-places";
export default async function Page(){const language=await getDefaultPublicLanguage();return language?<WebPlaces languageId={language.id}/>:<p className="p-6"><InterfaceText source="Choose an active community language." /></p>;}
