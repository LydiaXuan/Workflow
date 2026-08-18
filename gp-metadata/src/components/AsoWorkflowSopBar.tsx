import React from 'react';
import { Search, BarChart3, Bot, FileText, ArrowRight } from 'lucide-react';

interface AsoWorkflowSopBarProps {
  currentStep: 'competitor' | 'analysis' | 'generator' | 'releasenotes' | 'knowledge';
  onNavigateStep: (step: string) => void;
}

export const AsoWorkflowSopBar: React.FC<AsoWorkflowSopBarProps> = ({
  currentStep,
  onNavigateStep
}) => {
  const steps = [
    { id: 'competitor', stepNum: '1', title: '竞品文案', icon: Search },
    { id: 'analysis', stepNum: '2', title: '关键词分析', icon: BarChart3 },
    { id: 'generator', stepNum: '3', title: '文案生成', icon: Bot },
    { id: 'releasenotes', stepNum: '4', title: '更新日志', icon: FileText }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs">
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isCurrent = currentStep === s.id;
          const isPassed = steps.findIndex(st => st.id === currentStep) > idx;

          return (
            <React.Fragment key={s.id}>
              <button
                onClick={() => onNavigateStep(s.id)}
                className={`flex-1 min-w-[130px] p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center space-x-2 ${
                  isCurrent
                    ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-100 shadow-2xs'
                    : isPassed
                    ? 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100/80 text-slate-700'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <span className={`w-5 h-5 flex items-center justify-center text-[11px] font-bold rounded-md shrink-0 ${
                  isCurrent
                    ? 'bg-blue-600 text-white'
                    : isPassed
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {s.stepNum}
                </span>
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-blue-600' : isPassed ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-bold truncate ${isCurrent ? 'text-blue-900' : 'text-slate-800'}`}>
                  {s.title}
                </span>
              </button>

              {idx < steps.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0 hidden sm:block" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
