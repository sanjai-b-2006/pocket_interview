function renderInline(text: string, key: number) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <span key={key}>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

const HEADING_RE = /^#{1,6}\s+/;

/** Renders a small, safe subset of markdown (#-headings, -, **bold**) without dangerouslySetInnerHTML. */
export function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (HEADING_RE.test(trimmed)) {
          return (
            <p key={i} className="text-sm font-semibold text-accent-2 mt-2 first:mt-0">
              {trimmed.replace(HEADING_RE, "")}
            </p>
          );
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <p key={i} className="text-sm text-foreground/80 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-accent-2">
              {renderInline(trimmed.slice(2), i)}
            </p>
          );
        }
        return (
          <p key={i} className="text-sm text-foreground/80">
            {renderInline(trimmed, i)}
          </p>
        );
      })}
    </div>
  );
}
