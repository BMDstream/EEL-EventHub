"use client";

import React, { useRef, useEffect, useState } from "react";
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
  Moon
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  availableTokens?: string[];
  toolbarMode?: "always" | "on-focus";
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
  { name: "Slate 800", value: "#0f172a" },
  { name: "Gray 500", value: "#64748b" },
  { name: "White", value: "#ffffff" },
  { name: "Red 500", value: "#ef4444" },
  { name: "Orange 500", value: "#f97316" },
  { name: "Yellow 500", value: "#eab308" },
  { name: "Green 500", value: "#22c55e" },
  { name: "Blue 500", value: "#3b82f6" },
  { name: "Indigo 500", value: "#6366f1" },
  { name: "Purple 500", value: "#a855f7" },
  { name: "Pink 500", value: "#ec4899" }
];

const HIGHLIGHT_COLORS = [
  { name: "Clear", value: "transparent" },
  { name: "Yellow Light", value: "#fef08a" },
  { name: "Orange Light", value: "#ffedd5" },
  { name: "Green Light", value: "#dcfce7" },
  { name: "Blue Light", value: "#dbeafe" },
  { name: "Purple Light", value: "#f3e8ff" },
  { name: "Pink Light", value: "#fce7f3" },
  { name: "Slate Light", value: "#f1f5f9" }
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Type template content here...",
  className = "",
  minHeight = "200px",
  availableTokens = [],
  toolbarMode = "always"
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);

  const [activeFont, setActiveFont] = useState("Calibri, sans-serif");
  const [activeSize, setActiveSize] = useState("16px");
  const [showUnderlineDropdown, setShowUnderlineDropdown] = useState(false);
  const [showBorderDropdown, setShowBorderDropdown] = useState(false);
  const [showTextColorDropdown, setShowTextColorDropdown] = useState(false);
  const [showHighlightDropdown, setShowHighlightDropdown] = useState(false);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [editorBg, setEditorBg] = useState<"light" | "dark">("light");

  // Sync content with value if editor is not active
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || "";
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

  // Helper: Wraps the current highlighted selection in a styled span
  const wrapSelectionInSpan = (styleProps: Record<string, string>) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return false;
    
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!editorRef.current?.contains(range.commonAncestorContainer)) return false;
      
      const span = document.createElement("span");
      Object.entries(styleProps).forEach(([key, val]) => {
        span.style[key as any] = val;
      });
      
      try {
        range.surroundContents(span);
      } catch (e) {
        const documentFragment = range.extractContents();
        const wrapper = document.createElement("span");
        Object.entries(styleProps).forEach(([key, val]) => {
          wrapper.style[key as any] = val;
        });
        wrapper.appendChild(documentFragment);
        range.insertNode(wrapper);
      }
      return true;
    }
    return false;
  };

  // Helper: Ensures there is an active text selection. If collapsed/empty, selects the ENTIRE editor contents.
  const ensureSelection = () => {
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
    collapseToEnd();
  };

  const applyItalic = () => {
    ensureSelection();
    document.execCommand("italic");
    triggerChange();
    collapseToEnd();
  };

  const applyFontFamily = (fontFamily: string) => {
    const hadSelection = ensureSelection();
    setActiveFont(fontFamily);
    
    if (hadSelection) {
      const wrapped = wrapSelectionInSpan({ fontFamily: fontFamily });
      if (wrapped) {
        triggerChange();
        collapseToEnd();
        return;
      }
    }
    
    document.execCommand("insertHTML", false, `<span style="font-family: ${fontFamily};">&#8203;</span>`);
    triggerChange();
  };

  const applyFontSize = (size: string) => {
    const hadSelection = ensureSelection();
    setActiveSize(size);
    
    if (hadSelection) {
      const wrapped = wrapSelectionInSpan({ fontSize: size });
      if (wrapped) {
        triggerChange();
        collapseToEnd();
        return;
      }
    }
    
    document.execCommand("insertHTML", false, `<span style="font-size: ${size};">&#8203;</span>`);
    triggerChange();
  };

  const adjustFontSize = (increment: boolean) => {
    restoreSelection();
    const selection = window.getSelection();
    if (!selection) return;
    let currentSize = 16;
    
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let parentEl = range.commonAncestorContainer as HTMLElement;
      if (parentEl.nodeType === 3) {
        parentEl = parentEl.parentNode as HTMLElement;
      }
      const computedStyle = window.getComputedStyle(parentEl);
      const sizeStr = computedStyle.fontSize;
      if (sizeStr && sizeStr.endsWith("px")) {
        currentSize = parseFloat(sizeStr);
      }
    }
    
    const newSize = increment ? Math.min(currentSize + 1, 96) : Math.max(currentSize - 1, 8);
    applyFontSize(`${newSize}px`);
  };

  const applyFontWeight = (weight: "Light" | "Regular" | "Bold") => {
    const hadSelection = ensureSelection();
    const weightVal = weight === "Light" ? "300" : weight === "Bold" ? "700" : "400";
    
    if (hadSelection) {
      const wrapped = wrapSelectionInSpan({ fontWeight: weightVal });
      if (wrapped) {
        triggerChange();
        collapseToEnd();
        return;
      }
    }
    
    document.execCommand("insertHTML", false, `<span style="font-weight: ${weightVal};">&#8203;</span>`);
    triggerChange();
  };

  const applyUnderline = (style: "solid" | "double" | "wavy" | "dashed" | "none") => {
    const hadSelection = ensureSelection();
    setShowUnderlineDropdown(false);
    
    if (hadSelection) {
      if (style === "none") {
        document.execCommand("underline", false);
        triggerChange();
        collapseToEnd();
        return;
      }
      const wrapped = wrapSelectionInSpan({ textDecoration: `underline ${style}` });
      if (wrapped) {
        triggerChange();
        collapseToEnd();
        return;
      }
    }
    
    document.execCommand("underline", false);
    triggerChange();
  };

  const applyTextColor = (color: string) => {
    ensureSelection();
    setShowTextColorDropdown(false);
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("foreColor", false, color);
    triggerChange();
    collapseToEnd();
  };

  const applyHighlightColor = (color: string) => {
    ensureSelection();
    setShowHighlightDropdown(false);
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("hiliteColor", false, color);
    triggerChange();
    collapseToEnd();
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
    <div ref={wrapperRef} className={`flex flex-col border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-[#0f172a] shadow-lg ${className}`}>
      
      {/* Rich Text Toolbar */}
      {(toolbarMode === "always" || isFocused) && (
        <div className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 select-none">
        
        {/* ROW 1: Fonts, Sizes, Increments */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Custom Font Family Dropdown */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowFontDropdown(!showFontDropdown); setShowSizeDropdown(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 transition-colors text-xs font-bold min-w-[120px] justify-between"
            >
              <span className="truncate max-w-[90px]">{FONTS.find(f => f.value === activeFont)?.label || "Calibri"}</span>
              <ChevronDown size={10} className="shrink-0" />
            </button>
            {showFontDropdown && (
              <div 
                className="absolute left-0 mt-1.5 w-48 max-h-60 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-1 flex flex-col gap-0.5"
                onMouseDown={(e) => e.preventDefault()}
              >
                {FONTS.map((f) => (
                  <button 
                    key={f.value} 
                    type="button" 
                    onClick={() => { applyFontFamily(f.value); setShowFontDropdown(false); }} 
                    style={{ fontFamily: f.value }}
                    className="px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-bold"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom Font Size Dropdown */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowSizeDropdown(!showSizeDropdown); setShowFontDropdown(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 transition-colors text-xs font-bold min-w-[65px] justify-between"
            >
              <span>{activeSize.replace("px", "")}</span>
              <ChevronDown size={10} className="shrink-0" />
            </button>
            {showSizeDropdown && (
              <div 
                className="absolute left-0 mt-1.5 w-24 max-h-60 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-1 flex flex-col gap-0.5"
                onMouseDown={(e) => e.preventDefault()}
              >
                {FONT_SIZES.map((size) => (
                  <button 
                    key={size} 
                    type="button" 
                    onClick={() => { applyFontSize(size); setShowSizeDropdown(false); }} 
                    className="px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-bold"
                  >
                    {size.replace("px", "")}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* Size Increment Buttons */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); adjustFontSize(true); }}
            className="flex items-center gap-0.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 hover:text-slate-900 transition-all font-black text-[10px]"
            title="Increase font size"
          >
            <Type size={12} />
            <ChevronUp size={10} className="-ml-0.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); adjustFontSize(false); }}
            className="flex items-center gap-0.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 hover:text-slate-900 transition-all font-black text-[10px]"
            title="Decrease font size"
          >
            <Type size={12} />
            <ChevronDown size={10} className="-ml-0.5" />
          </button>
        </div>

        {/* ROW 2: Formatting Weights, Styles, Colors, Borders */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/50 dark:border-slate-800/50 pt-2">
          {/* Bold, Italic Buttons */}
          <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-0.5">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyBold(); }}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs"
              title="Bold"
            >
              <BoldIcon size={13} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyItalic(); }}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 italic text-xs"
              title="Italic"
            >
              <ItalicIcon size={13} />
            </button>
          </div>

          {/* Underline dropdown */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowUnderlineDropdown(!showUnderlineDropdown); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors text-xs font-bold"
              title="Underline style"
            >
              <UnderlineIcon size={13} />
              <ChevronDown size={10} />
            </button>
            {showUnderlineDropdown && (
              <div 
                className="absolute left-0 mt-1.5 w-32 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-1 flex flex-col gap-0.5"
                onMouseDown={(e) => e.preventDefault()} // prevent focus loss
              >
                <button type="button" onClick={() => applyUnderline("solid")} className="px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-bold underline decoration-solid">Solid</button>
                <button type="button" onClick={() => applyUnderline("double")} className="px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-bold underline decoration-double">Double</button>
                <button type="button" onClick={() => applyUnderline("wavy")} className="px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-bold underline decoration-wavy">Wavy</button>
                <button type="button" onClick={() => applyUnderline("dashed")} className="px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-bold underline decoration-dashed">Dashed</button>
                <button type="button" onClick={() => applyUnderline("none")} className="px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-red-500 dark:text-red-400 font-bold">Clear</button>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* Light, Regular, Bold weight shortcuts */}
          <div className="flex bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-0.5">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyFontWeight("Light"); }}
              className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-light text-slate-500 hover:text-slate-900 dark:text-slate-450 dark:hover:text-white"
              title="Font Weight Light (300)"
            >
              Light
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyFontWeight("Regular"); }}
              className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-normal text-slate-500 hover:text-slate-900 dark:text-slate-450 dark:hover:text-white"
              title="Font Weight Regular (400)"
            >
              Regular
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyFontWeight("Bold"); }}
              className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-500 hover:text-slate-900 dark:text-slate-450 dark:hover:text-white"
              title="Font Weight Bold (700)"
            >
              Bold
            </button>
          </div>

          {/* Border Box Block layout */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowBorderDropdown(!showBorderDropdown); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors text-xs font-bold"
              title="Insert Border / Card Layout block"
            >
              <Grid size={13} />
              <ChevronDown size={10} />
            </button>
            {showBorderDropdown && (
              <div 
                className="absolute left-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-1 flex flex-col gap-0.5"
                onMouseDown={(e) => e.preventDefault()}
              >
                <button type="button" onClick={() => applyBorderBlock("solid")} className="px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2"><span className="w-3 h-3 rounded border border-slate-300" /> Solid Border Card</button>
                <button type="button" onClick={() => applyBorderBlock("dashed")} className="px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2"><span className="w-3 h-3 rounded border border-dashed border-slate-400" /> Dashed Border Card</button>
                <button type="button" onClick={() => applyBorderBlock("alert")} className="px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-orange-650 dark:text-orange-400 font-semibold flex items-center gap-2"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-500" /> Orange Alert Box</button>
                <button type="button" onClick={() => applyBorderBlock("dark")} className="px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-900 border border-slate-800" /> Slate Dark Box</button>
                <button type="button" onClick={() => applyBorderBlock("none")} className="px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-red-500 dark:text-red-400 font-semibold flex items-center gap-2">Clear Card Container</button>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* Highlight fill Color Dropdown */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowHighlightDropdown(!showHighlightDropdown); }}
              className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              title="Highlight Color"
            >
              <PaintBucket size={13} />
              <div className="w-5 h-1 rounded bg-yellow-300 mt-0.5" />
            </button>
            {showHighlightDropdown && (
              <div 
                className="absolute left-0 mt-1.5 w-40 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2 grid grid-cols-4 gap-1.5"
                onMouseDown={(e) => e.preventDefault()}
              >
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => applyHighlightColor(color.value)}
                    style={{ backgroundColor: color.value === "transparent" ? "#ffffff" : color.value }}
                    className="w-7 h-7 rounded-lg border border-slate-200 hover:scale-105 active:scale-95 transition-all flex items-center justify-center text-[8px] font-black text-slate-500"
                    title={color.name}
                  >
                    {color.value === "transparent" && "X"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Color Dropdown */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowTextColorDropdown(!showTextColorDropdown); }}
              className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              title="Text Color"
            >
              <CaseSensitive size={14} />
              <div className="w-5 h-1 rounded bg-red-600 mt-0.5" />
            </button>
            {showTextColorDropdown && (
              <div 
                className="absolute left-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2 grid grid-cols-4 gap-1.5"
                onMouseDown={(e) => e.preventDefault()}
              >
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => applyTextColor(color.value)}
                    style={{ backgroundColor: color.value }}
                    className="w-7 h-7 rounded-lg border border-slate-200 hover:scale-105 active:scale-95 transition-all"
                    title={color.name}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
      )}

      {/* Editor Content Area */}
      <div className={`relative flex-1 transition-colors duration-200 border-t border-slate-100 dark:border-slate-800 ${
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
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            handleInput();
            if (wrapperRef.current && wrapperRef.current.contains(e.relatedTarget as Node)) {
              return; // Focused onto toolbar item, do not close!
            }
            setIsFocused(false);
          }}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onPaste={handlePaste}
          className="w-full p-4 outline-none overflow-y-auto leading-relaxed text-sm min-h-[120px] custom-scrollbar editor-outline-helper"
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
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/30 border-t border-slate-250/20 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex flex-wrap gap-2 items-center select-none">
          <span>Tokens:</span>
          {availableTokens.map((t) => (
            <span key={t} className="bg-slate-200/50 dark:bg-slate-800/80 px-2 py-0.5 rounded text-blue-500 font-mono select-all normal-case font-black tracking-normal">{t}</span>
          ))}
        </div>
      )}

    </div>
  );
}
