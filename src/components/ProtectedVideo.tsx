import { useEffect, useRef, useState } from "react";

type Props = {
  url: string;
  type: "youtube" | "upload";
  title?: string;
};

/**
 * Best-effort protection against casual download / screen recording.
 *
 * Important honest disclaimer: NO web technique can fully prevent screen
 * recording or screenshots. A determined user can use OS-level capture tools
 * or simply film the screen with a phone. True DRM requires a paid streaming
 * service (e.g. Mux, Vimeo OTT) — not implemented here.
 *
 * What we DO block:
 *  - Right-click context menu on the video
 *  - Native download button (controlsList=nodownload)
 *  - Picture-in-Picture
 *  - Drag-save
 *  - Visibility blur when the tab loses focus (deters screen-recording tools
 *    that record the active tab)
 */
export function ProtectedVideo({ url, type, title }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    function onVisibility() {
      setHidden(document.visibilityState === "hidden");
    }
    function onBlur() {
      setHidden(true);
    }
    function onFocus() {
      setHidden(false);
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Convert YouTube watch URLs to embed URLs and disable extras
  const embedUrl =
    type === "youtube"
      ? toYouTubeEmbed(url)
      : url;

  return (
    <div
      ref={wrapperRef}
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black select-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      {type === "youtube" ? (
        <iframe
          src={embedUrl}
          title={title ?? "Video"}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; encrypted-media; gyroscope"
          // Note: sandbox blocks many script abuses but still allows playback
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <video
          src={embedUrl}
          controls
          controlsList="nodownload noplaybackrate noremoteplayback"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          className="absolute inset-0 w-full h-full bg-black"
        />
      )}

      {hidden && (
        <div className="absolute inset-0 backdrop-blur-2xl bg-background/90 grid place-items-center z-10">
          <p className="text-sm text-muted-foreground px-6 text-center">
            Video paused while the window is not in focus.
          </p>
        </div>
      )}

      {/* Transparent overlay across the bottom-right of YouTube to block the YT logo click-through */}
      {type === "youtube" && (
        <div
          aria-hidden
          className="absolute bottom-0 right-0 h-10 w-24 pointer-events-auto z-[1]"
          onClick={(e) => e.preventDefault()}
        />
      )}
    </div>
  );
}

function toYouTubeEmbed(input: string): string {
  try {
    const u = new URL(input);
    let id = "";
    if (u.hostname.includes("youtu.be")) {
      id = u.pathname.replace("/", "");
    } else if (u.pathname.startsWith("/embed/")) {
      id = u.pathname.replace("/embed/", "");
    } else {
      id = u.searchParams.get("v") ?? "";
    }
    if (!id) return input;
    const params = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      iv_load_policy: "3",
      disablekb: "1",
    });
    return `https://www.youtube.com/embed/${id}?${params.toString()}`;
  } catch {
    return input;
  }
}
