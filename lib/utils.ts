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

