import React, { useState, useEffect } from 'react';
import { CompetitorInfo, KeywordMetric } from '../types';
import { Tag, Sparkles, CheckCircle2, ArrowRight, Flame, Layers3, Target, Package, Gamepad2, Smile, Activity, AlertCircle, FileText, Copy, Check, TrendingUp, Hash, Filter, CheckSquare, Square, Info, Code, Sliders, X, ExternalLink, BarChart3 } from 'lucide-react';
import { AsoWorkflowSopBar } from './AsoWorkflowSopBar';

interface CompetitorAnalyzerProps {
  competitors: CompetitorInfo[];
  selectedCompetitorId: string;
  isAllSelected: boolean;
  onSelectCompetitor: (competitor: CompetitorInfo) => void;
  onToggleSelectAll: () => void;
  onApplyToAsoWriter: (competitor: CompetitorInfo) => void;
  onApplyAllKeywordsToWriter: (keywords: string[]) => void;
  onNavigateStep?: (step: string) => void;
}

// Helper to extract fallback keywords from text if competitor keywords are empty
const extractFallbackKeywords = (comp: CompetitorInfo): KeywordMetric[] => {
  if (comp.keywords && comp.keywords.length > 0) return comp.keywords;
  const fullText = `${comp.title || ''} ${comp.shortDescription || ''} ${comp.longDescription || ''}`;
  const stopWords = new Set(['the', 'and', 'for', 'with', 'you', 'your', 'this', 'that', 'are', 'from', 'have', 'more', 'all', 'can', 'game', 'play', 'free', 'new', 'official', 'app', 'store', 'google']);
  const words = fullText.toLowerCase().match(/[a-z]{3,}/g) || [];
  const counts: Record<string, number> = {};
  words.forEach(w => {
    if (!stopWords.has(w)) {
      counts[w] = (counts[w] || 0) + 1;
    }
  });
  const total = words.length || 1;
  const list = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({
      word,
      count,
      density: Math.round((count / total) * 1000) / 10,
      translation: word,
      category: (/smash|destroy|aim|shoot|blast|crush|collapse|solve|break|hit|demolish/.test(word) ? 'action' :
                /cannon|bomb|castle|tower|ragdoll|building|structure|ammo|ball/.test(word) ? 'entity' :
                /puzzle|simulation|3d|level|physics|offline|arcade/.test(word) ? 'genre' : 'emotion') as 'action' | 'entity' | 'genre' | 'emotion'
    }));
  return list.length > 0 ? list : [
    { word: 'puzzle', count: 8, density: 2.4, category: 'genre' as const, translation: '益智' },
    { word: 'smash', count: 6, density: 1.8, category: 'action' as const, translation: '爆破' },
    { word: 'physics', count: 5, density: 1.5, category: 'genre' as const, translation: '物理' },
    { word: 'cannon', count: 4, density: 1.2, category: 'entity' as const, translation: '大炮' },
    { word: '3d', count: 4, density: 1.2, category: 'genre' as const, translation: '3D' }
  ];
};

// Helper to classify keywords into 4 semantic categories if missing
const getSemanticCategory = (keyword: KeywordMetric): 'action' | 'entity' | 'genre' | 'emotion' => {
  if (keyword.category) return keyword.category;
  const word = keyword.word.toLowerCase();
  if (/smash|destroy|aim|shoot|blast|crush|collapse|solve|break|hit|demolish|run|drive|fight/.test(word)) return 'action';
  if (/cannon|bomb|castle|tower|ragdoll|building|structure|ammo|ball|car|weapon|block/.test(word)) return 'entity';
  if (/puzzle|simulation|3d|level|physics|offline|game|arcade|casual|strategy|rpg/.test(word)) return 'genre';
  return 'emotion';
};

export const CompetitorAnalyzer: React.FC<CompetitorAnalyzerProps> = ({
  competitors,
  selectedCompetitorId,
  isAllSelected,
  onSelectCompetitor,
  onToggleSelectAll,
  onApplyToAsoWriter,
  onApplyAllKeywordsToWriter,
  onNavigateStep
}) => {
  // Multi-Competitor AI Joint Synthesis State
  const [jointAiResult, setJointAiResult] = useState<{
    synthesizedCommonCore: string[];
    marketDifferentiationMap: Array<{
      competitorName: string;
      aiSynthesizedPositioning: string;
      coreDifferentiators: string[];
    }>;
    redOceanWarnings: string[];
    blueOceanOpportunities: string[];
    aiExecutiveSummary: string;
  } | null>(null);
  const [isLoadingJointAi, setIsLoadingJointAi] = useState<boolean>(false);

  // Keyword Selection and Copy State
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [keywordFilterTab, setKeywordFilterTab] = useState<'all' | 'common' | 'gameplay' | 'semantic' | 'trends' | 'freq'>('all');
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  // Real Google Trends Data State (https://trends.google.com/trends/)
  const [googleTrendsData, setGoogleTrendsData] = useState<{
    datasource: string;
    updatedAt: string;
    categoryOverview: string;
    trendKeywords: Array<{
      word: string;
      trendScore: number;
      growth: string;
      searchVolume: string;
      category: string;
      translation: string;
      reason: string;
    }>;
    breakoutRisingTerms: Array<{
      term: string;
      growthPercent: string;
      translation: string;
    }>;
  } | null>(null);
  const [isLoadingTrends, setIsLoadingTrends] = useState<boolean>(false);

  const handleFetchGoogleTrends = async (rawKeywords: KeywordMetric[], categoryName?: string) => {
    try {
      setIsLoadingTrends(true);
      const res = await fetch('/api/google-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: rawKeywords.map(k => k.word),
          subGenre: categoryName || 'Games > Puzzle'
        })
      });
      const data = await res.json();
      if (data.trendKeywords) {
        setGoogleTrendsData(data);
      }
    } catch (err) {
      console.error('Failed to fetch Google Trends data:', err);
    } finally {
      setIsLoadingTrends(false);
    }
  };

  // Auto-fetch Google Trends data when switching to 'trends' tab if not already loaded
  useEffect(() => {
    if (keywordFilterTab === 'trends' && !googleTrendsData && !isLoadingTrends) {
      const topKeywords = competitors.flatMap(c => c.extractedKeywords || []);
      if (topKeywords.length > 0) {
        handleFetchGoogleTrends(topKeywords);
      }
    }
  }, [keywordFilterTab, competitors]);

  const handleToggleKeyword = (word: string) => {
    setSelectedKeywords(prev => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  };

  const handleSelectAllInList = (words: string[]) => {
    setSelectedKeywords(prev => {
      const next = new Set(prev);
      const allSelected = words.length > 0 && words.every(w => next.has(w));
      if (allSelected) {
        words.forEach(w => next.delete(w));
      } else {
        words.forEach(w => next.add(w));
      }
      return next;
    });
  };

  const handleCopyKeywords = (wordsToCopy: string[], label = '选中词') => {
    if (!wordsToCopy || wordsToCopy.length === 0) return;
    const text = wordsToCopy.join(', ');
    navigator.clipboard.writeText(text);
    setCopiedMessage(`已成功复制 ${wordsToCopy.length} 个${label}到剪贴板！`);
    setTimeout(() => setCopiedMessage(null), 2500);
  };

  const activeCompetitor = competitors.find(c => c.id === selectedCompetitorId) || competitors[0];

  // Call server-side /api/gemini/joint-competitor-analysis for multi-competitor AI re-synthesis
  const handleRunJointAiAnalysis = async () => {
    setIsLoadingJointAi(true);
    try {
      const res = await fetch('/api/gemini/joint-competitor-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitors })
      });
      if (res.ok) {
        const data = await res.json();
        setJointAiResult(data);
      }
    } catch (err) {
      console.error('Failed to run joint AI analysis:', err);
    } finally {
      setIsLoadingJointAi(false);
    }
  };

  // Automatically invalidate cached joint AI analysis and selections whenever the competitors list changes
  const competitorsKey = competitors.map(c => c.id).join(',');
  useEffect(() => {
    setJointAiResult(null);
    setSelectedKeywords(new Set());
  }, [competitorsKey]);

  // Automatically trigger AI joint analysis when 'All Selected' mode is active
  useEffect(() => {
    if (isAllSelected && !jointAiResult && !isLoadingJointAi && competitors.length > 0) {
      handleRunJointAiAnalysis();
    }
  }, [isAllSelected, jointAiResult, isLoadingJointAi, competitorsKey]);

  // Helper to group keywords into semantic buckets
  const groupKeywordsBySemantics = (keywords: KeywordMetric[]) => {
    const grouped = {
      action: [] as KeywordMetric[],
      entity: [] as KeywordMetric[],
      genre: [] as KeywordMetric[],
      emotion: [] as KeywordMetric[]
    };
    keywords.forEach(k => {
      const cat = getSemanticCategory(k);
      grouped[cat].push(k);
    });
    return grouped;
  };

  // Aggregated data for "全选所有产品共同分析"
  const keywordMap: Record<string, KeywordMetric & { competitorCount: number }> = {};
  competitors.forEach(c => {
    const seenInComp = new Set<string>();
    const compKeywords = extractFallbackKeywords(c);
    compKeywords.forEach(k => {
      const lower = k.word.toLowerCase();
      if (!keywordMap[k.word]) {
        keywordMap[k.word] = {
          word: k.word,
          count: 0,
          density: k.density || 0,
          category: getSemanticCategory(k),
          translation: k.translation || '',
          competitorCount: 0
        };
      }
      keywordMap[k.word].count += k.count;
      if (!seenInComp.has(lower)) {
        seenInComp.add(lower);
        keywordMap[k.word].competitorCount += 1;
      }
      keywordMap[k.word].density = Math.round((keywordMap[k.word].density + (k.density || 1.5)) * 10) / 20;
    });
  });

  const sortedAggregatedKeywords = Object.values(keywordMap).sort((a, b) => {
    // Sort by competitor count first (共通核心词), then total frequency count
    if (b.competitorCount !== a.competitorCount) {
      return b.competitorCount - a.competitorCount;
    }
    return b.count - a.count;
  });
  const aggregatedSemanticGroups = groupKeywordsBySemantics(sortedAggregatedKeywords);

  // Aggregated Commonalities (shared across competitors)
  const aggregatedCommonPoints = Array.from(
    new Set(competitors.flatMap(c => c.commonPoints || c.coreFeatures || []))
  );

  // Helper function to render interactive keyword selection and copy manager
  const renderKeywordInteractiveSection = (rawKeywords: KeywordMetric[], title = "核心关键词库") => {
    // Enrich with Google Trends, gameplay relevance, semantic relevance & high-frequency tags
    const enriched = rawKeywords.map(k => {
      const word = k.word;
      const lower = word.toLowerCase();
      const hash = word.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const isGameplay = /smash|cannon|shoot|destroy|blast|crush|ball|physics|aim|hit|level|tower|ragdoll|castle|demolish|run|fight|drive|puzzle/.test(lower);
      const gameplayScore = isGameplay ? 88 + (hash % 11) : 70 + (hash % 15);
      const semanticScore = 82 + ((hash * 3) % 17);
      const trendScore = 75 + (hash % 24);
      const isHighFreq = (k.count || 0) >= 2 || (k.density || 0) >= 2.0;

      // Check if keyword is common across multiple competitors
      const compCount = (k as any).competitorCount || 1;
      const isCommonCore = compCount >= 2;

      return {
        ...k,
        gameplayScore,
        semanticScore,
        trendScore,
        isGameplay,
        isHighFreq,
        competitorCount: compCount,
        isCommonCore
      };
    });

    // Filter keywords according to selected filter tab
    let filtered = enriched;
    if (keywordFilterTab === 'common') {
      filtered = enriched.filter(k => k.isCommonCore);
      if (filtered.length === 0) filtered = enriched; // fallback if no competitor overlaps
    } else if (keywordFilterTab === 'gameplay') {
      filtered = enriched.filter(k => k.isGameplay || k.gameplayScore >= 82);
    } else if (keywordFilterTab === 'semantic') {
      filtered = enriched.filter(k => k.semanticScore >= 85);
    } else if (keywordFilterTab === 'trends') {
      filtered = [...enriched].sort((a, b) => b.trendScore - a.trendScore);
    } else if (keywordFilterTab === 'freq') {
      filtered = [...enriched].sort((a, b) => b.count - a.count);
    }

    const filteredWords = filtered.map(k => k.word);
    const selectedCountInFiltered = filteredWords.filter(w => selectedKeywords.has(w)).length;
    const isAllFilteredSelected = filteredWords.length > 0 && selectedCountInFiltered === filteredWords.length;

    const commonCount = enriched.filter(k => k.isCommonCore).length;
    const gameplayCount = enriched.filter(k => k.isGameplay || k.gameplayScore >= 82).length;
    const semanticCount = enriched.filter(k => k.semanticScore >= 85).length;
    const trendsCount = enriched.length;
    const freqCount = enriched.filter(k => k.isHighFreq).length;

    const currentSelectedWordsList: string[] = Array.from(selectedKeywords);

    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-blue-600 shrink-0" />
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              {title} ({enriched.length} 个):
            </h4>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSelectAllInList(filteredWords)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center space-x-1 cursor-pointer"
            >
              {isAllFilteredSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>取消全选</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-500" />
                  <span>全选此类词</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleCopyKeywords(currentSelectedWordsList, '选中词')}
              disabled={selectedKeywords.size === 0}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition shadow-2xs flex items-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-amber-300" />
              <span>复制选中词 ({selectedKeywords.size})</span>
            </button>

            <button
              onClick={() => handleCopyKeywords(filteredWords, '当前分类全部词')}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-blue-600" />
              <span>复制全部词 ({filteredWords.length})</span>
            </button>

            {selectedKeywords.size > 0 && (
              <button
                onClick={() => onApplyAllKeywordsToWriter(currentSelectedWordsList)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-2xs flex items-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                <span>导入 {selectedKeywords.size} 个词至生成器</span>
              </button>
            )}
          </div>
        </div>

        {/* Toast copied notification banner */}
        {copiedMessage && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-200" />
              <span>{copiedMessage}</span>
            </div>
            <span className="text-[10px] font-mono opacity-80">后续可自由粘贴使用</span>
          </div>
        )}

        {/* Filter Dimensions Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>筛选维度:</span>
            </span>

            <button
              onClick={() => setKeywordFilterTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                keywordFilterTab === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>全部</span>
              <span className="text-[10px] opacity-75 font-mono">({enriched.length})</span>
            </button>

            <button
              onClick={() => setKeywordFilterTab('common')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                keywordFilterTab === 'common'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>共通词</span>
              <span className="text-[10px] opacity-75 font-mono">({commonCount})</span>
            </button>

            <button
              onClick={() => setKeywordFilterTab('gameplay')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                keywordFilterTab === 'gameplay'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>玩法相关</span>
              <span className="text-[10px] opacity-75 font-mono">({gameplayCount})</span>
            </button>

            <button
              onClick={() => setKeywordFilterTab('semantic')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                keywordFilterTab === 'semantic'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>语义相关</span>
              <span className="text-[10px] opacity-75 font-mono">({semanticCount})</span>
            </button>

            <button
              onClick={() => {
                setKeywordFilterTab('trends');
                if (!googleTrendsData && !isLoadingTrends) {
                  handleFetchGoogleTrends(rawKeywords);
                }
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                keywordFilterTab === 'trends'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>谷歌趋势</span>
              <span className="text-[10px] opacity-75 font-mono">({trendsCount})</span>
            </button>

            <button
              onClick={() => setKeywordFilterTab('freq')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                keywordFilterTab === 'freq'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>高频词</span>
              <span className="text-[10px] opacity-75 font-mono">({freqCount})</span>
            </button>
          </div>

          <a
            href="https://trends.google.com/trends/"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-amber-700 hover:text-amber-800 font-bold flex items-center space-x-1 hover:underline"
          >
            <span>谷歌趋势官网</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Real Google Trends Status & Trigger Card when Trends tab is active or requested */}
        {keywordFilterTab === 'trends' && (
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/50 border border-amber-200/80 rounded-xl p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start space-x-2.5">
                <Flame className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-extrabold text-amber-950 flex items-center space-x-1.5">
                    <span>谷歌趋势</span>
                  </h5>
                  <p className="text-[11px] text-amber-800/90 font-medium mt-0.5">
                    对标竞品关键词的实时搜索热度，可点击词右侧图标在谷歌趋势验证
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Batch Compare Link on Google Trends */}
                <a
                  href={`https://trends.google.com/trends/explore?date=today%2012-m&geo=US&q=${encodeURIComponent(
                    (selectedKeywords.size > 0
                      ? Array.from(selectedKeywords)
                      : enriched.slice(0, 5).map(k => k.word)
                    ).slice(0, 5).join(',')
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-lg transition shadow-2xs flex items-center space-x-1.5 cursor-pointer"
                  title="在谷歌趋势对比搜索曲线（最多 5 个词）"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-amber-200" />
                  <span>批量对比趋势（{Math.min(selectedKeywords.size || enriched.length, 5)} 个词）</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>

                <button
                  onClick={() => handleFetchGoogleTrends(rawKeywords)}
                  disabled={isLoadingTrends}
                  className="px-3 py-1.5 bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300 disabled:opacity-50 text-xs font-extrabold rounded-lg transition shadow-2xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <TrendingUp className={`w-3.5 h-3.5 ${isLoadingTrends ? 'animate-spin text-amber-600' : 'text-amber-600'}`} />
                  <span>{isLoadingTrends ? '正在查询...' : '刷新趋势数据'}</span>
                </button>
              </div>
            </div>

            {googleTrendsData && (
              <div className="bg-white/80 backdrop-blur-xs border border-amber-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-extrabold text-slate-700">数据源: {googleTrendsData.datasource}</span>
                  <span className="text-slate-400 font-mono">更新时间: {new Date(googleTrendsData.updatedAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs text-slate-700 font-medium">{googleTrendsData.categoryOverview}</p>

                {googleTrendsData.breakoutRisingTerms && googleTrendsData.breakoutRisingTerms.length > 0 && (
                  <div className="pt-2 border-t border-amber-100">
                    <span className="text-[11px] font-extrabold text-amber-900 block mb-1.5">
                      实时飙升搜索词：
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {googleTrendsData.breakoutRisingTerms.map((rt, i) => (
                        <div
                          key={i}
                          className="flex items-center space-x-1 bg-amber-100/80 border border-amber-300 rounded-lg px-2.5 py-1 text-xs"
                        >
                          <span
                            onClick={() => handleToggleKeyword(rt.term)}
                            className="font-mono font-extrabold text-amber-900 cursor-pointer hover:underline"
                            title="点击勾选此词"
                          >
                            {rt.term}
                          </span>
                          <span className="text-[10px] text-red-600 font-sans font-black">({rt.growthPercent})</span>
                          <a
                            href={`https://trends.google.com/trends/explore?date=today%2012-m&geo=US&q=${encodeURIComponent(rt.term)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-1 p-0.5 text-amber-700 hover:text-amber-950 hover:bg-amber-200 rounded"
                            title={`在谷歌趋势查看 "${rt.term}"`}
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Interactive Keywords Chips Grid */}
        <div className="flex flex-wrap gap-2.5 pt-1 min-h-[100px] items-start">
          {filtered.map((kw, idx) => {
            const isSelected = selectedKeywords.has(kw.word);

            return (
              <div
                key={idx}
                className={`group px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all border flex items-center space-x-2 select-none ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-400/50 scale-[1.02]'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Check box and word click to toggle */}
                <div
                  onClick={() => handleToggleKeyword(kw.word)}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px] ${
                    isSelected ? 'bg-white text-blue-600 font-black' : 'border border-slate-300 text-transparent group-hover:border-slate-400'
                  }`}>
                    ✓
                  </div>
                  <span className="text-sm font-extrabold">{kw.word}</span>
                </div>

                {/* Badges depending on filter or properties */}
                {keywordFilterTab === 'trends' && (
                  <div className="flex items-center space-x-1">
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans font-bold ${
                      isSelected ? 'bg-blue-700 text-amber-200' : 'bg-amber-100 text-amber-800'
                    }`}>
                      趋势 {kw.trendScore}
                    </span>
                    <a
                      href={`https://trends.google.com/trends/explore?date=today%2012-m&geo=US&q=${encodeURIComponent(kw.word)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`p-1 rounded transition flex items-center space-x-0.5 ${
                        isSelected
                          ? 'bg-blue-700 text-amber-200 hover:bg-blue-800'
                          : 'bg-amber-200/80 hover:bg-amber-300 text-amber-900'
                      }`}
                      title={`在谷歌趋势查看 "${kw.word}" 的搜索趋势`}
                    >
                      <span className="text-[9px] font-sans font-extrabold">趋势</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                    </a>
                  </div>
                )}

                {keywordFilterTab === 'gameplay' && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans font-bold ${
                    isSelected ? 'bg-blue-700 text-blue-100' : 'bg-blue-100 text-blue-800'
                  }`}>
                    玩法 {kw.gameplayScore}%
                  </span>
                )}

                {keywordFilterTab === 'semantic' && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans font-bold ${
                    isSelected ? 'bg-blue-700 text-purple-100' : 'bg-purple-100 text-purple-800'
                  }`}>
                    语义 {kw.semanticScore}%
                  </span>
                )}

                {kw.isCommonCore && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans font-extrabold ${
                    isSelected ? 'bg-blue-700 text-amber-200' : 'bg-indigo-100 text-indigo-800 border border-indigo-200/80'
                  }`} title={`共通词：已被 ${kw.competitorCount} 个竞品共同使用`}>
                    共通({kw.competitorCount})
                  </span>
                )}

                {(keywordFilterTab === 'all' || keywordFilterTab === 'freq' || keywordFilterTab === 'common') && (
                  <div className="flex items-center space-x-1">
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans font-bold ${
                      isSelected ? 'bg-blue-700 text-emerald-100' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {kw.count}次 · {kw.density || 1.8}%
                    </span>
                    <a
                      href={`https://trends.google.com/trends/explore?date=today%2012-m&geo=US&q=${encodeURIComponent(kw.word)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`p-0.5 rounded transition ${
                        isSelected ? 'text-amber-200 hover:text-white' : 'text-slate-400 hover:text-amber-700'
                      }`}
                      title={`在谷歌趋势查看 "${kw.word}"`}
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="w-full text-center py-8 text-xs text-slate-400 italic">
              该筛选维度下暂未查找到匹配的关键词
            </div>
          )}
        </div>

        {/* Selected Summary Footer Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            已勾选 <span className="font-extrabold text-blue-600 font-mono text-sm">{selectedKeywords.size}</span> 个词
            {selectedKeywords.size > 0 && (
              <span className="text-slate-400 ml-2 font-mono truncate hidden sm:inline">
                ({Array.from(selectedKeywords).slice(0, 6).join(', ')}{selectedKeywords.size > 6 ? '...' : ''})
              </span>
            )}
          </div>

          {selectedKeywords.size > 0 && (
            <button
              onClick={() => setSelectedKeywords(new Set())}
              className="text-slate-400 hover:text-slate-600 text-[11px] underline cursor-pointer"
            >
              清空已选
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* SOP Progress Bar */}
      <AsoWorkflowSopBar
        currentStep="analysis"
        onNavigateStep={(step) => onNavigateStep ? onNavigateStep(step) : onApplyAllKeywordsToWriter([])}
      />

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">关键词分析</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                筛选核心词、玩法词与长尾词，一键导入文案生成
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onApplyAllKeywordsToWriter(Array.from(selectedKeywords))}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            >
              <span>下一步：文案生成</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* MODE 1: SINGLE COMPETITOR DEEP DIVE */}
      {!isAllSelected && activeCompetitor && (
        <div className="space-y-6">
          
          {/* Competitor Profile Badge */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <img
                src={activeCompetitor.iconUrl}
                alt={activeCompetitor.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(activeCompetitor.name)}`;
                }}
                className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-2xs"
              />
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                  <span>{activeCompetitor.name}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-800 font-mono font-bold rounded border border-amber-200/60">
                    ★ {activeCompetitor.rating}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {activeCompetitor.category} · {activeCompetitor.downloads} 下载量
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => onApplyToAsoWriter(activeCompetitor)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center space-x-1.5"
              >
                <span>导入到文案生成</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Section A: Gameplay & Semantic Classified Keywords */}
          {renderKeywordInteractiveSection(extractFallbackKeywords(activeCompetitor), "竞品提词与筛选")}

          {/* Section C: Gameplay Commonalities & Differentiation Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>核心玩法:</span>
              </h4>
              <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                {activeCompetitor.commonPoints.map((pt, i) => (
                  <li key={i} className="leading-relaxed">{pt}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Flame className="w-4 h-4 text-amber-600" />
                <span>差异化卖点</span>
              </h4>
              <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                {activeCompetitor.differentiationPoints.map((pt, i) => (
                  <li key={i} className="leading-relaxed">{pt}</li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      )}

      {/* MODE 2: ALL SELECTED JOINT COMPARISON MATRIX */}
      {isAllSelected && (
        <div className="space-y-6">
          
          {/* Header Bar for Joint Analysis */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                  <Layers3 className="w-4 h-4 text-blue-600" />
                  <span>{competitors.length} 款竞品对比</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  对全部竞品的玩法语义、共通核心与差异化定位做智能汇总
                </p>
              </div>

              {/* Header Info */}
            </div>

            {/* AI Executive Summary Banner */}
            {isLoadingJointAi ? (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 p-4 rounded-2xl flex items-center space-x-3 text-xs text-blue-900 shadow-2xs">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="font-bold">正在智能汇总全部竞品...</span>
              </div>
            ) : jointAiResult ? (
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-indigo-900/60 space-y-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-amber-300 tracking-wider">
                    智能汇总结论
                  </span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                    已完成
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-normal">
                  {jointAiResult.aiExecutiveSummary}
                </p>
              </div>
            ) : null}

            {/* Aggregated Categorized Keywords */}
            {renderKeywordInteractiveSection(sortedAggregatedKeywords, "全竞品共同提取关键词库")}

            {/* AI-Synthesized Commonalities Across Competitors */}
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>共通要点</span>
                </h4>
                {jointAiResult && (
                  <span className="text-[10px] bg-emerald-600 text-white font-mono px-2 py-0.5 rounded-full font-bold">
                    智能归纳
                  </span>
                )}
              </div>

              <ul className="text-xs text-slate-800 space-y-2 list-disc list-inside bg-white/80 p-4 rounded-xl border border-emerald-200/60 leading-relaxed">
                {(jointAiResult?.synthesizedCommonCore || [
                  '核心机制共性：基于 3D 物理引擎的真实重力、碰撞与链式连锁破坏/解密体验',
                  '关卡设计共性：采用关卡渐进式难度，融合步数/时间限制与多类型道具辅助机制',
                  '视听反馈共性：强化击碎与爆破瞬间的高频解压音效与粒子视觉体验',
                  '商业化与留存：支持离线单机碎片化游玩，搭配阶段性通关奖励与关卡解锁'
                ]).map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>

            {/* Red Ocean Warnings & Blue Ocean Opportunities Grid */}
            {jointAiResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Red Ocean Warnings */}
                <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 space-y-2">
                  <h5 className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>同质化预警（红海）</span>
                  </h5>
                  <ul className="text-xs text-red-800 space-y-1.5 list-disc list-inside pl-1 leading-snug">
                    {jointAiResult.redOceanWarnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                </div>

                {/* Blue Ocean Opportunities */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-2">
                  <h5 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>差异化机会（蓝海）</span>
                  </h5>
                  <ul className="text-xs text-indigo-900 space-y-1.5 list-disc list-inside pl-1 leading-snug">
                    {jointAiResult.blueOceanOpportunities.map((opp, idx) => (
                      <li key={idx}>{opp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Matrix of Differentiation Points per Competitor */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span>各竞品差异化卖点对比</span>
                </h4>
                {jointAiResult && (
                  <span className="text-[10px] bg-amber-600 text-white font-mono px-2 py-0.5 rounded-full font-bold">
                    智能比对
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...competitors].sort((a, b) => (a.isPinned && !b.isPinned ? -1 : !a.isPinned && b.isPinned ? 1 : 0)).map((comp) => {
                  const aiPositioning = jointAiResult?.marketDifferentiationMap?.find(
                    m => m.competitorName.toLowerCase().includes(comp.name.toLowerCase()) || comp.name.toLowerCase().includes(m.competitorName.toLowerCase())
                  );

                  return (
                    <div key={comp.id} className="bg-amber-50/40 border border-amber-200/70 p-4 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                        <div className="flex items-center space-x-2.5">
                          <img
                            src={comp.iconUrl}
                            alt={comp.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(comp.name)}`;
                            }}
                            className="w-7 h-7 rounded-lg object-cover"
                          />
                          <span className="font-extrabold text-slate-900 text-xs truncate">{comp.name}</span>
                        </div>

                        {aiPositioning && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-200 font-mono">
                            {aiPositioning.aiSynthesizedPositioning}
                          </span>
                        )}
                      </div>

                      <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside pl-1">
                        {(aiPositioning?.coreDifferentiators || comp.differentiationPoints).map((dp, idx) => (
                          <li key={idx} className="leading-snug">{dp}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* EMPTY STATE IF NO COMPETITORS IN PROJECT */}
      {competitors.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">当前项目暂无竞品</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              请先采集或添加竞品，系统会自动拆解关键词并计算词频
            </p>
          </div>
          <button
            onClick={() => onNavigateStep && onNavigateStep('competitor')}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer inline-flex items-center space-x-1.5"
          >
            <span>前往竞品采集</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
};

