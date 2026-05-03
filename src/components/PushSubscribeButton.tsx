import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  getVapidPublicKey,
  saveSubscription,
  removeSubscription,
} from "@/server/push.functions";
import { useAuth } from "@/lib/auth";

function urlBase64ToUint8Array(base64String: string) {
  // Sanitize: trim whitespace/newlines and strip any non-base64 chars
  const cleaned = (base64String || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/=+$/, "");
  if (!cleaned) throw new Error("Empty VAPID public key");
  const padding = "=".repeat((4 - (cleaned.length % 4)) % 4);
  const base64 = (cleaned + padding).replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) {
    throw new Error("Invalid VAPID public key format");
  }
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushSubscribeButton() {
  const { user } = useAuth();
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const getKey = useServerFn(getVapidPublicKey);
  const save = useServerFn(saveSubscription);
  const remove = useServerFn(removeSubscription);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  async function enable() {
    if (!user) {
      toast.error("Sign in first to enable notifications.");
      return;
    }
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Notification permission denied.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await getKey();
      if (!publicKey) {
        toast.error("Push not configured on the server.");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON() as any;
      await save({
        data: {
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
          userAgent: navigator.userAgent,
        },
      });
      setSubscribed(true);
      toast.success("Notifications enabled.");
    } catch (e: any) {
      toast.error(e.message ?? "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await remove({ data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Notifications disabled.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return subscribed ? (
    <Button variant="outline" size="sm" disabled={busy} onClick={disable}>
      <BellOff className="size-4 mr-1" /> Notifications on
    </Button>
  ) : (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={enable}
      className="border-spice/40 text-spice hover:bg-spice/10"
    >
      <Bell className="size-4 mr-1" /> Enable notifications
    </Button>
  );
}
