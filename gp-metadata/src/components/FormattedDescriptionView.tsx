import React, { useState } from 'react';
import { Copy, Check, FileText, Code, Eye, Sparkles } from 'lucide-react';

interface FormattedDescriptionViewProps {
  text: string;
  translatedText?: string;
  title?: string;
  maxLength?: number;
  onCopy?: () => void;
  copied?: boolean;
}

export function formatLongDescriptionText(rawText: string): string {
  if (!rawText) return '';
  // Unescape literal \n strings if present from raw JSON stringification
  let clean = rawText.replace(/\\n/g, '\n');

  // Normalize excessive empty lines to maximum 2 newlines
  clean = clean.replace(/\n{3,}/g, '\n\n');

  // If text has no newlines or very few newlines despite being long (>150 chars),
  // auto-insert linebreaks before common headers, emojis, and bullet points!
  if (!clean.includes('\n') || (clean.length > 150 && clean.split('\n').length < 3)) {
    clean = clean
      .replace(/([.!?]|[\u4e00-\u9fa5])\s*([A-Z0-9\s—–-]{3,35}:)/g, '$1\n\n$2')
      .replace(/([.!?]|[\u4e00-\u9fa5])\s*([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}])/gu, '$1\n\n$2')
      .replace(/([.!?]|[\u4e00-\u9fa5])\s*([•\-*]\s+|[0-9]+\.\s+)/g, '$1\n$2');
  }

  return clean.trim();
}

/** Render text safely replacing <b>, <i>, <u> tags with styled React elements */
function renderHtmlDescription(text: string) {
  if (!text) return null;

  // Split by supported HTML tags: <b>...</b>, <i>...</i>, <u>...</u>, <br>
  const parts = text.split(/(<b>.*?<\/b>|<i>.*?<\/i>|<u>.*?<\/u>|<br\s*\/?>)/gis);

  return parts.map((part, idx) => {
    if (/^<b>(.*?)<\/b>$/is.test(part)) {
      const inner = part.replace(/^<b>|<\/b>$/gis, '');
      return (
        <strong key={idx} className="font-extrabold text-blue-700 bg-blue-50/60 px-1 py-0.5 rounded">
          {inner}
        </strong>
      );
    }
    if (/^<i>(.*?)<\/i>$/is.test(part)) {
      const inner = part.replace(/^<i>|<\/i>$/gis, '');
      return <em key={idx} className="italic text-slate-700">{inner}</em>;
    }
    if (/^<u>(.*?)<\/u>$/is.test(part)) {
      const inner = part.replace(/^<u>|<\/u>$/gis, '');
      return <u key={idx} className="underline decoration-blue-400">{inner}</u>;
    }
    if (/^<br\s*\/?>$/is.test(part)) {
      return <br key={idx} />;
    }
    return <span key={idx}>{part}</span>;
  });
}

export const FormattedDescriptionView: React.FC<FormattedDescriptionViewProps> = ({
  text,
  translatedText,
  title = "长描述",
  maxLength = 4000,
  onCopy,
  copied = false
}) => {
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  const formattedEn = formatLongDescriptionText(text);
  const formattedZh = translatedText ? formatLongDescriptionText(translatedText) : '';

  // Extract first 167 chars for above the fold indicator
  const aboveTheFoldChars = Math.min(167, formattedEn.length);

  return (
    <div className="space-y-2">
      {/* Header bar with title, length, view mode toggle and copy button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800">{title}</span>
          <span className="text-[11px] font-mono font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {formattedEn.length} / {maxLength} 字符
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Render / Raw Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium border border-slate-200">
            <button
              onClick={() => setViewMode('rendered')}
              className={`px-2 py-0.5 rounded-md flex items-center space-x-1 transition cursor-pointer ${
                viewMode === 'rendered' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="预览富文本排版与加粗效果"
            >
              <Eye className="w-3 h-3" />
              <span>排版渲染</span>
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-2 py-0.5 rounded-md flex items-center space-x-1 transition cursor-pointer ${
                viewMode === 'raw' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="查看提交源码（含 <b> 标签）"
            >
              <Code className="w-3 h-3" />
              <span>源码</span>
            </button>
          </div>

          {onCopy && (
            <button
              onClick={onCopy}
              className="text-xs text-blue-600 font-bold hover:bg-blue-50 px-2.5 py-1 rounded-lg transition border border-transparent hover:border-blue-200 flex items-center space-x-1 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>复制长描述</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 首屏提示 */}
      <div className="flex items-center px-3 py-1.5 bg-blue-50/50 border border-blue-100/70 rounded-lg text-[10px] text-blue-900 font-medium">
        <Sparkles className="w-3 h-3 text-blue-600 shrink-0 mr-1.5" />
        <span>首屏黄金位：前约 167 字符已前置核心卖点并加粗关键词</span>
      </div>

      {/* Direct Google Play Store raw text rendering with native linebreaks and formatting */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 text-xs sm:text-sm font-normal text-slate-900 font-sans leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap">
        {viewMode === 'rendered' ? renderHtmlDescription(formattedEn) : formattedEn}
      </div>

      {/* Optional Chinese translation reference */}
      {formattedZh && (
        <details className="mt-2 text-xs text-slate-500 font-normal group">
          <summary className="cursor-pointer text-blue-600 hover:underline font-bold py-1">
            查看中文对照
          </summary>
          <div className="mt-2 bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/60 whitespace-pre-wrap leading-relaxed text-slate-700 font-sans text-xs sm:text-sm">
            {viewMode === 'rendered' ? renderHtmlDescription(formattedZh) : formattedZh}
          </div>
        </details>
      )}
    </div>
  );
};
