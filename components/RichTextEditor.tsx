"use client";

import React, { useRef, useEffect, useState, useImperativeHandle } from "react";
import { 
  Bold as BoldIcon, 
  Italic as ItalicIcon, 
  Underline as UnderlineIcon, 
  PaintBucket, 
  Grid, 
  ChevronDown, 
  ChevronUp,
  CaseSensitive,
  Type,
  Sun,
  Moon,
  AlignLeft,
  AlignCenter,
  AlignRight
} from "lucide-react";

export interface RichTextEditorHandle {
  insertText: (text: string) => void;
  focus: () => void;
  getEditorElement: () => HTMLDivElement | null;
}

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onAlignChange?: (align: "left" | "center" | "right") => void;
  externalAlign?: "left" | "center" | "right";
  placeholder?: string;
  className?: string;
  minHeight?: string;
  availableTokens?: string[];
  toolbarMode?: "always" | "on-focus";
  variant?: "full" | "simple";
}

const FONTS = [
  { label: "Calibri", value: "Calibri, sans-serif" },
  { label: "Helvetica Neue", value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "Outfit", value: "'Outfit', sans-serif" },
  { label: "Bricolage", value: "'Bricolage Grotesque', sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier", value: "'Courier New', Courier, monospace" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "System Sans", value: "sans-serif" }
];

const FONT_SIZES = [
  "10px", "11px", "12px", "14px", "15px", "16px", "17px", "18px", "20px", "24px", "28px", "32px", "36px", "40px", "48px", "56px", "64px", "72px", "80px", "96px"
];

const TEXT_COLORS = [
  // Neutrals, Whites, Grays & Slates
  { name: "White", value: "#ffffff", group: "Neutrals & Slates" },
  { name: "Slate 100 (Ice)", value: "#f1f5f9", group: "Neutrals & Slates" },
  { name: "Slate 200 (Silver)", value: "#e2e8f0", group: "Neutrals & Slates" },
  { name: "Slate 300 (Light Gray)", value: "#cbd5e1", group: "Neutrals & Slates" },
  { name: "Slate 400 (Muted Gray)", value: "#94a3b8", group: "Neutrals & Slates" },
  { name: "Gray 500", value: "#64748b", group: "Neutrals & Slates" },
  { name: "Slate 600 (Charcoal)", value: "#475569", group: "Neutrals & Slates" },
  { name: "Slate 700 (Dark Slate)", value: "#334155", group: "Neutrals & Slates" },
  { name: "Slate 800", value: "#0f172a", group: "Neutrals & Slates" },
  { name: "Pure Black", value: "#000000", group: "Neutrals & Slates" },

  // Reds, Roses & Crimsons
  { name: "Red 300 (Soft Red)", value: "#fca5a5", group: "Reds & Roses" },
  { name: "Red 400 (Coral Red)", value: "#f87171", group: "Reds & Roses" },
  { name: "Red 500", value: "#ef4444", group: "Reds & Roses" },
  { name: "Red 600 (Crimson)", value: "#dc2626", group: "Reds & Roses" },
  { name: "Red 700 (Ruby)", value: "#b91c1c", group: "Reds & Roses" },
  { name: "Red 900 (Burgundy)", value: "#7f1d1d", group: "Reds & Roses" },
  { name: "Rose 400", value: "#fb7185", group: "Reds & Roses" },
  { name: "Rose 500", value: "#f43f5e", group: "Reds & Roses" },
  { name: "Rose 600", value: "#e11d48", group: "Reds & Roses" },

  // Oranges, Ambers & Golds
  { name: "Orange 300 (Peach)", value: "#fdba74", group: "Oranges & Golds" },
  { name: "Orange 400 (Sunset)", value: "#fb923c", group: "Oranges & Golds" },
  { name: "Orange 500", value: "#f97316", group: "Oranges & Golds" },
  { name: "Orange 600 (Burnt Orange)", value: "#ea580c", group: "Oranges & Golds" },
  { name: "Amber 300 (Warm Gold)", value: "#fcd34d", group: "Oranges & Golds" },
  { name: "Amber 400 (Bright Gold)", value: "#fbbf24", group: "Oranges & Golds" },
  { name: "Amber 500 (Rich Amber)", value: "#f59e0b", group: "Oranges & Golds" },
  { name: "Champagne Gold", value: "#d4af37", group: "Oranges & Golds" },
  { name: "Bronze", value: "#b45309", group: "Oranges & Golds" },

  // Yellows & Limes
  { name: "Cream / Ivory", value: "#fef9c3", group: "Yellows & Limes" },
  { name: "Yellow 300 (Lemon)", value: "#fde047", group: "Yellows & Limes" },
  { name: "Yellow 400 (Sunshine)", value: "#facc15", group: "Yellows & Limes" },
  { name: "Yellow 500", value: "#eab308", group: "Yellows & Limes" },
  { name: "Lime 300 (Neon Lime)", value: "#bef264", group: "Yellows & Limes" },
  { name: "Lime 400 (Padel Lime)", value: "#a3e635", group: "Yellows & Limes" },
  { name: "Lime 500 (Electric Lime)", value: "#84cc16", group: "Yellows & Limes" },
  { name: "Lime 600 (Court Green)", value: "#65a30d", group: "Yellows & Limes" },

  // Greens, Emeralds & Teals
  { name: "Green 300 (Mint)", value: "#86efac", group: "Greens & Teals" },
  { name: "Green 400 (Spring Green)", value: "#4ade80", group: "Greens & Teals" },
  { name: "Green 500", value: "#22c55e", group: "Greens & Teals" },
  { name: "Green 600 (Kelly Green)", value: "#16a34a", group: "Greens & Teals" },
  { name: "Green 800 (Forest Green)", value: "#166534", group: "Greens & Teals" },
  { name: "Emerald 400", value: "#34d399", group: "Greens & Teals" },
  { name: "Emerald 500", value: "#10b981", group: "Greens & Teals" },
  { name: "Emerald 600", value: "#059669", group: "Greens & Teals" },
  { name: "Teal 300 (Aqua)", value: "#5eead4", group: "Greens & Teals" },
  { name: "Teal 400 (Turquoise)", value: "#2dd4bf", group: "Greens & Teals" },
  { name: "Teal 500", value: "#14b8a6", group: "Greens & Teals" },
  { name: "Teal 600 (Deep Teal)", value: "#0d9488", group: "Greens & Teals" },

  // Cyans, Skies, Blues & Navies
  { name: "Cyan 300 (Electric Cyan)", value: "#67e8f9", group: "Blues & Navies" },
  { name: "Cyan 400", value: "#22d3ee", group: "Blues & Navies" },
  { name: "Cyan 500", value: "#06b6d4", group: "Blues & Navies" },
  { name: "Sky 300 (Light Sky)", value: "#7dd3fc", group: "Blues & Navies" },
  { name: "Sky 400 (Sky Blue)", value: "#38bdf8", group: "Blues & Navies" },
  { name: "Sky 500 (Ocean Blue)", value: "#0ea5e9", group: "Blues & Navies" },
  { name: "Blue 300 (Baby Blue)", value: "#93c5fd", group: "Blues & Navies" },
  { name: "Blue 400 (Azure)", value: "#60a5fa", group: "Blues & Navies" },
  { name: "Blue 500", value: "#3b82f6", group: "Blues & Navies" },
  { name: "Blue 600 (Royal Blue)", value: "#2563eb", group: "Blues & Navies" },
  { name: "Blue 700 (Cobalt)", value: "#1d4ed8", group: "Blues & Navies" },
  { name: "Blue 900 (Midnight Navy)", value: "#1e3a8a", group: "Blues & Navies" },

  // Indigos, Violets, Purples & Pinks
  { name: "Indigo 300 (Periwinkle)", value: "#a5b4fc", group: "Purples & Pinks" },
  { name: "Indigo 400", value: "#818cf8", group: "Purples & Pinks" },
  { name: "Indigo 500", value: "#6366f1", group: "Purples & Pinks" },
  { name: "Indigo 600", value: "#4f46e5", group: "Purples & Pinks" },
  { name: "Violet 400 (Lavender)", value: "#a78bfa", group: "Purples & Pinks" },
  { name: "Violet 500", value: "#8b5cf6", group: "Purples & Pinks" },
  { name: "Purple 300 (Lilac)", value: "#d8b4fe", group: "Purples & Pinks" },
  { name: "Purple 400", value: "#c084fc", group: "Purples & Pinks" },
  { name: "Purple 500", value: "#a855f7", group: "Purples & Pinks" },
  { name: "Purple 600 (Amethyst)", value: "#9333ea", group: "Purples & Pinks" },
  { name: "Corporate Purple", value: "#7c1c91", group: "Purples & Pinks" },
  { name: "Fuchsia 400 (Magenta)", value: "#e879f9", group: "Purples & Pinks" },
  { name: "Fuchsia 500", value: "#d946ef", group: "Purples & Pinks" },
  { name: "Pink 300 (Blush)", value: "#f9a8d4", group: "Purples & Pinks" },
  { name: "Pink 400 (Hot Pink)", value: "#f472b6", group: "Purples & Pinks" },
  { name: "Pink 500", value: "#ec4899", group: "Purples & Pinks" },
  { name: "Pink 600", value: "#db2777", group: "Purples & Pinks" }
];

const HIGHLIGHT_COLORS = [
  { name: "Clear", value: "transparent" },
  { name: "Yellow Light", value: "#fef08a" },
  { name: "Amber Light", value: "#fde68a" },
  { name: "Orange Light", value: "#ffedd5" },
  { name: "Red Light", value: "#fee2e2" },
  { name: "Rose Light", value: "#ffe4e6" },
  { name: "Pink Light", value: "#fce7f3" },
  { name: "Fuchsia Light", value: "#fae8ff" },
  { name: "Purple Light", value: "#f3e8ff" },
  { name: "Indigo Light", value: "#e0e7ff" },
  { name: "Blue Light", value: "#dbeafe" },
  { name: "Sky Light", value: "#e0f2fe" },
  { name: "Cyan Light", value: "#cffafe" },
  { name: "Teal Light", value: "#ccfbf1" },
  { name: "Emerald Light", value: "#d1fae5" },
  { name: "Green Light", value: "#dcfce7" },
  { name: "Lime Light", value: "#ecfccb" },
  { name: "Slate Light", value: "#f1f5f9" },
  { name: "Dark Slate Badge", value: "#1e293b" },
  { name: "Dark Navy Badge", value: "#172554" }
];

const RichTextEditor = React.forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor(
    {
      value,
      onChange,
      onAlignChange,
      externalAlign,
      placeholder = "Type template content here...",
      className = "",
      minHeight = "200px",
      availableTokens = [],
      toolbarMode = "always",
      variant = "full"
    },
    ref
  ) {
  const editorRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);

  const insertTextAtCursor = (text: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();
    const sel = window.getSelection();
    const isInside = sel && sel.rangeCount > 0 && editorRef.current.contains(sel.getRangeAt(0).commonAncestorContainer);
    if (isInside) {
      document.execCommand("insertText", false, text);
    } else {
      const textNode = document.createTextNode(text);
      editorRef.current.appendChild(textNode);
      const newRange = document.createRange();
      newRange.selectNodeContents(textNode);
      newRange.collapse(false);
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(newRange);
        savedSelectionRef.current = newRange;
      }
    }
    triggerChange();
    saveSelection();
  };

  useImperativeHandle(ref, () => ({
    insertText: insertTextAtCursor,
    focus: () => {
      editorRef.current?.focus();
    },
    getEditorElement: () => editorRef.current
  }), []);

  const [activeFont, setActiveFont] = useState("Calibri, sans-serif");
  const [activeSize, setActiveSize] = useState("16px");
  const [activeAlign, setActiveAlign] = useState<"left" | "center" | "right">("left");
  const [activeTextColor, setActiveTextColor] = useState("");
  const [customHexInput, setCustomHexInput] = useState("");
  const [showUnderlineDropdown, setShowUnderlineDropdown] = useState(false);
  const [showBorderDropdown, setShowBorderDropdown] = useState(false);
  const [showTextColorDropdown, setShowTextColorDropdown] = useState(false);
  const [showHighlightDropdown, setShowHighlightDropdown] = useState(false);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [editorBg, setEditorBg] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (externalAlign && (externalAlign === "left" || externalAlign === "center" || externalAlign === "right")) {
      setActiveAlign(externalAlign);
      if (editorRef.current) {
        editorRef.current.style.textAlign = externalAlign;
      }
    }
  }, [externalAlign]);

  const updateActiveStylesFromSelection = () => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      let parentEl = range.commonAncestorContainer as HTMLElement;
      if (parentEl.nodeType === 3) {
        parentEl = parentEl.parentNode as HTMLElement;
      }
      
      if (editorRef.current?.contains(parentEl)) {
        const computedStyle = window.getComputedStyle(parentEl);
        
        const fontSizeVal = computedStyle.fontSize;
        if (fontSizeVal) {
          const pxVal = parseFloat(fontSizeVal);
          const roundedPx = `${Math.round(pxVal)}px`;
          if (FONT_SIZES.includes(roundedPx)) {
            setActiveSize(roundedPx);
          }
        }
        
        const fontFamilyVal = computedStyle.fontFamily;
        if (fontFamilyVal) {
          const matchedFont = FONTS.find(f => 
            f.value.toLowerCase().includes(fontFamilyVal.toLowerCase()) || 
            fontFamilyVal.toLowerCase().includes(f.value.toLowerCase()) ||
            f.label.toLowerCase() === fontFamilyVal.replace(/['"]/g, "").toLowerCase()
          );
          if (matchedFont) {
            setActiveFont(matchedFont.value);
          } else {
            const cleanName = fontFamilyVal.replace(/['"]/g, "").split(",")[0].trim();
            const fallbackMatch = FONTS.find(f => f.label.toLowerCase() === cleanName.toLowerCase());
            if (fallbackMatch) {
              setActiveFont(fallbackMatch.value);
            }
          }
        }

        const textAlignVal = computedStyle.textAlign;
        if (textAlignVal === "center" || textAlignVal === "right" || textAlignVal === "left") {
          setActiveAlign(textAlignVal);
        }
      }
    }
  };

  // Sync content with value if editor is not active
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      if (document.activeElement !== editorRef.current) {
        let cleanVal = value || "";
        if (cleanVal.includes("&lt;") && /&lt;\/?(span|font|strong|b|em|i|div|p|br)/i.test(cleanVal)) {
          cleanVal = cleanVal
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, "&");
        }
        editorRef.current.innerHTML = cleanVal;
      }
    }
    
    // Parse default font size and font family on initial mount or value changes
    if (value) {
      try {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = value;
        const fullText = tempDiv.textContent?.trim() || "";
        
        // Prefer top-level wrapper span or element that encloses the text
        const topEl = tempDiv.firstElementChild as HTMLElement | null;
        if (topEl && (topEl.tagName === "SPAN" || topEl.tagName === "DIV") && topEl.textContent?.trim() === fullText) {
          const fs = topEl.style.fontSize;
          const ff = topEl.style.fontFamily;
          const ta = topEl.style.textAlign;
          if (fs && FONT_SIZES.includes(fs)) {
            setActiveSize(fs);
          }
          if (ff) {
            const matched = FONTS.find(f => f.value.includes(ff) || ff.includes(f.value));
            if (matched) setActiveFont(matched.value);
          }
          if (ta === "left" || ta === "center" || ta === "right") {
            setActiveAlign(ta);
          }
        } else {
          // If no single top-level span, check if styled span exists
          const styledSpan = tempDiv.querySelector("span[style], div[style]") as HTMLElement | null;
          if (styledSpan && styledSpan.textContent?.trim() === fullText) {
            const fs = styledSpan.style.fontSize;
            const ff = styledSpan.style.fontFamily;
            const ta = styledSpan.style.textAlign;
            if (fs && FONT_SIZES.includes(fs)) {
              setActiveSize(fs);
            }
            if (ff) {
              const matched = FONTS.find(f => f.value.includes(ff) || ff.includes(f.value));
              if (matched) setActiveFont(matched.value);
            }
            if (ta === "left" || ta === "center" || ta === "right") {
              setActiveAlign(ta);
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse font settings from value:", e);
      }
    }
  }, [value]);

  const saveSelection = () => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedSelectionRef.current = range;
      }
    }
  };

  const restoreSelection = () => {
    if (typeof window === "undefined" || !savedSelectionRef.current) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
  };

  const triggerChange = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    triggerChange();
    saveSelection();
  };

  // Helper to remove empty spans and unwrap style-less spans
  const cleanSpans = (container: HTMLElement) => {
    container.querySelectorAll("span").forEach(span => {
      if (!span.textContent && !span.querySelector("img, br")) {
        span.remove();
        return;
      }
      const styleAttr = span.getAttribute("style");
      if ((!styleAttr || styleAttr.trim() === "") && span.attributes.length <= 1) {
        const parent = span.parentNode;
        while (span.firstChild) {
          parent?.insertBefore(span.firstChild, span);
        }
        parent?.removeChild(span);
      }
    });
  };

  // Helper: Applies style properties across the entire editor contents cleanly
  const applyStyleToEntireContent = (styleProps: Record<string, string>) => {
    if (!editorRef.current) return;
    
    // 1. Remove conflicting inline style properties from all descendant elements
    Object.keys(styleProps).forEach(prop => {
      editorRef.current!.querySelectorAll("*").forEach(node => {
        const el = node as HTMLElement;
        if (el.style && (el.style as any)[prop]) {
          (el.style as any)[prop] = "";
          const remainingStyle = el.getAttribute("style");
          if (!remainingStyle || remainingStyle.trim() === "") {
            el.removeAttribute("style");
          }
        }
      });
    });

    cleanSpans(editorRef.current);
    
    // 2. Wrap all child nodes of editorRef in a single top-level span with desired styles,
    // or update the existing top-level span wrapper if present
    const hasContent = editorRef.current.textContent && editorRef.current.textContent.trim().length > 0;
    if (hasContent) {
      if (editorRef.current.children.length === 1 && editorRef.current.firstElementChild?.tagName === "SPAN") {
        const topSpan = editorRef.current.firstElementChild as HTMLElement;
        Object.entries(styleProps).forEach(([k, v]) => {
          (topSpan.style as any)[k] = v;
        });
      } else {
        const wrapper = document.createElement("span");
        Object.entries(styleProps).forEach(([k, v]) => {
          (wrapper.style as any)[k] = v;
        });
        while (editorRef.current.firstChild) {
          wrapper.appendChild(editorRef.current.firstChild);
        }
        editorRef.current.appendChild(wrapper);
      }
    }
    
    // 3. Set base container styles so UI immediately matches
    Object.entries(styleProps).forEach(([k, v]) => {
      (editorRef.current!.style as any)[k] = v;
    });
    
    triggerChange();
  };

  // Helper: Applies style properties to the active selection cleanly
  const applyStyleToSelection = (styleProps: Record<string, string>) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
    const range = sel.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return false;
    
    try {
      const fragment = range.extractContents();
      
      // Remove conflicting properties on extracted fragment nodes so parent style cascades
      Object.keys(styleProps).forEach(prop => {
        fragment.querySelectorAll?.("*").forEach(node => {
          const el = node as HTMLElement;
          if (el.style && (el.style as any)[prop]) {
            (el.style as any)[prop] = "";
            const remainingStyle = el.getAttribute("style");
            if (!remainingStyle || remainingStyle.trim() === "") {
              el.removeAttribute("style");
            }
          }
        });
      });
      
      const wrapper = document.createElement("span");
      Object.entries(styleProps).forEach(([k, v]) => {
        (wrapper.style as any)[k] = v;
      });
      wrapper.appendChild(fragment);
      range.insertNode(wrapper);
      
      // Reselect the styled wrapper
      const newRange = document.createRange();
      newRange.selectNodeContents(wrapper);
      sel.removeAllRanges();
      sel.addRange(newRange);
      savedSelectionRef.current = newRange;
      
      triggerChange();
      return true;
    } catch (e) {
      console.error("Failed to apply style to selection:", e);
      return false;
    }
  };

  // Helper: Ensures there is an active text selection. If collapsed/empty, selects the ENTIRE editor contents.
  const ensureSelection = () => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel) return false;
    
    const hasSelection = sel.rangeCount > 0 && 
      !sel.isCollapsed && 
      sel.toString().length > 0 &&
      editorRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer);
      
    if (hasSelection) return true;
    
    // Select the entire content of the editor if it's currently focused or we have text
    if (editorRef.current && editorRef.current.innerHTML && editorRef.current.innerHTML !== "<br>") {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      sel.removeAllRanges();
      sel.addRange(range);
      savedSelectionRef.current = range;
      return true;
    }
    return false;
  };

  // Helper: Collapses selection to the end of the text, returning cursor focus there
  const collapseToEnd = () => {
    const sel = window.getSelection();
    if (sel && editorRef.current) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      savedSelectionRef.current = range;
    }
  };

  const applyBold = () => {
    ensureSelection();
    document.execCommand("bold");
    triggerChange();
  };

  const applyItalic = () => {
    ensureSelection();
    document.execCommand("italic");
    triggerChange();
  };

  const applyFontFamily = (fontFamily: string) => {
    setActiveFont(fontFamily);
    if (!editorRef.current) return;
    
    restoreSelection();
    const sel = window.getSelection();
    const hasHighlight = sel && sel.rangeCount > 0 && !sel.isCollapsed && 
      sel.toString().trim().length > 0 && 
      editorRef.current.contains(sel.getRangeAt(0).commonAncestorContainer);
      
    const editorText = editorRef.current.textContent?.trim() || "";
    const selectedText = hasHighlight ? (sel?.toString().trim() || "") : "";
    
    if (!hasHighlight || selectedText === editorText) {
      applyStyleToEntireContent({ fontFamily: fontFamily });
    } else {
      applyStyleToSelection({ fontFamily: fontFamily });
    }
  };

  const applyFontSize = (size: string) => {
    setActiveSize(size);
    if (!editorRef.current) return;
    
    restoreSelection();
    const sel = window.getSelection();
    const hasHighlight = sel && sel.rangeCount > 0 && !sel.isCollapsed && 
      sel.toString().trim().length > 0 && 
      editorRef.current.contains(sel.getRangeAt(0).commonAncestorContainer);
      
    const editorText = editorRef.current.textContent?.trim() || "";
    const selectedText = hasHighlight ? (sel?.toString().trim() || "") : "";
    
    if (!hasHighlight || selectedText === editorText) {
      applyStyleToEntireContent({ fontSize: size });
    } else {
      applyStyleToSelection({ fontSize: size });
    }
  };

  const adjustFontSize = (increment: boolean) => {
    restoreSelection();
    const sel = window.getSelection();
    let currentSize = 16;
    
    if (activeSize && activeSize.endsWith("px")) {
      currentSize = parseFloat(activeSize) || 16;
    } else if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      let parentEl = range.commonAncestorContainer as HTMLElement;
      if (parentEl.nodeType === 3) {
        parentEl = parentEl.parentNode as HTMLElement;
      }
      const computedStyle = window.getComputedStyle(parentEl);
      if (computedStyle.fontSize && computedStyle.fontSize.endsWith("px")) {
        currentSize = parseFloat(computedStyle.fontSize);
      }
    }
    
    const newSize = increment ? Math.min(currentSize + 2, 96) : Math.max(currentSize - 2, 8);
    applyFontSize(`${newSize}px`);
  };

  const applyFontWeight = (weight: "Light" | "Regular" | "Bold") => {
    const weightVal = weight === "Light" ? "300" : weight === "Bold" ? "700" : "400";
    if (!editorRef.current) return;
    
    restoreSelection();
    const sel = window.getSelection();
    const hasHighlight = sel && sel.rangeCount > 0 && !sel.isCollapsed && 
      sel.toString().trim().length > 0 && 
      editorRef.current.contains(sel.getRangeAt(0).commonAncestorContainer);
      
    const editorText = editorRef.current.textContent?.trim() || "";
    const selectedText = hasHighlight ? (sel?.toString().trim() || "") : "";
    
    if (!hasHighlight || selectedText === editorText) {
      applyStyleToEntireContent({ fontWeight: weightVal });
    } else {
      applyStyleToSelection({ fontWeight: weightVal });
    }
  };

  const applyUnderline = (style: "solid" | "double" | "wavy" | "dashed" | "none") => {
    setShowUnderlineDropdown(false);
    if (!editorRef.current) return;
    
    restoreSelection();
    const sel = window.getSelection();
    const hasHighlight = sel && sel.rangeCount > 0 && !sel.isCollapsed && 
      sel.toString().trim().length > 0 && 
      editorRef.current.contains(sel.getRangeAt(0).commonAncestorContainer);
      
    const textDec = style === "none" ? "none" : `underline ${style}`;
    const editorText = editorRef.current.textContent?.trim() || "";
    const selectedText = hasHighlight ? (sel?.toString().trim() || "") : "";
    
    if (!hasHighlight || selectedText === editorText) {
      applyStyleToEntireContent({ textDecoration: textDec });
    } else {
      applyStyleToSelection({ textDecoration: textDec });
    }
  };

  const applyTextAlign = (align: "left" | "center" | "right") => {
    setActiveAlign(align);
    onAlignChange?.(align);
    if (!editorRef.current) return;

    restoreSelection();
    const sel = window.getSelection();
    const hasHighlight = sel && sel.rangeCount > 0 && !sel.isCollapsed &&
      sel.toString().trim().length > 0 &&
      editorRef.current.contains(sel.getRangeAt(0).commonAncestorContainer);

    const editorText = editorRef.current.textContent?.trim() || "";
    const selectedText = hasHighlight ? (sel?.toString().trim() || "") : "";

    if (!hasHighlight || selectedText === editorText) {
      applyStyleToEntireContent({ display: "block", width: "100%", textAlign: align });
    } else {
      applyStyleToSelection({ display: "block", width: "100%", textAlign: align });
    }
    triggerChange();
  };

  const applyTextColor = (color: string, _keepInputFocus = false) => {
    if (!color) return;
    setActiveTextColor(color);
    setCustomHexInput(color);
    setShowTextColorDropdown(false);

    if (!editorRef.current) return;

    restoreSelection();
    const sel = window.getSelection();
    const hasHighlight = sel && sel.rangeCount > 0 && !sel.isCollapsed &&
      sel.toString().trim().length > 0 &&
      editorRef.current.contains(sel.getRangeAt(0).commonAncestorContainer);

    const editorText = editorRef.current.textContent?.trim() || "";
    const selectedText = hasHighlight ? (sel?.toString().trim() || "") : "";

    if (hasHighlight && selectedText !== editorText) {
      applyStyleToSelection({ color });
    } else {
      applyStyleToEntireContent({ color });
    }
  };

  const applyHighlightColor = (color: string) => {
    ensureSelection();
    setShowHighlightDropdown(false);
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("hiliteColor", false, color);
    triggerChange();
  };

  const applyBorderBlock = (styleType: "solid" | "dashed" | "alert" | "dark" | "none") => {
    restoreSelection();
    setShowBorderDropdown(false);
    const selection = window.getSelection();
    if (!selection) return;
    const range = selection.getRangeAt(0);
    
    if (styleType === "none") {
      // Find wrapper div
      let parentEl = range.commonAncestorContainer as HTMLElement;
      if (parentEl.nodeType === 3) {
        parentEl = parentEl.parentNode as HTMLElement;
      }
      const blockEl = parentEl.closest("div[data-block-style]");
      if (blockEl) {
        const parent = blockEl.parentNode;
        while (blockEl.firstChild) {
          parent?.insertBefore(blockEl.firstChild, blockEl);
        }
        parent?.removeChild(blockEl);
        triggerChange();
      }
      return;
    }
    
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-block-style", "true");
    wrapper.style.padding = "16px";
    wrapper.style.borderRadius = "12px";
    wrapper.style.margin = "12px 0";
    
    if (styleType === "solid") {
      wrapper.style.border = "1px solid #cbd5e1";
      wrapper.style.backgroundColor = "#ffffff";
    } else if (styleType === "dashed") {
      wrapper.style.border = "2px dashed #cbd5e1";
      wrapper.style.backgroundColor = "#fafafa";
    } else if (styleType === "alert") {
      wrapper.style.border = "2px solid #ea580c";
      wrapper.style.backgroundColor = "#fff7ed";
      wrapper.style.color = "#7c2d12";
    } else if (styleType === "dark") {
      wrapper.style.border = "1px solid #334155";
      wrapper.style.backgroundColor = "#0f172a";
      wrapper.style.color = "#ffffff";
    }
    
    try {
      const content = range.extractContents();
      wrapper.appendChild(content);
      range.insertNode(wrapper);
    } catch (e) {
      // Fallback if cross-boundary
      const span = document.createElement("span");
      span.style.display = "block";
      span.style.padding = "16px";
      span.style.borderRadius = "12px";
      span.style.margin = "12px 0";
      if (styleType === "solid") {
        span.style.border = "1px solid #cbd5e1";
        span.style.backgroundColor = "#ffffff";
      } else if (styleType === "dashed") {
        span.style.border = "2px dashed #cbd5e1";
        span.style.backgroundColor = "#fafafa";
      } else if (styleType === "alert") {
        span.style.border = "2px solid #ea580c";
        span.style.backgroundColor = "#fff7ed";
        span.style.color = "#7c2d12";
      } else if (styleType === "dark") {
        span.style.border = "1px solid #334155";
        span.style.backgroundColor = "#0f172a";
        span.style.color = "#ffffff";
      }
      span.appendChild(range.cloneContents());
      range.deleteContents();
      range.insertNode(span);
    }
    triggerChange();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (wrapperRef.current && e.target instanceof Node && wrapperRef.current.contains(e.target)) {
        return; // Clicked inside the component, keep dropdown open!
      }
      setShowUnderlineDropdown(false);
      setShowBorderDropdown(false);
      setShowTextColorDropdown(false);
      setShowHighlightDropdown(false);
      setShowFontDropdown(false);
      setShowSizeDropdown(false);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  return (
    <div ref={wrapperRef} className={`flex flex-col border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-[#0f172a] shadow-lg ${className}`}>
      
      {/* Rich Text Toolbar - Uncluttered, fully visible without horizontal scrolling */}
      {(toolbarMode === "always" || isFocused) && (
        <div className="p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 select-none rounded-t-2xl">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* 1. Custom Font Family Select */}
            <div className="shrink-0">
              <select
                value={activeFont}
                onMouseDown={() => saveSelection()}
                onChange={(e) => applyFontFamily(e.target.value)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold outline-none cursor-pointer focus:ring-1 focus:ring-yellow-400 max-w-[110px]"
              >
                {FONTS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* 2. Custom Font Size Select */}
            <div className="shrink-0">
              <select
                value={activeSize}
                onMouseDown={() => saveSelection()}
                onChange={(e) => applyFontSize(e.target.value)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold outline-none cursor-pointer focus:ring-1 focus:ring-yellow-400 w-14"
              >
                {FONT_SIZES.map((size) => (
                  <option key={size} value={size}>{size.replace("px", "")}px</option>
                ))}
              </select>
            </div>

            {/* 3. Size Increment Buttons */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); adjustFontSize(true); }}
                className="flex items-center px-1.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 transition-all font-black text-[9px]"
                title="Increase font size"
              >
                <Type size={10} className="pointer-events-none" />
                <ChevronUp size={7} className="-ml-0.5 pointer-events-none" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); adjustFontSize(false); }}
                className="flex items-center px-1.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 transition-all font-black text-[9px]"
                title="Decrease font size"
              >
                <Type size={10} className="pointer-events-none" />
                <ChevronDown size={7} className="-ml-0.5 pointer-events-none" />
              </button>
            </div>

            <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-800 mx-0.5 hidden sm:block shrink-0" />

            {/* 4. Bold, Italic Buttons */}
            <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 shrink-0">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyBold(); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                title="Bold"
              >
                <BoldIcon size={11} className="pointer-events-none" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyItalic(); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 italic"
                title="Italic"
              >
                <ItalicIcon size={11} className="pointer-events-none" />
              </button>
            </div>

            {/* 4b. Left, Center, Right Alignment Buttons */}
            <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 shrink-0">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyTextAlign("left"); }}
                className={`p-1 rounded transition-colors ${activeAlign === "left" ? "bg-slate-200 dark:bg-slate-700 text-[#0f172a] dark:text-yellow-400" : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"}`}
                title="Align Left"
              >
                <AlignLeft size={11} className="pointer-events-none" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyTextAlign("center"); }}
                className={`p-1 rounded transition-colors ${activeAlign === "center" ? "bg-slate-200 dark:bg-slate-700 text-[#0f172a] dark:text-yellow-400" : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"}`}
                title="Align Center"
              >
                <AlignCenter size={11} className="pointer-events-none" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyTextAlign("right"); }}
                className={`p-1 rounded transition-colors ${activeAlign === "right" ? "bg-slate-200 dark:bg-slate-700 text-[#0f172a] dark:text-yellow-400" : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"}`}
                title="Align Right"
              >
                <AlignRight size={11} className="pointer-events-none" />
              </button>
            </div>

            {/* 5. Underline Style Select */}
            <div className="shrink-0">
              <select
                onChange={(e) => applyUnderline(e.target.value as any)}
                defaultValue="solid"
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold outline-none cursor-pointer focus:ring-1 focus:ring-yellow-400"
              >
                <option value="solid">Underline</option>
                <option value="double">Double</option>
                <option value="wavy">Wavy</option>
                <option value="dashed">Dashed</option>
                <option value="none">None</option>
              </select>
            </div>

            <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-800 mx-0.5 hidden sm:block shrink-0" />

            {/* 6. Light, Regular, Bold Weight Shortcuts */}
            <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 shrink-0">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyFontWeight("Light"); }}
                className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-[9px] font-light text-slate-500 dark:text-slate-400"
                title="Font Weight Light (300)"
              >
                Light
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyFontWeight("Regular"); }}
                className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-[9px] font-normal text-slate-500 dark:text-slate-400"
                title="Font Weight Regular (400)"
              >
                Reg
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyFontWeight("Bold"); }}
                className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-[9px] font-bold text-slate-600 dark:text-slate-300"
                title="Font Weight Bold (700)"
              >
                Bold
              </button>
            </div>

            <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-800 mx-0.5 hidden sm:block shrink-0" />

            {/* 7. Text Color Select + Custom Color Wheel + Hex Code Input */}
            <div className="flex items-center gap-1 shrink-0">
              <select
                value={activeTextColor}
                onMouseDown={() => saveSelection()}
                onChange={(e) => applyTextColor(e.target.value)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold outline-none cursor-pointer focus:ring-1 focus:ring-yellow-400"
              >
                <option value="" disabled>Color</option>
                {activeTextColor && !TEXT_COLORS.some((c) => c.value.toLowerCase() === activeTextColor.toLowerCase()) && (
                  <option value={activeTextColor}>Custom ({activeTextColor})</option>
                )}
                {Array.from(new Set(TEXT_COLORS.map((c) => c.group))).map((groupName) => (
                  <optgroup key={groupName} label={groupName}>
                    {TEXT_COLORS.filter((c) => c.group === groupName).map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(activeTextColor) ? activeTextColor : "#3b82f6"}
                onMouseDown={() => saveSelection()}
                onInput={(e) => applyTextColor((e.target as HTMLInputElement).value)}
                onChange={(e) => applyTextColor(e.target.value)}
                title="Custom Text Color Picker"
                className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer p-0 bg-transparent shrink-0"
              />
              <input
                type="text"
                value={customHexInput}
                onMouseDown={() => saveSelection()}
                onChange={(e) => {
                  const raw = e.target.value;
                  setCustomHexInput(raw);
                  const cleaned = raw.trim();
                  if (/^#?[0-9a-fA-F]{6}$/.test(cleaned)) {
                    const normalized = cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
                    applyTextColor(normalized, true);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const cleaned = customHexInput.trim();
                    if (/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(cleaned)) {
                      const normalized = cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
                      applyTextColor(normalized, false);
                    }
                  }
                }}
                onBlur={() => {
                  const cleaned = customHexInput.trim();
                  if (/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(cleaned)) {
                    const normalized = cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
                    applyTextColor(normalized, true);
                  }
                }}
                placeholder="#hex"
                maxLength={7}
                title="Enter custom hex color (e.g. #a3e635)"
                className="w-16 px-1.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-mono font-bold outline-none focus:ring-1 focus:ring-yellow-400"
              />

              {/* Quick Swatches for 1-click styling */}
              <div className="flex items-center gap-1 shrink-0 ml-0.5">
                {[
                  { name: "Slate", hex: "#94a3b8" },
                  { name: "Gold", hex: "#f59e0b" },
                  { name: "Emerald", hex: "#10b981" },
                  { name: "Cyan", hex: "#06b6d4" },
                  { name: "Purple", hex: "#a855f7" },
                  { name: "Rose", hex: "#f43f5e" },
                  { name: "White", hex: "#ffffff" },
                ].map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    title={`Color: ${swatch.name} (${swatch.hex})`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyTextColor(swatch.hex);
                    }}
                    style={{ backgroundColor: swatch.hex }}
                    className={`w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/20 transition-transform hover:scale-125 active:scale-95 shrink-0 ${
                      activeTextColor.toLowerCase() === swatch.hex.toLowerCase() ? "ring-2 ring-yellow-400 ring-offset-1" : ""
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 8. Highlight Color Select */}
            <div className="shrink-0">
              <select
                onMouseDown={() => saveSelection()}
                onChange={(e) => applyHighlightColor(e.target.value)}
                defaultValue=""
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold outline-none cursor-pointer focus:ring-1 focus:ring-yellow-400"
              >
                <option value="" disabled>Highlight</option>
                {HIGHLIGHT_COLORS.map((color) => (
                  <option key={color.value} value={color.value}>{color.name}</option>
                ))}
              </select>
            </div>

            {/* 9. Card Block Borders Select */}
            <div className="shrink-0">
              <select
                onChange={(e) => applyBorderBlock(e.target.value as any)}
                defaultValue="none"
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold outline-none cursor-pointer focus:ring-1 focus:ring-yellow-400"
              >
                <option value="none">Container: None</option>
                <option value="solid">Card: Solid</option>
                <option value="dashed">Card: Dashed</option>
                <option value="alert">Card: Alert</option>
                <option value="dark">Card: Dark</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Editor Content Area */}
      <div className={`relative flex-1 transition-colors duration-200 border-t border-slate-100 dark:border-slate-800 rounded-b-2xl ${
        editorBg === "light" ? "bg-white text-slate-900" : "bg-slate-950 text-white"
      }`}>
        {/* Style helper for ultra-contrast outlines inside editor */}
        <style dangerouslySetInnerHTML={{ __html: `
          .editor-outline-helper [style*="color: #ffffff"],
          .editor-outline-helper [style*="color: rgb(255, 255, 255)"],
          .editor-outline-helper font[color="#ffffff"] {
            text-shadow: -1px -1px 0 #475569, 1px -1px 0 #475569, -1px 1px 0 #475569, 1px 1px 0 #475569 !important;
          }
          .editor-outline-helper [style*="color: #000000"],
          .editor-outline-helper [style*="color: rgb(0, 0, 0)"],
          .editor-outline-helper [style*="color: #0f172a"],
          .editor-outline-helper [style*="color: rgb(15, 23, 42)"],
          .editor-outline-helper font[color="#000000"] {
            text-shadow: -1px -1px 0 #e2e8f0, 1px -1px 0 #e2e8f0, -1px 1px 0 #e2e8f0, 1px 1px 0 #e2e8f0 !important;
          }
        `}} />
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onFocus={() => {
            setIsFocused(true);
            updateActiveStylesFromSelection();
          }}
          onBlur={(e) => {
            handleInput();
            if (wrapperRef.current && wrapperRef.current.contains(e.relatedTarget as Node)) {
              return; // Focused onto toolbar item, do not close!
            }
            setIsFocused(false);
          }}
          onMouseUp={() => {
            saveSelection();
            updateActiveStylesFromSelection();
          }}
          onKeyUp={() => {
            saveSelection();
            updateActiveStylesFromSelection();
          }}
          onPaste={handlePaste}
          className="w-full p-4 outline-none overflow-y-auto leading-relaxed text-sm min-h-[120px] custom-scrollbar editor-outline-helper whitespace-pre-wrap"
          style={{ minHeight, fontFamily: activeFont, fontSize: activeSize }}
        />
        
        {/* Placeholder label */}
        {(!value || value === "<br>" || value === "") && (
          <div className={`absolute top-4 left-4 pointer-events-none text-xs font-semibold italic ${
            editorBg === "light" ? "text-slate-400" : "text-zinc-500"
          }`}>
            {placeholder}
          </div>
        )}
      </div>

      {/* Tokens footer, if any */}
      {availableTokens.length > 0 && (
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/30 border-t border-slate-250/20 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex flex-wrap gap-2 items-center select-none rounded-b-2xl">
          <span>Tokens (click to insert):</span>
          {availableTokens.map((t) => (
            <button
              key={t}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertTextAtCursor(t);
              }}
              className="bg-slate-200/50 hover:bg-slate-300/70 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 px-2 py-0.5 rounded text-blue-500 font-mono select-none normal-case font-black tracking-normal transition-colors cursor-pointer"
            >
              {t}
            </button>
          ))}
        </div>
      )}

    </div>
  );
});

RichTextEditor.displayName = "RichTextEditor";
export default RichTextEditor;
