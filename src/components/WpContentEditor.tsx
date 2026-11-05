import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Link as LinkIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Image as ImageIcon
} from 'lucide-react';

interface WpContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  onOpenMediaModal: () => void;
  placeholder?: string;
  minRows?: number;
}

export interface WpContentEditorRef {
  insertMedia: (url: string, altText?: string) => void;
}

interface WpContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  onOpenMediaModal: () => void;
  placeholder?: string;
  minRows?: number;
}

// Convert raw value (HTML or Markdown) to Rich HTML for WordPress Visual Mode
export const formatToVisualHtml = (text: string): string => {
  if (!text) return '<p><br></p>';
  
  let html = text;

  // Convert any markdown images ![alt](url) into rich HTML figure/img tags
  html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s\)]+|data:image\/[^\s\)]+)\)/gi, (match, alt, url) => {
    const cleanAlt = alt ? alt.trim() : '';
    const captionHtml = cleanAlt ? `<br/><span style="font-size: 12px; color: #64748b; font-style: italic; display: block; margin-top: 4px;">${cleanAlt}</span>` : '';
    return `<p style="text-align: center; margin: 1.5rem 0;"><img src="${url}" alt="${cleanAlt}" style="max-width: 100%; height: auto; border-radius: 12px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" onError="this.onerror=null;this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80';" />${captionHtml}</p>`;
  });

  // If it's already HTML markup without raw markdown headings/quotes, return as is
  if (/<[a-z][\s\S]*>/i.test(html) && !html.includes('### ') && !html.includes('**') && !html.includes('> ')) {
    return html;
  }

  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#4f46e5; text-decoration:underline;">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  const blocks = html.split(/\n\n+/);
  return blocks.map(b => {
    const trimmed = b.trim();
    if (!trimmed) return '';
    if (/^<(h[1-4]|blockquote|img|figure|ul|ol|div|p|a)/i.test(trimmed)) {
      return trimmed;
    }
    return `<p style="margin-bottom: 0.8rem; line-height: 1.6;">${trimmed.replace(/\n/g, '<br/>')}</p>`;
  }).join('');
};

export const WpContentEditor = React.forwardRef<WpContentEditorRef, WpContentEditorProps>(({
  value,
  onChange,
  onOpenMediaModal,
  placeholder = 'Write story content here...',
  minRows = 10
}, ref) => {
  // Default mode is 'visual' (WordPress WYSIWYG Visual Editor for non-technical writers)
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [headingFormat, setHeadingFormat] = useState<string>('p');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // Expose imperative handle for inserting media directly at cursor position
  React.useImperativeHandle(ref, () => ({
    insertMedia: (url: string, altText: string = '') => {
      const cleanUrl = url.trim();
      if (!cleanUrl) return;
      const cleanAlt = altText.trim() || 'Article Image';

      if (editorMode === 'visual') {
        if (visualEditorRef.current) {
          visualEditorRef.current.focus();
          restoreSelection();

          const captionSpan = cleanAlt ? `<br/><span style="font-size: 12px; color: #64748b; font-style: italic; display: block; margin-top: 4px;">${cleanAlt}</span>` : '';
          const imgHtml = `<p style="text-align: center; margin: 1.5rem 0;"><img src="${cleanUrl}" alt="${cleanAlt}" style="max-width: 100%; height: auto; border-radius: 12px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" onError="this.onerror=null;this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80';" />${captionSpan}</p><p><br></p>`;

          document.execCommand('insertHTML', false, imgHtml);
          saveSelection();
          handleVisualInput();
        }
      } else {
        // Code Mode - insert at textarea cursor position
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const text = textarea.value;
          const markdown = `\n\n![${cleanAlt}](${cleanUrl})\n\n`;
          const newValue = text.substring(0, start) + markdown + text.substring(end);
          onChange(newValue);

          setTimeout(() => {
            textarea.focus();
            const newPos = start + markdown.length;
            textarea.setSelectionRange(newPos, newPos);
          }, 0);
        }
      }
    }
  }));

  // Sync content to Visual editor on mount or when switching to Visual mode
  useEffect(() => {
    if (editorMode === 'visual' && visualEditorRef.current) {
      if (document.activeElement !== visualEditorRef.current) {
        visualEditorRef.current.innerHTML = formatToVisualHtml(value) || '<p><br></p>';
      }
    }
  }, [editorMode, value]);

  // Handle user typing inside Visual contentEditable canvas
  const handleVisualInput = () => {
    if (visualEditorRef.current) {
      const htmlContent = visualEditorRef.current.innerHTML;
      onChange(htmlContent);
    }
  };

  // Calculate word count from plain text
  const getPlainText = (val: string) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = val;
    return tmp.textContent || tmp.innerText || '';
  };

  const plainText = getPlainText(value);
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;

  // Save current selection inside contentEditable canvas
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && visualEditorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  // Restore saved selection
  const restoreSelection = () => {
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }
  };

  // Execute formatting command in Visual Mode (contentEditable)
  const execVisualCommand = (command: string, valueArgument: string | undefined = undefined) => {
    if (visualEditorRef.current) {
      visualEditorRef.current.focus();
      restoreSelection();
      document.execCommand(command, false, valueArgument);
      saveSelection();
      handleVisualInput();
    }
  };

  // Format Block (H1, H2, H3, P, BLOCKQUOTE) in Visual Mode with fallback DOM manipulation
  const applyVisualBlockFormat = (tag: string) => {
    if (!visualEditorRef.current) return;
    visualEditorRef.current.focus();
    restoreSelection();

    const tagUpper = tag.toUpperCase();
    const sel = window.getSelection();
    
    // Try browser native formatBlock first
    document.execCommand('formatBlock', false, tagUpper);

    // Ensure DOM element tag is strictly applied if execCommand didn't convert
    if (sel && sel.rangeCount > 0) {
      let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
      }
      
      let blockEl: HTMLElement | null = null;
      let curr = node as HTMLElement | null;
      while (curr && curr !== visualEditorRef.current) {
        if (/^(P|H1|H2|H3|H4|H5|H6|BLOCKQUOTE|DIV)$/i.test(curr.tagName)) {
          blockEl = curr;
          break;
        }
        curr = curr.parentElement;
      }

      if (blockEl && blockEl.tagName.toUpperCase() !== tagUpper) {
        const newEl = document.createElement(tagUpper);
        newEl.innerHTML = blockEl.innerHTML;
        if (blockEl.style.textAlign) {
          newEl.style.textAlign = blockEl.style.textAlign;
        }
        blockEl.parentNode?.replaceChild(newEl, blockEl);

        // Put cursor in new element
        const range = document.createRange();
        range.selectNodeContents(newEl);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    saveSelection();
    handleVisualInput();
  };

  // Format Dropdown Change (Paragraph, Heading 1, 2, 3, Quote)
  const handleHeadingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const format = e.target.value;
    setHeadingFormat(format);

    if (editorMode === 'visual') {
      if (format === 'p') applyVisualBlockFormat('p');
      else if (format === 'h1') applyVisualBlockFormat('h1');
      else if (format === 'h2') applyVisualBlockFormat('h2');
      else if (format === 'h3') applyVisualBlockFormat('h3');
      else if (format === 'quote') applyVisualBlockFormat('blockquote');
    } else {
      // Code mode
      if (format === 'h1') handleLinePrefix('# ');
      else if (format === 'h2') handleLinePrefix('## ');
      else if (format === 'h3') handleLinePrefix('### ');
      else if (format === 'quote') handleLinePrefix('> ');
    }
  };

  // Code Mode formatting helpers
  const handleApplyCodeFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end);
    const sample = selectedText || 'text';
    const replacement = `${prefix}${sample}${suffix}`;

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      } else {
        const newCursor = start + prefix.length;
        textarea.setSelectionRange(newCursor, newCursor + sample.length);
      }
    }, 0);
  };

  const handleLinePrefix = (linePrefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const text = textarea.value;

    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const newValue = text.substring(0, lineStart) + linePrefix + text.substring(lineStart);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + linePrefix.length, start + linePrefix.length);
    }, 0);
  };

  // Toolbar Button Click Actions (Support both Visual & Code)
  const handleBold = () => {
    if (editorMode === 'visual') execVisualCommand('bold');
    else handleApplyCodeFormatting('**', '**');
  };

  const handleItalic = () => {
    if (editorMode === 'visual') execVisualCommand('italic');
    else handleApplyCodeFormatting('*', '*');
  };

  const handleBulletList = () => {
    if (editorMode === 'visual') execVisualCommand('insertUnorderedList');
    else handleLinePrefix('- ');
  };

  const handleNumberedList = () => {
    if (editorMode === 'visual') execVisualCommand('insertOrderedList');
    else handleLinePrefix('1. ');
  };

  const handleQuote = () => {
    if (editorMode === 'visual') applyVisualBlockFormat('blockquote');
    else handleLinePrefix('> ');
  };

  const handleAlignLeft = () => {
    if (editorMode === 'visual') execVisualCommand('justifyLeft');
    else handleApplyCodeFormatting('<div align="left">\n', '\n</div>');
  };

  const handleAlignCenter = () => {
    if (editorMode === 'visual') execVisualCommand('justifyCenter');
    else handleApplyCodeFormatting('<div align="center">\n', '\n</div>');
  };

  const handleAlignRight = () => {
    if (editorMode === 'visual') execVisualCommand('justifyRight');
    else handleApplyCodeFormatting('<div align="right">\n', '\n</div>');
  };

  const handleLink = () => {
    const url = prompt('Enter link URL (e.g. https://example.com):', 'https://');
    if (!url) return;

    if (editorMode === 'visual') {
      execVisualCommand('createLink', url);
    } else {
      handleApplyCodeFormatting('[', `](${url})`);
    }
  };

  // Keyboard shortcut listener
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleBold();
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        handleItalic();
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleLink();
      }
    }
  };

  return (
    <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
      {/* Top Header: Add Media + WordPress Style Visual / Code Mode Tabs */}
      <div className="p-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenMediaModal}
          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>+ Add Media (Thêm hình ảnh)</span>
        </button>

        {/* Visual / Code Mode Tabs - Exactly matching WordPress Classic Editor (Visual | Code) */}
        <div className="flex items-center bg-slate-200/90 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setEditorMode('visual');
              setTimeout(() => {
                if (visualEditorRef.current) {
                  visualEditorRef.current.innerHTML = formatToVisualHtml(value);
                }
              }, 0);
            }}
            className={`px-3 py-1 rounded-md transition font-bold ${
              editorMode === 'visual'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Visual
          </button>
          <button
            type="button"
            onClick={() => setEditorMode('code')}
            className={`px-3 py-1 rounded-md transition font-bold ${
              editorMode === 'code'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Code
          </button>
        </div>
      </div>

      {/* Classic WordPress Editor Formatting Toolbar */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center flex-wrap gap-1.5 text-xs">
        {/* Paragraph / Heading Format Dropdown */}
        <select
          value={headingFormat}
          onMouseDown={saveSelection}
          onFocus={saveSelection}
          onChange={handleHeadingChange}
          className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium outline-none focus:border-indigo-500"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="quote">Blockquote</option>
        </select>

        <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

        {/* Bold (B) */}
        <button
          type="button"
          onClick={handleBold}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        {/* Italic (I) */}
        <button
          type="button"
          onClick={handleItalic}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

        {/* Bullet List */}
        <button
          type="button"
          onClick={handleBulletList}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>

        {/* Numbered List */}
        <button
          type="button"
          onClick={handleNumberedList}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        {/* Quote */}
        <button
          type="button"
          onClick={handleQuote}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>

        <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

        {/* Align Left / Center / Right */}
        <button
          type="button"
          onClick={handleAlignLeft}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleAlignCenter}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleAlignRight}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

        {/* Hyperlink */}
        <button
          type="button"
          onClick={handleLink}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          title="Insert Link (Ctrl+K)"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Main Content Area */}
      {editorMode === 'visual' ? (
        /* WORDPRESS VISUAL WYSIWYG MODE - Direct typing, visual formatting, and live image rendering */
        <div
          ref={visualEditorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleVisualInput}
          onBlur={handleVisualInput}
          onMouseUp={saveSelection}
          onClick={saveSelection}
          onSelect={saveSelection}
          onKeyUp={(e) => {
            saveSelection();
            handleVisualInput();
          }}
          onKeyDown={handleKeyDown}
          className="p-5 min-h-[280px] max-h-[500px] overflow-y-auto prose dark:prose-invert max-w-none text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 outline-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 rounded-b-xl leading-relaxed cursor-text"
          style={{ minHeight: `${minRows * 24}px` }}
        />
      ) : (
        /* CODE MODE - Raw HTML / Markdown Textarea */
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={minRows}
          className="w-full p-4 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono outline-none resize-y"
        />
      )}

      {/* Footer Bar: Word Count & Help Tip */}
      <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <div>
          Word count: <span className="font-bold text-slate-700 dark:text-slate-300">{wordCount}</span>
        </div>
        <div className="hidden sm:block text-[10px] text-slate-400">
          Shortcuts: <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded">Ctrl+B</kbd> Bold • <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded">Ctrl+I</kbd> Italic • <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded">Ctrl+K</kbd> Link
        </div>
      </div>
    </div>
  );
});

