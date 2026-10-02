import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProfilePreferencesForm } from "@/components/forms/profile-preferences-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { profileTypes: true } });
  if (!user) redirect("/login");
  return <ProfilePreferencesForm initialTypes={user.profileTypes} />;
}
