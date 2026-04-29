import React from "react";

const URL_RE = /(https?:\/\/[^\s]+)/g;

/** Render text with auto-detected URLs as clickable links. Preserves newlines. */
export function Linkify({ text, className }: { text: string | null | undefined; className?: string }) {
  if (!text) return null;
  const parts = text.split(URL_RE);
  return (
    <p className={"whitespace-pre-line break-words " + (className ?? "")}>
      {parts.map((part, i) =>
        URL_RE.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noreferrer noopener"
            className="text-spice underline underline-offset-2 hover:opacity-80"
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </p>
  );
}
