import { useRef } from "react";

type Props = {
  url: string;
  type: "youtube" | "upload";
  title?: string;
};

/**
 * Best-effort protection against casual download / right-click.
 * No web technique can fully prevent screen recording — for true DRM use a
 * paid streaming service (Mux, Vimeo OTT). This player blocks:
 *  - Right-click context menu
 *  - Native download button (controlsList=nodownload)
 *  - Picture-in-Picture
 *  - Drag-save
 */
export function ProtectedVideo({ url, type, title }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const embedUrl = type === "youtube" ? toYouTubeEmbed(url) : url;

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
