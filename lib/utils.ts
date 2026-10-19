export function unescapeHtmlLinks(htmlContent: string): string {
  if (!htmlContent) return htmlContent;
  
  // Helper to unescape attributes inside matched tag (e.g. quotes and ampersands)
  const replacer = (match: string) => {
    return match
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  };

  // 1. Unescape anchor tags <a ...> and </a>
  let res = htmlContent.replace(/&lt;a\s+.*?&gt;/gi, replacer);
  res = res.replace(/&lt;\/a\s*&gt;/gi, "</a>");
  
  // 2. Unescape common formatting tags: b, strong, i, em, u, br, p, span
  const formattingTags = ["b", "strong", "i", "em", "u", "br", "p", "span"];
  formattingTags.forEach((tag) => {
    const startRegex = new RegExp(`&lt;${tag}\\b.*?&gt;`, "gi");
    res = res.replace(startRegex, replacer);
    const endRegex = new RegExp(`&lt;\\/${tag}\\s*&gt;`, "gi");
    res = res.replace(endRegex, `</${tag}>`);
  });
  
  res = res.replace(/&lt;br\s*\/?[^&]*&gt;/gi, "<br />");
  return res;
}

export function cleanHtmlText(html: string): string {
  if (!html) return "";
  let text = html.replace(/<[^>]*>/g, "");
  // Decode common HTML entities (case-insensitive)
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/gi, "'");
  return text.trim();
}

export function sanitizeEventTitle(rawTitle: string): string {
  if (!rawTitle) return "";
  let processed = rawTitle;
  // Ensure spaces between inline tags and words are preserved
  processed = processed.replace(/([a-zA-Z0-9])(<span)/g, "$1 $2");
  processed = processed.replace(/(<\/span>)([a-zA-Z0-9])/g, "$1 $2");
  return processed;
}

export function extractAlignmentFromHtml(html: string): "left" | "center" | "right" | null {
  if (!html) return null;
  const match = html.match(/text-align:\s*(left|center|right)/i) || html.match(/align=["'](left|center|right)["']/i);
  if (match) return match[1].toLowerCase() as "left" | "center" | "right";
  return null;
}

export function renderFormattedCardLayout(rawText: string | null | undefined): string {
  if (!rawText) return "";

  let text = String(rawText);

  // 1. Unescape any escaped HTML entities like &lt;span...&gt;
  text = unescapeHtmlLinks(text);

  // 2. Convert markdown bold *text* and **text** into <strong>text</strong>
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<strong>$1</strong>");

  // 3. Convert BBCode tags like [color=#hex]...[/color] or [color:#hex]...[/color]
  text = text.replace(/\[color[=:]\s*([^\]]+)\]([\s\S]*?)\[\/color\]/gi, (_m, color, content) => {
    return `<span style="color: ${color.trim()};">${content}</span>`;
  });

  text = text.replace(/\[font[=:]\s*([^\]]+)\]([\s\S]*?)\[\/font\]/gi, (_m, font, content) => {
    const f = font.trim().toLowerCase();
    const fontMap: Record<string, string> = {
      sans: "ui-sans-serif, system-ui, sans-serif",
      mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      bricolage: "var(--font-bricolage), sans-serif",
      serif: "ui-serif, Georgia, Cambria, serif"
    };
    return `<span style="font-family: ${fontMap[f] || font};">${content}</span>`;
  });

  text = text.replace(/\[weight[=:]\s*([^\]]+)\]([\s\S]*?)\[\/weight\]/gi, (_m, weight, content) => {
    return `<span style="font-weight: ${weight.trim()};">${content}</span>`;
  });

  text = text.replace(/\[size[=:]\s*([^\]]+)\]([\s\S]*?)\[\/size\]/gi, (_m, size, content) => {
    return `<span style="font-size: ${size.trim()};">${content}</span>`;
  });

  // 4. Map font aliases inside style attributes (e.g. font-family: mono -> ui-monospace, ...)
  text = text.replace(/font-family\s*:\s*([^;"]+)/gi, (match, val) => {
    const trimmed = val.trim().toLowerCase();
    if (trimmed === "mono") return "font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    if (trimmed === "bricolage") return "font-family: var(--font-bricolage), sans-serif";
    if (trimmed === "sans") return "font-family: ui-sans-serif, system-ui, sans-serif";
    if (trimmed === "serif") return "font-family: ui-serif, Georgia, Cambria, serif";
    return match;
  });

  // 5. Sanitize HTML tags: only allow span, strong, b, em, i, br, p, div, u
  text = text.replace(/<(script|iframe|object|embed|style|link|svg|math)[^>]*>[\s\S]*?<\/\1>/gi, "");
  text = text.replace(/<(script|iframe|object|embed|style|link|svg|math)[^>]*\/?>(?!<\/\1>)/gi, "");
  text = text.replace(/\s*on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, "");
  text = text.replace(/javascript\s*:/gi, "blocked:");

  return text;
}


