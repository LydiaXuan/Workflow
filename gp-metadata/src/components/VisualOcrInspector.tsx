import React, { useState } from 'react';
import { CompetitorInfo, AsoCopy } from '../types';
import { 
  Eye, Sparkles, CheckCircle2, AlertTriangle, Image as ImageIcon, 
  Layers, ArrowRight, ShieldCheck, HelpCircle, RefreshCw, BarChart2, Tag
} from 'lucide-react';

interface VisualOcrInspectorProps {
  competitors: CompetitorInfo[];
  currentAsoCopy: AsoCopy;
}

export const VisualOcrInspector: React.FC<VisualOcrInspectorProps> = ({
  competitors,
  currentAsoCopy
}) => {
  const [selectedCompId, setSelectedCompId] = useState<string>(competitors[0]?.id || '');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeAnalysis, setActiveAnalysis] = useState<{
    ocrKeywords: string[];
    consistencyScore: number;
    alignedKeywords: string[];
    missingKeywords: string[];
    recommendations: string[];
  } | null>(null);

  const selectedComp = competitors.find(c => c.id === selectedCompId) || competitors[0];

  // Mock initial OCR simulation / synthesis based on competitor titles and gameplay
  const handleRunOcrConsistencyAudit = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      // Extract keywords from competitor or current project
      const rawText = (selectedComp?.title || '') + ' ' + (selectedComp?.shortDescription || '') + ' ' + (selectedComp?.coreFeatures?.join(' ') || '');
      const ocrPool = ['PUZZLE', 'BLOCK BLAST', 'NO WIFI', 'COMBO BONUS', 'BRAIN TRAIN', 'CLASSIC GAME', 'RELAXING ASMR'];
      
      const currentKeywords = (currentAsoCopy?.targetKeywords || ['block puzzle', 'puzzle game', 'offline game']).map(k => k.toUpperCase());
      const aligned = ocrPool.filter(o => currentKeywords.some(ck => ck.includes(o) || o.includes(ck)));
      const missing = ocrPool.filter(o => !aligned.includes(o));

      setActiveAnalysis({
        ocrKeywords: ocrPool,
        consistencyScore: aligned.length >= 3 ? 92 : 78,
        alignedKeywords: aligned.length > 0 ? aligned : ['PUZZLE', 'BLOCK BLAST'],
        missingKeywords: missing.length > 0 ? missing : ['NO WIFI', 'BRAIN TRAIN'],
        recommendations: [
          '截图前 3 张的大字要包含核心词，触发图像识别的一致性加权。',
          '副标题大字提炼核心利益点，与短描述保持一致。',
          '避免密集长句，3–5 个单词的大号粗体识别效果最好。'
        ]
      });
      setIsAnalyzing(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-600">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">截图识别与文案一致性</h2>
              </div>
              <p className="text-xs text-slate-500">
                谷歌会识别截图大字并与文案对齐，一致性越高越有利于排名
              </p>
            </div>
          </div>

          <button
            onClick={handleRunOcrConsistencyAudit}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl shadow-2xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? '正在诊断...' : '一键诊断一致性'}</span>
          </button>
        </div>
      </div>

      {/* Competitor Selector Bar */}
      {competitors.length > 0 && (
        <div className="flex items-center space-x-2 bg-white p-3 rounded-2xl border border-slate-200 overflow-x-auto shadow-2xs">
          <span className="text-xs font-bold text-slate-500 shrink-0 pl-1">对标产品:</span>
          {competitors.map((comp) => (
            <button
              key={comp.id}
              onClick={() => {
                setSelectedCompId(comp.id);
                setActiveAnalysis(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 flex items-center space-x-1.5 ${
                selectedCompId === comp.id
                  ? 'bg-cyan-600 text-white font-bold shadow-2xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {comp.iconUrl && (
                <img src={comp.iconUrl} alt="" className="w-4 h-4 rounded-md object-cover" />
              )}
              <span>{comp.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Grid: Screenshots View & OCR Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Screenshots Preview (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <ImageIcon className="w-4 h-4 text-cyan-600" />
              <span>当前竞品截图</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {(selectedComp?.screenshots?.length || 0)} 张截图
            </span>
          </div>

          {selectedComp?.screenshots && selectedComp.screenshots.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {selectedComp.screenshots.map((sUrl, idx) => (
                <div key={idx} className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shadow-2xs">
                  <img
                    src={sUrl}
                    alt={`Screenshot ${idx + 1}`}
                    className="w-full h-auto object-cover aspect-[9/16]"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/80 to-transparent p-2 text-center">
                    <span className="text-[10px] text-white font-mono font-bold">
                      图 #{idx + 1} (首屏高权重)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-xl">
              <ImageIcon className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">暂无截图，可到「商店素材」查看</p>
            </div>
          )}
        </div>

        {/* Right: OCR Consistency Report (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {activeAnalysis ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              
              {/* Score & Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center font-bold text-lg text-cyan-700 font-mono">
                    {activeAnalysis.consistencyScore}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">截图与文案一致性得分</h3>
                    <p className="text-xs text-slate-500">截图大字与关键词的对齐情况</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                  activeAnalysis.consistencyScore >= 85 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {activeAnalysis.consistencyScore >= 85 ? '一致性高' : '建议强化首屏词'}
                </span>
              </div>

              {/* Keyword Alignment Badges */}
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 block mb-2">
                    已对齐的截图关键词
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {activeAnalysis.alignedKeywords.map((ak, i) => (
                      <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-mono font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{ak}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-800 block mb-2">
                    建议补充到截图的关键词
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {activeAnalysis.missingKeywords.map((mk, i) => (
                      <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-mono font-medium flex items-center space-x-1">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span>{mk}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expert Actionable Recommendations */}
              <div className="bg-cyan-50/50 border border-cyan-200 rounded-xl p-4 space-y-2">
                <span className="font-bold text-xs text-cyan-950 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-600" />
                  <span>优化建议</span>
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-5 leading-relaxed">
                  {activeAnalysis.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-3 shadow-xs">
              <Eye className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs">
                点击右上角「一键诊断一致性」，对比截图大字与关键词的对齐度
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
