import { InterfaceText } from "@/components/shared/interface-language";
import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { CheckAppUpdates } from "@/components/pwa/app-updates";
export const metadata = {
  title: "App Updates & Installation · Luo Heritage",
  description: "Update or install Luo Heritage on your phone or computer.",
};

export default function MobileAppsPage() {
  return (
    <main className="min-h-screen bg-[#cfc09a] px-5 py-12 text-stone-900">
      <div className="mx-auto max-w-3xl">
        <BrandMark className="h-20 w-20 shadow-lg" />
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-amber-900"><InterfaceText source="Luo Heritage on every device" /></p>
        <h1 className="mt-3 font-serif text-4xl"><InterfaceText source="App updates & installation" /></h1>
        <p className="mt-3 max-w-2xl text-stone-700"><InterfaceText source="Use the same Luo Heritage app on your computer and phone. New releases are checked while the app is open and when you return to it online." /></p>
        <section className="mt-8 rounded-2xl border border-amber-900/10 bg-[#fff5df] p-6 shadow-xs" aria-labelledby="updates-heading">
          <h2 id="updates-heading" className="font-serif text-2xl"><InterfaceText source="Keep your app up to date" /></h2>
          <p className="mt-2 text-sm text-stone-700"><InterfaceText source="When you see " /><strong><InterfaceText source="Update available" /></strong><InterfaceText source=", save your work and select " /><strong><InterfaceText source="Update now" /></strong><InterfaceText source=". You can choose " /><strong><InterfaceText source="Later" /></strong><InterfaceText source=" to finish what you’re doing first." /></p>
          <CheckAppUpdates />
        </section>
        <section className="mt-6 rounded-2xl border border-amber-900/10 bg-white/60 p-6" aria-labelledby="icon-heading">
          <h2 id="icon-heading" className="font-serif text-2xl"><InterfaceText source="Still seeing the old “L” icon?" /></h2>
          <p className="mt-2 text-sm text-stone-700"><InterfaceText source="The book, sunrise, and lake artwork is the same on every device. Your browser manages the installed icon and may ask you to approve its new name or icon. In Chrome, look for " /><strong><InterfaceText source="App update available → Review app update → Update" /></strong>.</p>
          <p className="mt-3 text-sm text-stone-700"><InterfaceText source="If the old icon remains, reinstall the app once using the steps below. On a computer, unpin the old shortcut first and pin the new app after installation. Keep browser site data when offered that choice. Save unfinished work before removing an app; your account and submitted contributions remain in Luo Heritage." /></p>
        </section>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <section className="rounded-2xl bg-[#b89a68] p-6 shadow-xs" aria-labelledby="desktop-heading">
            <h2 id="desktop-heading" className="font-serif text-2xl"><InterfaceText source="On your computer" /></h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-stone-800">
              <li><InterfaceText source="For an old installation, open its menu and choose " /><strong><InterfaceText source="Uninstall" /></strong><InterfaceText source=". Leave " /><strong><InterfaceText source="delete browsing data" /></strong><InterfaceText source=" unchecked if offered." /></li>
              <li><InterfaceText source="Open Luo Heritage in Chrome or Edge using the same site address you normally use." /></li>
              <li><InterfaceText source="Select the address-bar " /><strong><InterfaceText source="Install" /></strong><InterfaceText source=" button, or choose " /><strong><InterfaceText source="Install page as app" /></strong> / <strong><InterfaceText source="Apps → Install this site as an app" /></strong><InterfaceText source=" in the browser menu." /></li>
              <li><InterfaceText source="Open the new app and choose " /><strong><InterfaceText source="Pin to taskbar" /></strong>.</li>
            </ol>
          </section>
          <section className="rounded-2xl bg-[#b89a68] p-6 shadow-xs" aria-labelledby="phone-heading">
            <h2 id="phone-heading" className="font-serif text-2xl"><InterfaceText source="On your phone" /></h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-stone-800">
              <li><InterfaceText source="If the old icon stays, remove the old installed app or Home Screen shortcut." /></li>
              <li><InterfaceText source="Open Luo Heritage in " /><strong><InterfaceText source="Chrome on Android" /></strong><InterfaceText source=" or " /><strong><InterfaceText source="Safari on iPhone" /></strong>.</li>
              <li><InterfaceText source="On Android, open the browser menu and select " /><strong><InterfaceText source="Install app" /></strong><InterfaceText source=" or " /><strong><InterfaceText source="Add to Home screen" /></strong>.</li>
              <li><InterfaceText source="On iPhone, open the Share menu, choose " /><strong><InterfaceText source="Add to Home Screen" /></strong><InterfaceText source=", and confirm " /><strong><InterfaceText source="Add" /></strong>.</li>
            </ol>
          </section>
        </div>
        <p className="mt-8 text-xs text-stone-700"><InterfaceText source="Public and administrative accounts use the same app. Your permissions determine the areas you can access. Device launchers may give the icon a different outer shape." /></p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-900"><InterfaceText source="Return to Luo Heritage" /></Link>
      </div>
    </main>
  );
}
