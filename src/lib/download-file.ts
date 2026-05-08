// Helper to open/download a remote file via blob URL.
// Avoids Chrome's "This page has been blocked" warning that can appear
// when opening cross-origin URLs in a new tab from inside an iframe.
import { toast } from "sonner";

export async function openFile(url: string, filename?: string) {
  try {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    if (filename) a.download = filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch (e: any) {
    toast.error(e?.message ?? "Could not open file");
    // fallback: try direct navigation
    window.location.href = url;
  }
}
