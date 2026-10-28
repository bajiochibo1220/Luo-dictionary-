"use client";
import { InterfaceText } from "@/components/shared/interface-language";

import { useState } from "react";
import { AdminTable } from "@/components/admin/admin-table";
import { AddAdminModal } from "@/components/admin/add-admin-modal";

type Admin = {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  isMasterSuperAdmin: boolean;
  status: string;
  languageRoles: {
    id: number;
    role: string;
    language: { code: string; nativeName: string };
  }[];
};

type Language = { id: number; code: string; nativeName: string };

export function AdminsClient({
  admins,
  languages,
  isMasterSuperAdmin,
}: {
  admins: Admin[];
  languages: Language[];
  isMasterSuperAdmin: boolean;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <header className="workspace-heading mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif text-stone-800 mb-1"><InterfaceText source="Administrators" /></h1>
          <p className="text-sm text-stone-500">
            {admins.length} <InterfaceText source={admins.length === 1 ? "administrator" : "administrators"} /> · {admins.filter((admin) => admin.isSuperAdmin).length}<InterfaceText source=" Super Admins" /></p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
        ><InterfaceText source="+ Add Admin" /></button>
      </header>

      <div className="mb-6 bg-linear-to-br from-amber-50 to-stone-50 rounded-xl border border-amber-100 p-5">
        <h2 className="text-xs uppercase tracking-wider text-amber-800 mb-2 font-bold"><InterfaceText source="How admin accounts work" /></h2>
        <p className="text-sm text-stone-700 leading-relaxed">
          <InterfaceText source={isMasterSuperAdmin ? "You are the Master Super Admin. Create Super Admins and assign the languages they oversee, or create uploaders, editors, and publishers for specific languages. Use Manage account to edit names, emails and duties. Use Change password for any account, including your own." : "As a Super Admin, you can create administrators only for languages assigned to you. Only the Master Super Admin can create, deactivate, or revoke Super Admin accounts."} /><InterfaceText source=" Create accounts here, share the email and password with them directly, and they sign in at " /><code className="bg-white px-1.5 py-0.5 rounded-sm text-amber-800"><InterfaceText source="/login" /></code>{" "}<InterfaceText source="with those credentials. An approved Google sign-in can also use the same account email." /></p>
      </div>

      <AdminTable admins={admins} isMasterSuperAdmin={isMasterSuperAdmin} />

      {showModal && (
        <AddAdminModal
          languages={languages}
          isMasterSuperAdmin={isMasterSuperAdmin}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
