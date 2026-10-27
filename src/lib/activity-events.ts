export function emitActivity(event: { eventType: "view" | "search" | "audio_play" | "video_play"; recordId?: string; query?: string }) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("heritage-activity", { detail: event }));
}
