import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { X, Megaphone } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  body_html: string;
  published_at: string;
};

export function AnnouncementBanner() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements_active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id,title,body_html,published_at")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(5);
      return (data ?? []) as Announcement[];
    },
  });

  const { data: dismissed = [] } = useQuery({
    queryKey: ["announcement_dismissals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("announcement_dismissals")
        .select("announcement_id")
        .eq("user_id", user.id);
      return (data ?? []).map((d) => d.announcement_id);
    },
    enabled: !!user,
  });

  // For logged-out visitors we keep dismissals in localStorage.
  const [localDismissed, setLocalDismissed] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("dismissed_announcements") || "[]");
    } catch {
      return [];
    }
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      if (user) {
        await supabase
          .from("announcement_dismissals")
          .insert({ announcement_id: id, user_id: user.id });
      } else {
        const next = [...localDismissed, id];
        setLocalDismissed(next);
        localStorage.setItem("dismissed_announcements", JSON.stringify(next));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcement_dismissals"] });
    },
  });

  const dismissedIds = new Set([...dismissed, ...localDismissed]);
  const visible = announcements.filter((a) => !dismissedIds.has(a.id));
  if (visible.length === 0) return null;
  const a = visible[0];

  return (
    <div className="border-b bg-spice/5">
      <div className="container mx-auto px-4 py-3 flex items-start gap-3">
        <Megaphone className="size-4 mt-0.5 text-spice shrink-0" />
        <div className="flex-1 min-w-0 text-sm">
          <div className="font-medium">{a.title}</div>
          <div
            className="mt-0.5 text-muted-foreground prose prose-sm max-w-none [&_a]:text-spice [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: a.body_html }}
          />
        </div>
        <button
          aria-label="Dismiss"
          onClick={() => dismiss.mutate(a.id)}
          className="text-muted-foreground hover:text-foreground p-1"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
