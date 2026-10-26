import { redirect } from "next/navigation";

// Preserve saved links to the unified editorial workspace.
export default function EditorQueuePage() { redirect("/admin/validation-queue"); }
