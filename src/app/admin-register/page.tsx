import { redirect } from "next/navigation";

export default function AdminRegisterRedirect() {
  redirect("/login");
}
