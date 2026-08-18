import React from 'react';
import {
  Bot, FileText, BarChart3, Search, Image as ImageIcon,
  Cpu, Eye, BookOpen
} from 'lucide-react';
import { MainDomain } from './Navbar';

interface SidebarProps {
  currentDomain: MainDomain;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenGuide?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentDomain,
  activeTab,
  setActiveTab,
  onOpenGuide
}) => {
  // 文案板块步骤（按 1→2→3→4 顺序）
  const copySteps = [
    { id: 'competitor', stepNum: '1', label: '竞品文案', icon: Search },
    { id: 'analysis', stepNum: '2', label: '关键词分析', icon: BarChart3 },
    { id: 'generator', stepNum: '3', label: '文案生成', icon: Bot },
    { id: 'releasenotes', stepNum: '4', label: '更新日志', icon: FileText },
    { id: 'knowledge', stepNum: '5', label: '算法知识库', icon: Cpu },
  ];

  // 素材板块
  const visualSteps = [
    { id: 'assets', stepNum: '1', label: '商店素材', icon: ImageIcon },
    { id: 'visual_ocr', stepNum: '2', label: '截图识别', icon: Eye },
  ];

  const currentSteps = currentDomain === 'copywriting' ? copySteps : visualSteps;

  return (
    <aside className="w-[210px] shrink-0 bg-white border-r border-slate-200 p-3 flex flex-col justify-between h-[calc(100vh-60px)] sticky top-[60px] shadow-2xs select-none">
      <div className="space-y-4">

        {/* 分组标题 */}
        <div className="px-2 pt-1">
          <span className="text-[11px] font-bold tracking-wider text-slate-500">
            {currentDomain === 'copywriting' ? '文案优化流程' : '素材工作流'}
          </span>
        </div>

        {/* 菜单项 */}
        <nav className="space-y-1">
          {currentSteps.map((step) => {
            const Icon = step.icon;
            const isActive = activeTab === step.id;

            return (
              <button
                key={step.id}
                onClick={() => setActiveTab(step.id)}
                className={`w-full text-left px-2.5 py-2.5 rounded-xl transition-all border flex items-center space-x-2.5 group cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                    : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className={`w-5 h-5 flex items-center justify-center text-[11px] font-bold rounded-md shrink-0 ${
                  isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700'
                }`}>
                  {step.stepNum}
                </span>
                <span className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
                  {step.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 底部：算法手册 */}
      <div className="pt-2 border-t border-slate-100">
        <button
          onClick={onOpenGuide}
          className="w-full p-2.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-xl transition text-xs font-semibold flex items-center justify-center space-x-1.5 border border-slate-200/80 cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>算法手册</span>
        </button>
      </div>
    </aside>
  );
};
