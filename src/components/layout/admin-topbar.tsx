"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

type AdminNotification = {
  id: number;
  type: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export function AdminTopbar({
  userEmail,
  userName,
  userImage,
  isSuperAdmin,
  isMasterSuperAdmin,
  notificationCount,
  languages,
  selectedLanguageId,
  selectedCultureId,
  onMenuClick,
}: {
  userEmail: string;
  userName: string | null;
  userImage: string | null;
  isSuperAdmin: boolean;
  isMasterSuperAdmin: boolean;
  notificationCount: number;
  languages: { id: number; code: string; nativeName: string; isActive: boolean }[];
  selectedLanguageId: number | null;
  selectedCultureId: number | null;
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(notificationCount);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  async function selectLanguage(languageId: number) {
    const response = await fetch("/api/admin/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ languageId }),
    });
    if (response.ok) router.refresh();
  }

  async function selectCulture(cultureId: number | null) {
    const response = await fetch("/api/admin/language", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cultureId }),
    });
    if (response.ok) router.refresh();
  }

  async function toggleNotifications() {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (!nextOpen) return;

    setNotificationsLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const result = await response.json();
      if (response.ok && result.success) {
        setNotifications(result.data);
        setUnreadCount(result.unreadCount);
      }
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function markNotificationRead(notification: AdminNotification) {
    if (notification.read) return;
    const response = await fetch(`/api/notifications/${notification.id}`, { method: "PATCH" });
    if (response.ok) {
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read: true } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    }
  }

  return (
    <header className="bg-[#5c3a1c] border-b border-black/30 h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shadow-lg">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          type="button"
          className="md:hidden text-2xl text-amber-100"
          aria-label="Open menu"
        >
          ☰
        </button>
        <Link
          href="/admin/dashboard"
          className="text-xl font-serif text-amber-50"
        >
          LuoLinguaAI
        </Link>
        {isSuperAdmin && (
          <span className="hidden md:inline text-xs uppercase tracking-wider bg-amber-400/15 text-amber-100 px-2 py-0.5 rounded">
            {isMasterSuperAdmin ? "Master Super Admin" : "Super Admin"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isSuperAdmin && (
          <label className="flex items-center gap-2 text-xs text-amber-100/80">
            <span className="hidden sm:inline">Language</span>
            <select
              aria-label="Choose language to manage"
              value={selectedLanguageId ?? ""}
              onChange={(event) => void selectLanguage(Number(event.target.value))}
              className="max-w-32 rounded-lg border border-amber-100/20 bg-[#6b4724] px-2 py-1.5 text-xs text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {languages.map((language) => <option key={language.id} value={language.id}>{language.nativeName}{language.isActive ? "" : " (inactive)"}</option>)}
            </select>
          </label>
        )}
        {isSuperAdmin && (
          <label className="hidden lg:flex items-center gap-2 text-xs text-amber-100/80">
            <span>Culture</span>
            <select aria-label="Choose culture content" value={selectedCultureId ?? "all"}
              onChange={(event) => void selectCulture(event.target.value === "all" ? null : Number(event.target.value))}
              className="max-w-36 rounded-lg border border-amber-100/20 bg-[#6b4724] px-2 py-1.5 text-xs text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option value="all">All cultures</option>
              {languages.map((language) => <option key={language.id} value={language.id}>{language.nativeName}</option>)}
            </select>
          </label>
        )}
        <div className="relative">
          <button
            type="button"
            onClick={() => void toggleNotifications()}
            className="text-xl text-amber-100/80 hover:text-amber-50 p-2 relative rounded-full hover:bg-amber-100/10"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            🔔
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 text-xs bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <>
              <button type="button" aria-label="Close notifications" className="fixed inset-0 z-10 cursor-default" onClick={() => setNotificationsOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-stone-200 py-2 z-20">
                <div className="px-4 py-2 border-b border-stone-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-stone-800">Notifications</p>
                  {unreadCount > 0 && <span className="text-xs text-stone-500">{unreadCount} unread</span>}
                </div>
                {notificationsLoading ? <p className="px-4 py-5 text-sm text-stone-500">Loading notifications…</p> : notifications.length === 0 ? <p className="px-4 py-5 text-sm text-stone-500">You’re all caught up.</p> : (
                  <ul className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <li key={notification.id} className={`border-b border-stone-100 last:border-0 ${notification.read ? "" : "bg-amber-50/70"}`}>
                        {notification.link ? (
                          <Link href={notification.link} onClick={() => { void markNotificationRead(notification); setNotificationsOpen(false); }} className="block px-4 py-3 hover:bg-stone-50">
                            <span className="block text-sm text-stone-800">{notification.message}</span>
                            <time className="mt-1 block text-xs text-stone-500" dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time>
                          </Link>
                        ) : (
                          <button type="button" onClick={() => void markNotificationRead(notification)} className="block w-full px-4 py-3 text-left hover:bg-stone-50">
                            <span className="block text-sm text-stone-800">{notification.message}</span>
                            <time className="mt-1 block text-xs text-stone-500" dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            type="button"
            aria-label="Open account menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-amber-100/10"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-stone-900 ring-1 ring-amber-200/40 flex items-center justify-center text-sm font-medium overflow-hidden">
              {userImage ? <img src={userImage} alt="" className="w-full h-full rounded-full object-cover" /> : (userName || userEmail).charAt(0).toUpperCase()}
            </div>
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-stone-200 py-2 z-20">
                <div className="px-4 py-2 border-b border-stone-100">
                  <p className="text-sm font-medium text-stone-800 truncate">
                    {userName || "Admin"}
                  </p>
                  <p className="text-xs text-stone-500 truncate">
                    {userEmail}
                  </p>
                </div>
                <Link
                  href="/"
                  className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  View public site
                </Link>
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  My dashboard
                </Link>
                <button
                  onClick={() => signOut({ redirectTo: "/login" })}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
