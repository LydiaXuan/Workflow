import React from 'react';
import { FileText, Image as ImageIcon, BookOpen } from 'lucide-react';

export type MainDomain = 'copywriting' | 'visuals';

interface NavbarProps {
  currentDomain: MainDomain;
  onChangeDomain: (domain: MainDomain) => void;
  onOpenGuide?: () => void;
  onOpenSuggestions?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentDomain,
  onChangeDomain,
  onOpenGuide
}) => {
  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-40 h-[60px] shadow-2xs">
      <div className="h-full px-6 flex items-center justify-between max-w-[1920px] mx-auto">

        {/* 左侧品牌 */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-base shrink-0">
            优
          </div>
          <h1 className="font-bold text-sm text-slate-900 leading-tight">
            谷歌商店优化助手
          </h1>
        </div>

        {/* 中间：两大板块切换 */}
        <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => onChangeDomain('copywriting')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              currentDomain === 'copywriting'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>文案与关键词</span>
          </button>

          <button
            onClick={() => onChangeDomain('visuals')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              currentDomain === 'visuals'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>商店图与素材</span>
          </button>
        </div>

        {/* 右侧：算法手册 */}
        <div className="flex items-center space-x-2">
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200/80 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>算法手册</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
