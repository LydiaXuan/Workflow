import React, { useState } from 'react';
import { AsoCopy, CompetitorInfo, ShortDescriptionVariant, AsoQualityReport } from '../types';
import { 
  Bot, Sparkles, Check, ArrowRight, RefreshCw, Sliders, Tag, FileText, 
  CheckCircle2, Copy, HelpCircle, X, Plus, Trash2, BookOpen, ShieldCheck, 
  Layers, AlertTriangle, ChevronDown, ChevronUp, BarChart3, CheckSquare, Target
} from 'lucide-react';
import { FormattedDescriptionView } from './FormattedDescriptionView';
import { SmartWordTrimmer } from './SmartWordTrimmer';
import { AlgorithmGuideModal } from './AlgorithmGuideModal';
import { AsoWorkflowSopBar } from './AsoWorkflowSopBar';

interface AsoGeneratorProps {
  currentCopy: AsoCopy;
  competitors?: CompetitorInfo[];
  activeProjectName?: string;
  onApplyGeneratedCopy: (generated: AsoCopy) => void;
  onNavigateToSimulator: (step?: string) => void;
}

export const AsoGenerator: React.FC<AsoGeneratorProps> = ({
  currentCopy,
  competitors = [],
  activeProjectName = '',
  onApplyGeneratedCopy,
  onNavigateToSimulator
}) => {
  const [appName, setAppName] = useState(activeProjectName || currentCopy.appName || '');
  const [subGenre, setSubGenre] = useState(currentCopy.subGenre || 'Games > Puzzle');
  const [locale, setLocale] = useState('en-US (美区英语)');
  const [tone, setTone] = useState('休闲益智 / 轻松解压 (Casual & Relaxing)');

  // 3-Tier Keyword Architecture
  const [tier1Keywords, setTier1Keywords] = useState<string[]>(
    currentCopy.targetKeywords && currentCopy.targetKeywords.length > 0 
      ? currentCopy.targetKeywords.slice(0, 3) 
      : ['block puzzle', 'puzzle game']
  );
  const [tier2Keywords, setTier2Keywords] = useState<string[]>(
    currentCopy.targetKeywords && currentCopy.targetKeywords.length > 3
      ? currentCopy.targetKeywords.slice(3, 8)
      : ['match 3', 'brain training', 'blast blocks', 'logic puzzle']
  );
  const [tier3Keywords, setTier3Keywords] = useState<string[]>(
    currentCopy.targetKeywords && currentCopy.targetKeywords.length > 8
      ? currentCopy.targetKeywords.slice(8)
      : ['offline puzzle game', 'casual brain teaser', 'free puzzle no wifi']
  );

  const [activeKeywordTier, setActiveKeywordTier] = useState<'tier1' | 'tier2' | 'tier3'>('tier1');
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [showKeywordSelector, setShowKeywordSelector] = useState(false);

  // Verified Gameplay Features (唯一事实来源 - 单一真实清单)
  const [coreFeaturesInput, setCoreFeaturesInput] = useState(
    '• 经典方块拖拽消除玩法\n• 无限连击与消除连击得分加成\n• 离线单机无网畅玩\n• 多种特色方块与强力道具助力\n• 舒缓解压音效与清新视觉风格'
  );
  const [isSummarizingFeatures, setIsSummarizingFeatures] = useState(false);

  // Generation state
  const [isLoading, setIsLoading] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<AsoCopy | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isApplied, setIsApplied] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [shorteningField, setShorteningField] = useState<string | null>(null);
  const [warningDialog, setWarningDialog] = useState<{ message: string; action: () => void } | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Short description variant selection
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0);

  // Quality report expandable section
  const [showQualityReport, setShowQualityReport] = useState<boolean>(true);

  // AI Auto-synthesis handler for selling points from competitors & active project theme
  const handleAutoSynthesizeFeatures = async (overrideAppName?: string) => {
    setIsSummarizingFeatures(true);
    const targetName = overrideAppName || appName || activeProjectName;
    try {
      const allKws = [...tier1Keywords, ...tier2Keywords, ...tier3Keywords];
      const res = await fetch('/api/gemini/summarize-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitors: (competitors || []).map(c => ({
            name: c.name,
            title: c.title,
            coreFeatures: c.coreFeatures,
            commonPoints: c.commonPoints,
            differentiationPoints: c.differentiationPoints,
            shortDescriptionZh: c.shortDescriptionZh
          })),
          appName: targetName,
          subGenre,
          targetKeywords: allKws
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sellingPoints) {
          setCoreFeaturesInput(data.sellingPoints);
        }
      }
    } catch (err) {
      console.error('Failed to summarize features:', err);
    } finally {
      setIsSummarizingFeatures(false);
    }
  };

  // Sync state when active project's currentCopy changes
  React.useEffect(() => {
    const targetName = currentCopy.appName || activeProjectName || '';
    if (targetName) {
      setAppName(targetName);
    }
    setSubGenre(currentCopy.subGenre || 'Games > Puzzle');
    if (currentCopy.targetKeywords && currentCopy.targetKeywords.length > 0) {
      setTier1Keywords(currentCopy.targetKeywords.slice(0, 3));
      setTier2Keywords(currentCopy.targetKeywords.slice(3, 8));
      setTier3Keywords(currentCopy.targetKeywords.slice(8));
    }
  }, [currentCopy.appName, activeProjectName, currentCopy.subGenre]);

  // Extract all available keywords from competitors list for multi-select import
  const allExtractedKeywords = Array.from(new Set(competitors.flatMap(c => c.keywords.map(k => k.word))));

  const removeKeyword = (kwToRemove: string, tier: 'tier1' | 'tier2' | 'tier3') => {
    if (tier === 'tier1') setTier1Keywords(prev => prev.filter(kw => kw !== kwToRemove));
    if (tier === 'tier2') setTier2Keywords(prev => prev.filter(kw => kw !== kwToRemove));
    if (tier === 'tier3') setTier3Keywords(prev => prev.filter(kw => kw !== kwToRemove));
  };

  const addKeywordsToTier = (rawText: string, tier: 'tier1' | 'tier2' | 'tier3') => {
    if (!rawText.trim()) return;
    const parts = rawText.split(/[,，\n]/).map(s => s.trim()).filter(Boolean);
    const updater = (prev: string[]) => {
      const existing = new Set(prev.map(p => p.toLowerCase()));
      const toAdd = parts.filter(p => !existing.has(p.toLowerCase()));
      return [...prev, ...toAdd];
    };

    if (tier === 'tier1') setTier1Keywords(updater);
    if (tier === 'tier2') setTier2Keywords(updater);
    if (tier === 'tier3') setTier3Keywords(updater);
    setNewKeywordInput('');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
      e.preventDefault();
      addKeywordsToTier(newKeywordInput, activeKeywordTier);
    }
  };

  const toggleImportKeyword = (kw: string) => {
    const normalized = kw.trim();
    if (!normalized) return;

    if (activeKeywordTier === 'tier1') {
      setTier1Keywords(prev => prev.some(k => k.toLowerCase() === normalized.toLowerCase())
        ? prev.filter(k => k.toLowerCase() !== normalized.toLowerCase())
        : [...prev, normalized]
      );
    } else if (activeKeywordTier === 'tier2') {
      setTier2Keywords(prev => prev.some(k => k.toLowerCase() === normalized.toLowerCase())
        ? prev.filter(k => k.toLowerCase() !== normalized.toLowerCase())
        : [...prev, normalized]
      );
    } else {
      setTier3Keywords(prev => prev.some(k => k.toLowerCase() === normalized.toLowerCase())
        ? prev.filter(k => k.toLowerCase() !== normalized.toLowerCase())
        : [...prev, normalized]
      );
    }
  };

  const handleGenerateAndEvaluate = async () => {
    if (!appName.trim()) {
      setErrorMsg('请输入产品名称');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setIsApplied(false);

    try {
      const combinedKeywords = [...tier1Keywords, ...tier2Keywords, ...tier3Keywords].filter(Boolean);

      // Generate Google Play Copy adhering to §0-§11 rules
      const response = await fetch('/api/gemini/generate-aso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName,
          subGenre,
          locale,
          tone,
          targetKeywords: combinedKeywords,
          tier1Keywords,
          tier2Keywords,
          tier3Keywords,
          coreFeatures: coreFeaturesInput,
          competitors: competitors.map(c => ({
            title: c.title,
            subGenre: c.subGenre,
            keywords: c.keywords.slice(0, 10).map(k => k.word),
            coreFeatures: c.coreFeatures,
            commonPoints: c.commonPoints,
            differentiationPoints: c.differentiationPoints
          }))
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '生成 ASO 文案失败');
      }

      const data = await response.json();

      const newCopy: AsoCopy = {
        appName: data.appName || appName,
        title: data.title || '',
        shortDescription: data.shortDescription || '',
        longDescription: data.longDescription || '',
        targetKeywords: data.targetKeywords || combinedKeywords,
        subGenre: data.subGenre || subGenre,
        shortDescriptionVariants: data.shortDescriptionVariants || [],
        qualityReport: data.qualityReport || undefined
      };

      setGeneratedOutput(newCopy);
      setSelectedVariantIdx(0);

    } catch (err: any) {
      setErrorMsg(err.message || '生成过程中出现错误，请检查网络后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVariant = (variant: ShortDescriptionVariant, idx: number) => {
    setSelectedVariantIdx(idx);
    if (generatedOutput) {
      setGeneratedOutput({
        ...generatedOutput,
        shortDescription: variant.text
      });
    }
  };

  const handleShortenSingleField = async (fieldKey: 'title' | 'shortDescription' | 'longDescription', currentText: string, limit: number) => {
    if (!currentText || currentText.length <= limit) return;
    setShorteningField(fieldKey);
    try {
      const res = await fetch('/api/gemini/shorten-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentText,
          maxLen: limit,
          fieldName: fieldKey === 'title' ? 'Title' : fieldKey === 'shortDescription' ? 'Short Description' : 'Long Description'
        })
      });
      if (!res.ok) throw new Error('精简失败');
      const data = await res.json();
      if (data.shortenedText && generatedOutput) {
        setGeneratedOutput({
          ...generatedOutput,
          [fieldKey]: data.shortenedText
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || '智能精简失败');
    } finally {
      setShorteningField(null);
    }
  };

  const handleAutoShortenAll = async () => {
    if (!generatedOutput) return;
    if (generatedOutput.title.length > 30) {
      await handleShortenSingleField('title', generatedOutput.title, 30);
    }
    if (generatedOutput.shortDescription.length > 80) {
      await handleShortenSingleField('shortDescription', generatedOutput.shortDescription, 80);
    }
    if (generatedOutput.longDescription.length > 4000) {
      await handleShortenSingleField('longDescription', generatedOutput.longDescription, 4000);
    }
    setWarningDialog(null);
  };

  const handleCopy = (text: string, sectionKey: string, maxLen?: number) => {
    if (maxLen && text.length > maxLen) {
      setWarningDialog({
        message: `内容超出限制（当前 ${text.length} / 上限 ${maxLen} 字符），建议先智能精简。`,
        action: () => {
          navigator.clipboard.writeText(text);
          setCopiedSection(sectionKey);
          setTimeout(() => setCopiedSection(null), 2000);
          setWarningDialog(null);
        }
      });
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleApply = () => {
    if (generatedOutput) {
      onApplyGeneratedCopy(generatedOutput);
      setIsApplied(true);
      setTimeout(() => setIsApplied(false), 2500);
    }
  };

  return (
    <div className="space-y-6">

      {/* SOP Progress Bar */}
      <AsoWorkflowSopBar
        currentStep="generator"
        onNavigateStep={(step) => onNavigateToSimulator(step)}
      />

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">文案生成</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                一键生成标题、短描述（3 组变体）与长描述
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
          >
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>算法手册</span>
          </button>
        </div>

        {/* 4 Core Pillars Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-[11px]">
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
            <span className="font-bold text-slate-800 flex items-center space-x-1">
              <Target className="w-3.5 h-3.5 text-blue-600" />
              <span>分层关键词</span>
            </span>
            <p className="text-slate-500 text-[10px]">核心词 1-3 / 主要词 5-8 / 长尾词 10-20</p>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
            <span className="font-bold text-slate-800 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>短描述 3 组变体</span>
            </span>
            <p className="text-slate-500 text-[10px]">利益点 / 场景共鸣 / 纯排名（≤80 字符）</p>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
            <span className="font-bold text-slate-800 flex items-center space-x-1">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
              <span>2.0% - 3.0% 黄金密度</span>
            </span>
            <p className="text-slate-500 text-[10px]">长描述 5 段式结构，关键词局部加粗</p>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
            <span className="font-bold text-slate-800 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
              <span>玩法真实性</span>
            </span>
            <p className="text-slate-500 text-[10px]">单一事实来源核验，严禁虚构假模式/假具体数据</p>
          </div>
        </div>
      </div>

      {/* Form & Output Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Form Column */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>基础设置</span>
          </h3>

          {/* App Name Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                产品名称
              </label>
              <span className={`text-[10px] font-mono font-medium ${appName.length > 30 ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                {appName.length} / 30 字符
              </span>
            </div>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="例: Block Blast / Wood Block Puzzle"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            />
          </div>

          {/* Sub-Genre & Locale Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                目标市场
              </label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
              >
                <option value="en-US (美区英语)">美区英语</option>
                <option value="de-DE (德语)">德语</option>
                <option value="ja-JP (日语)">日语</option>
                <option value="zh-TW (繁体中文)">繁体中文</option>
                <option value="ko-KR (韩语)">韩语</option>
                <option value="es-ES (西班牙语)">西班牙语</option>
                <option value="fr-FR (法语)">法语</option>
                <option value="pt-BR (巴西葡语)">巴西葡语</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                所属品类
              </label>
              <select
                value={subGenre}
                onChange={(e) => setSubGenre(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
              >
                <option value="Games > Puzzle">益智解谜</option>
                <option value="Games > Casual">轻松休闲</option>
                <option value="Games > Action">动作爆破</option>
                <option value="Games > Arcade">经典街机</option>
                <option value="Games > Board">棋牌桌游</option>
              </select>
            </div>
          </div>

          {/* Visual Tone & Archetype */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              文案风格
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
            >
              <option value="休闲益智 / 轻松解压 (Casual & Relaxing)">休闲益智 / 轻松解压</option>
              <option value="Royal / 华丽典雅 (👑 💎 ✨ 🏰)">华丽典雅</option>
              <option value="竞技爆破 / 爽快击碎 (🔥 💥 🏆 ⚡)">竞技爆破 / 爽快击碎</option>
              <option value="极简解压 ASMR (🍃 🎧 🧘)">极简解压</option>
              <option value="复古经典街机 (🕹️ 👾 ⭐️)">复古经典街机</option>
            </select>
          </div>

          {/* 3-Tier Keyword Management */}
          <div className="space-y-2.5 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>分层关键词</span>
              </label>
              <button
                type="button"
                onClick={() => setShowKeywordSelector(!showKeywordSelector)}
                className="text-[11px] text-blue-600 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <Tag className="w-3 h-3" />
                <span>{showKeywordSelector ? '收起竞品词池' : '从竞品词库导入'}</span>
              </button>
            </div>

            {/* Tier Tabs */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveKeywordTier('tier1')}
                className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                  activeKeywordTier === 'tier1' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                核心词 ({tier1Keywords.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveKeywordTier('tier2')}
                className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                  activeKeywordTier === 'tier2' ? 'bg-white text-purple-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                主要词 ({tier2Keywords.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveKeywordTier('tier3')}
                className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                  activeKeywordTier === 'tier3' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                长尾词 ({tier3Keywords.length})
              </button>
            </div>

            {/* Tier Description Hint */}
            <p className="text-[10px] text-slate-500 leading-normal">
              {activeKeywordTier === 'tier1' && '核心词（1–3 个）：决定主排名，需进入标题、短描述与长描述首屏。'}
              {activeKeywordTier === 'tier2' && '主要词（5–8 个）：品类与核心玩法词，铺在长描述的核心玩法段。'}
              {activeKeywordTier === 'tier3' && '长尾词（10–20 个）：场景/人群/低竞争词（如 offline puzzle），铺在特色差异段。'}
            </p>

            {/* Keyword Chips Container */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 min-h-[75px] focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 transition">
              <div className="flex flex-wrap gap-1.5 items-center">
                {(activeKeywordTier === 'tier1' ? tier1Keywords : activeKeywordTier === 'tier2' ? tier2Keywords : tier3Keywords).map((kw, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center space-x-1 text-xs font-mono font-medium px-2 py-0.5 rounded-lg border transition ${
                      activeKeywordTier === 'tier1'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : activeKeywordTier === 'tier2'
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : 'bg-slate-100 text-slate-800 border-slate-300'
                    }`}
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => removeKeyword(kw, activeKeywordTier)}
                      className="text-slate-400 hover:text-red-600 rounded p-0.5 transition cursor-pointer ml-0.5"
                      title={`删除关键词: ${kw}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Inline Input Field */}
                <div className="flex items-center flex-1 min-w-[130px] space-x-1">
                  <input
                    type="text"
                    value={newKeywordInput}
                    onChange={(e) => setNewKeywordInput(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    onBlur={() => {
                      if (newKeywordInput.trim()) {
                        addKeywordsToTier(newKeywordInput, activeKeywordTier);
                      }
                    }}
                    placeholder="+ 添加新词 (按 Enter)..."
                    className="w-full bg-transparent text-xs text-slate-800 font-mono focus:outline-none placeholder:text-slate-400 py-1"
                  />
                  {newKeywordInput.trim() && (
                    <button
                      type="button"
                      onClick={() => addKeywordsToTier(newKeywordInput, activeKeywordTier)}
                      className="p-1 bg-blue-600 text-white rounded-md text-[10px] font-bold shrink-0 hover:bg-blue-700 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Keyword Multi-Select Picker from Competitor Pool */}
            {showKeywordSelector && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-blue-900 text-[10px] block">
                  点击把竞品词加入当前列表：
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {allExtractedKeywords.map((kw, i) => {
                    const currentTierList = activeKeywordTier === 'tier1' ? tier1Keywords : activeKeywordTier === 'tier2' ? tier2Keywords : tier3Keywords;
                    const isSelected = currentTierList.some(k => k.toLowerCase() === kw.toLowerCase());
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleImportKeyword(kw)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition border flex items-center space-x-1 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        <span>{isSelected ? '✓' : '+'}</span>
                        <span>{kw}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Verified Gameplay Features */}
          <div className="space-y-1.5 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>真实玩法清单</span>
              </label>
              <button
                type="button"
                onClick={() => handleAutoSynthesizeFeatures()}
                disabled={isSummarizingFeatures}
                className="text-[11px] text-purple-700 hover:text-purple-900 font-bold flex items-center space-x-1 cursor-pointer"
                title="从竞品提炼玩法与卖点"
              >
                <Sparkles className={`w-3 h-3 text-purple-600 ${isSummarizingFeatures ? 'animate-spin' : ''}`} />
                <span>{isSummarizingFeatures ? '提炼中...' : '智能提炼'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              只依据下方列出的真实玩法写作，<strong>不编造功能或数字</strong>。
            </p>
            <textarea
              value={coreFeaturesInput}
              onChange={(e) => setCoreFeaturesInput(e.target.value)}
              rows={4}
              placeholder="逐条列出游戏实际存在的玩法机制..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 leading-relaxed font-mono"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
              {errorMsg}
            </p>
          )}

          <button
            onClick={handleGenerateAndEvaluate}
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>正在生成文案...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>生成文案</span>
              </>
            )}
          </button>
        </div>

        {/* Output Column */}
        <div className="lg:col-span-7 space-y-5">
          
          {generatedOutput ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">生成结果</h3>
                </div>

                <button
                  onClick={handleApply}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    isApplied ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isApplied ? '已同步至项目' : '同步应用至当前项目'}</span>
                </button>
              </div>

              {/* Title Result */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-800">标题</span>
                    <span className="font-mono text-slate-500">{generatedOutput.title.length} / 30 字符</span>
                    {generatedOutput.title.length <= 30 ? (
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                        符合 30 字符
                      </span>
                    ) : (
                      <span className="text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold border border-red-200">
                        ✕ 超出 {generatedOutput.title.length - 30} 字符
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => handleCopy(generatedOutput.title, 'genTitle', 30)} 
                    className="text-blue-600 hover:underline cursor-pointer font-bold"
                  >
                    {copiedSection === 'genTitle' ? '已复制' : '复制'}
                  </button>
                </div>
                <p className="font-bold text-slate-900 text-sm font-mono">{generatedOutput.title}</p>
                
                <SmartWordTrimmer
                  text={generatedOutput.title}
                  maxLength={30}
                  label="Title"
                  onApplyTrimmed={(trimmed) => setGeneratedOutput({ ...generatedOutput, title: trimmed })}
                  onShortenWithAi={() => handleShortenSingleField('title', generatedOutput.title, 30)}
                  isAiLoading={shorteningField === 'title'}
                />
              </div>

              {/* Short Description Multi-Variant Hub (A/B Test Variants) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-900">
                      短描述 · 3 组变体
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {generatedOutput.shortDescription.length} / 80 字符
                    </span>
                  </div>

                  <button 
                    onClick={() => handleCopy(generatedOutput.shortDescription, 'genShort', 80)} 
                    className="text-xs text-blue-600 hover:underline cursor-pointer font-bold"
                  >
                    {copiedSection === 'genShort' ? '已复制当前短描述' : '复制当前短描述'}
                  </button>
                </div>

                {/* Variant Switcher Tabs */}
                {generatedOutput.shortDescriptionVariants && generatedOutput.shortDescriptionVariants.length > 0 ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center space-x-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
                      {generatedOutput.shortDescriptionVariants.map((v, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectVariant(v, i)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition cursor-pointer shrink-0 ${
                            selectedVariantIdx === i 
                              ? 'bg-white text-blue-700 shadow-2xs font-bold' 
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>{v.label}</span>
                          <span className="text-[10px] text-slate-400 ml-1">({v.length}字)</span>
                        </button>
                      ))}
                    </div>

                    {/* Current Selected Variant Card */}
                    {generatedOutput.shortDescriptionVariants[selectedVariantIdx] && (
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700 flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span>主张定位: {generatedOutput.shortDescriptionVariants[selectedVariantIdx].focus}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            表情：{generatedOutput.shortDescriptionVariants[selectedVariantIdx].emojiCount} 个
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 text-xs sm:text-sm font-mono leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {generatedOutput.shortDescriptionVariants[selectedVariantIdx].text}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-800 text-xs font-mono">{generatedOutput.shortDescription}</p>
                  </div>
                )}

                <SmartWordTrimmer
                  text={generatedOutput.shortDescription}
                  maxLength={80}
                  label="Short Description"
                  onApplyTrimmed={(trimmed) => setGeneratedOutput({ ...generatedOutput, shortDescription: trimmed })}
                  onShortenWithAi={() => handleShortenSingleField('shortDescription', generatedOutput.shortDescription, 80)}
                  isAiLoading={shorteningField === 'shortDescription'}
                />
              </div>

              {/* Long Description Result */}
              <div>
                <FormattedDescriptionView
                  text={generatedOutput.longDescription}
                  title="长描述"
                  onCopy={() => handleCopy(generatedOutput.longDescription, 'genLong', 4000)}
                  copied={copiedSection === 'genLong'}
                />

                <SmartWordTrimmer
                  text={generatedOutput.longDescription}
                  maxLength={4000}
                  label="Long Description"
                  onApplyTrimmed={(trimmed) => setGeneratedOutput({ ...generatedOutput, longDescription: trimmed })}
                  onShortenWithAi={() => handleShortenSingleField('longDescription', generatedOutput.longDescription, 4000)}
                  isAiLoading={shorteningField === 'longDescription'}
                />
              </div>

              {/* §10 & §11 Quality Audit & Compliance Matrix */}
              {generatedOutput.qualityReport && (
                <div className="border border-blue-100 bg-blue-50/30 rounded-2xl p-4 space-y-3">
                  <div 
                    onClick={() => setShowQualityReport(!showQualityReport)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-bold text-slate-900">
                        质检报告
                      </h4>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        真实玩法核验通过
                      </span>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600">
                      {showQualityReport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {showQualityReport && (
                    <div className="space-y-3 pt-2 text-xs">
                      
                      {/* Keyword Tier Coverage Matrix */}
                      <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2">
                        <span className="font-bold text-slate-800 text-[11px] block">
                          关键词覆盖自检
                        </span>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px] border border-slate-100">
                            <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                              <tr>
                                <th className="p-1.5 text-left">关键词</th>
                                <th className="p-1.5 text-center">标题</th>
                                <th className="p-1.5 text-center">短描述</th>
                                <th className="p-1.5 text-center">长描述首屏</th>
                                <th className="p-1.5 text-center">正文出现</th>
                                <th className="p-1.5 text-center">词频密度</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                              {generatedOutput.qualityReport.keywordCoverage.map((kc, i) => (
                                <tr key={i} className="hover:bg-slate-50/50">
                                  <td className="p-1.5 font-bold text-blue-900">{kc.keyword}</td>
                                  <td className="p-1.5 text-center">{kc.inTitle ? '✅' : '—'}</td>
                                  <td className="p-1.5 text-center">{kc.inShortDesc ? '✅' : '—'}</td>
                                  <td className="p-1.5 text-center">{kc.inAboveFold ? '✅' : '—'}</td>
                                  <td className="p-1.5 text-center font-bold">{kc.longDescCount} 次</td>
                                  <td className="p-1.5 text-center">
                                    <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-200 text-[10px]">
                                      {kc.density}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Gameplay Features Verification Table */}
                      <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2">
                        <span className="font-bold text-slate-800 text-[11px] block">
                          功能真实性自检
                        </span>
                        <div className="space-y-1.5">
                          {generatedOutput.qualityReport.featureChecks.map((fc, i) => (
                            <div key={i} className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg text-[11px]">
                              <span className="text-slate-800 font-medium font-sans">
                                • {fc.featureMentioned}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0 ml-2">
                                在真实清单内
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Google Play Policy Compliance Matrix */}
                      <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2">
                        <span className="font-bold text-slate-800 text-[11px] block">
                          政策合规自检
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] text-slate-700">
                          {generatedOutput.qualityReport.complianceItems.map((ci, i) => (
                            <div key={i} className="flex items-center space-x-1.5 p-1 bg-slate-50 rounded">
                              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{ci}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-3 shadow-xs">
              <Bot className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs">
                填写产品名称、关键词与真实玩法后，点击左侧按钮生成文案
              </p>
            </div>
          )}

        </div>

      </div>

      {/* Over Limit Warning & Auto-Fix Modal */}
      {warningDialog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">字数超出提示</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              {warningDialog.message}
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={warningDialog.action}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                仍要直接复制
              </button>

              <button
                onClick={handleAutoShortenAll}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>一键智能精简</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Algorithm & Rules Modal */}
      <AlgorithmGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

    </div>
  );
};
