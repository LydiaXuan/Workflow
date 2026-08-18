import React, { useState } from 'react';
import { 
  Download, 
  Copy, 
  ExternalLink, 
  Check, 
  Maximize2, 
  RefreshCw, 
  Image as ImageIcon,
  Sliders,
  Zap,
  Clock,
  History,
  AlertCircle,
  ChevronDown,
  Filter,
  Calendar,
  Sparkles,
  Tag,
  ArrowUpRight,
  Pin,
  ArrowRight,
  Eye,
  Smartphone,
  Layers,
  FileText,
  Plus,
  Trash2
} from 'lucide-react';
import { CompetitorInfo } from '../types';

interface AssetScraperProps {
  competitors: CompetitorInfo[];
  selectedCompetitorId: string;
  isAllSelected?: boolean;
  onSelectCompetitor: (competitorId: string) => void;
  onUpdateCompetitorData?: (compId: string, updatedData: { iconUrl?: string; name?: string; title?: string; developer?: string }) => void;
}

export interface EventAsset {
  id: string;
  eventId?: string;
  title: string;
  imageUrl: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'upcoming' | 'ended';
  eventUrl?: string;
}

interface ScrapedAssetData {
  title: string;
  developer: string;
  category: string;
  rating: string;
  downloads: string;
  iconUrl: string;
  featureGraphicUrl: string;
  screenshots: string[];
  promoVideoUrl: string;
  events?: EventAsset[];
}

interface AssetChangeLog {
  id: string;
  timestamp: string;
  compId: string;
  compName: string;
  competitorId?: string;
  competitorName?: string;
  assetType: 'Icon' | '置顶宣发图' | '应用截图';
  slotName?: string;
  oldUrl: string;
  newUrl: string;
  isSequenceChange?: boolean;
  oldIndex?: number;
  newIndex?: number;
  isRead?: boolean;
}

// Helper function to deduplicate screenshot URLs and extract unique device cluster sets
const deduplicateUrls = (urls: string[] = []): string[] => {
  if (!Array.isArray(urls)) return [];
  const seen = new Set<string>();
  const baseList: string[] = [];
  for (const url of urls) {
    if (!url || typeof url !== 'string') continue;
    const baseId = url.split('=')[0].trim();
    if (baseId && !seen.has(baseId)) {
      seen.add(baseId);
      baseList.push(url);
    }
  }

  const total = baseList.length;
  if (total <= 8) {
    return baseList;
  }

  // Detect Google Play multi-device duplicate clusters (e.g. Phone + 7" Tablet + 10" Tablet)
  for (const div of [3, 2, 4]) {
    if (total % div === 0) {
      const len = total / div;
      if (len >= 5 && len <= 8) {
        return baseList.slice(0, len);
      }
    }
  }
  for (const div of [3, 2, 4]) {
    if (total % div === 0) {
      const len = total / div;
      if (len >= 4 && len <= 8) {
        return baseList.slice(0, len);
      }
    }
  }

  return baseList.slice(0, 8);
};

// Preset default high-quality creative assets for standard competitors
export const computeEventStatus = (ev: EventAsset): 'active' | 'upcoming' | 'ended' => {
  const today = new Date().toISOString().split('T')[0];
  if (ev.endDate && ev.endDate < today) return 'ended';
  if (ev.startDate && ev.startDate > today) return 'upcoming';
  return 'active';
};

const getInitialPresetAsset = (comp: CompetitorInfo, _index: number): ScrapedAssetData => {
  let devName = (comp.developer && comp.developer !== 'Google Play 开发者') ? comp.developer : '';
  if (!devName && comp.packageName) {
    const parts = comp.packageName.split('.');
    if (parts.length >= 2 && parts[1] && !['android','app','game','store'].includes(parts[1])) {
      devName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    }
  }
  if (!devName) {
    devName = comp.name ? comp.name : 'Google Play 开发者';
  }

  return {
    title: comp.title || comp.name,
    developer: devName,
    category: comp.category || 'Games > Puzzle',
    rating: comp.rating ? String(comp.rating) : '4.5',
    downloads: comp.downloads || '10,000,000+',
    iconUrl: comp.iconUrl || '',
    featureGraphicUrl: comp.featureGraphicUrl || '',
    screenshots: (comp.screenshots && comp.screenshots.length > 0) ? deduplicateUrls(comp.screenshots) : [],
    promoVideoUrl: comp.promoVideoUrl || '',
    events: (comp.events && Array.isArray(comp.events)) ? comp.events : []
  };
};

const STORAGE_KEY_SCRAPED_MAP = 'asox_scraped_assets_v6';
const STORAGE_KEY_CHANGELOGS = 'asox_asset_changelogs_v6';

export const AssetScraper: React.FC<AssetScraperProps> = ({
  competitors,
  selectedCompetitorId,
  isAllSelected = false,
  onUpdateCompetitorData,
}) => {
  // Scraped Asset Map state with localStorage persistence
  const [scrapedMap, setScrapedMap] = useState<Record<string, ScrapedAssetData>>(() => {
    const initialMap: Record<string, ScrapedAssetData> = {};
    competitors.forEach((c, idx) => {
      initialMap[c.id] = getInitialPresetAsset(c, idx);
    });

    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCRAPED_MAP);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...initialMap, ...parsed };
        }
      }
    } catch (e) {
      console.error('Failed to load saved scraped assets from localStorage', e);
    }
    return initialMap;
  });

  // Sync scrapedMap whenever competitors array updates
  React.useEffect(() => {
    setScrapedMap(prevMap => {
      const updatedMap = { ...prevMap };
      let hasChanges = false;
      competitors.forEach((c, idx) => {
        if (!updatedMap[c.id]) {
          updatedMap[c.id] = getInitialPresetAsset(c, idx);
          hasChanges = true;
        } else {
          // If competitor object now has real featureGraphicUrl or screenshots from backend scrape, update it!
          if (c.featureGraphicUrl && updatedMap[c.id].featureGraphicUrl !== c.featureGraphicUrl) {
            updatedMap[c.id] = { ...updatedMap[c.id], featureGraphicUrl: c.featureGraphicUrl };
            hasChanges = true;
          }
          if (c.screenshots && c.screenshots.length > 0 && JSON.stringify(updatedMap[c.id].screenshots) !== JSON.stringify(c.screenshots)) {
            updatedMap[c.id] = { ...updatedMap[c.id], screenshots: c.screenshots };
            hasChanges = true;
          }
          if (c.developer && c.developer !== 'Google Play 开发者' && updatedMap[c.id].developer !== c.developer) {
            updatedMap[c.id] = { ...updatedMap[c.id], developer: c.developer };
            hasChanges = true;
          }
          if (c.title && updatedMap[c.id].title !== c.title) {
            updatedMap[c.id] = { ...updatedMap[c.id], title: c.title };
            hasChanges = true;
          }
        }
      });
      return hasChanges ? updatedMap : prevMap;
    });
  }, [competitors]);

  // Persist scrapedMap to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SCRAPED_MAP, JSON.stringify(scrapedMap));
    } catch (e) {
      console.error('Failed to save scraped map to localStorage', e);
    }
  }, [scrapedMap]);

  // Helper for preset initial change logs
  const getInitialPresetChangeLogs = (_comps: CompetitorInfo[]): AssetChangeLog[] => {
    return [];
  };

  // Asset Change Logs state with localStorage persistence - defaults to empty baseline
  const [changeLogs, setChangeLogs] = useState<AssetChangeLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHANGELOGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(item => ({
            ...item,
            compId: item.compId || item.competitorId || 'comp-1',
            compName: item.compName || item.competitorName || '竞品',
            competitorId: item.competitorId || item.compId || 'comp-1',
            competitorName: item.competitorName || item.compName || '竞品',
            isRead: true
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load saved change logs from localStorage', e);
    }
    return [];
  });

  // Ensure current project's competitors sync cleanly
  React.useEffect(() => {
    // Kept clean without auto-injecting mock logs
  }, [competitors]);

  // Persist changeLogs to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CHANGELOGS, JSON.stringify(changeLogs));
    } catch (e) {
      console.error('Failed to save change logs to localStorage', e);
    }
  }, [changeLogs]);

  // Loading & error states
  const [batchLoading, setBatchLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fetchNotice, setFetchNotice] = useState<string | null>(null);

  // View Tabs & Filters
  const [activeTab, setActiveTab] = useState<'all' | 'icons' | 'banners' | 'screenshots' | 'events' | 'diffs'>('all');

  // Compute unread badge counter for "素材新变更对比"
  const unreadCount = changeLogs.filter(log => !log.isRead).length;

  // Handle tab navigation & automatically clear unread badge when entering diffs
  const handleTabChange = (tab: 'all' | 'icons' | 'banners' | 'screenshots' | 'events' | 'diffs') => {
    setActiveTab(tab);
    if (tab === 'diffs') {
      setChangeLogs(prev => prev.map(log => ({ ...log, isRead: true })));
    }
  };

  // Sync clear badge when activeTab is diffs
  React.useEffect(() => {
    if (activeTab === 'diffs') {
      setChangeLogs(prev => {
        if (prev.some(l => !l.isRead)) {
          return prev.map(l => ({ ...l, isRead: true }));
        }
        return prev;
      });
    }
  }, [activeTab]);
  const [activeBannerCompId, setActiveBannerCompId] = useState<string>('all');
  const [activeScreenshotCompId, setActiveScreenshotCompId] = useState<string>('all');
  const [activeEventCompId, setActiveEventCompId] = useState<string>('all');
  const [eventStatusFilter, setEventStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'ended'>('all');
  const [diffFilterType, setDiffFilterType] = useState<'all' | 'Icon' | '置顶宣发图' | '应用截图'>('all');
  const [diffFilterCompId, setDiffFilterCompId] = useState<string>('all');
  const [previewImageUrl, setPreviewImageUrl] = useState<{ url: string; title: string; type: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Fetch asset for a single competitor
  const fetchSingleAsset = async (comp: CompetitorInfo) => {
    const target = comp.url || comp.packageName || comp.name;
    const res = await fetch('/api/gemini/scrape-assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: target.startsWith('http') ? target : undefined,
        packageName: !target.startsWith('http') ? target : undefined,
        developer: comp.developer
      })
    });
    if (!res.ok) {
      throw new Error(`竞品 ${comp.name} 素材拉取失败`);
    }
    const data: ScrapedAssetData = await res.json();
    if (data.screenshots) {
      data.screenshots = deduplicateUrls(data.screenshots);
    }
    if (!data.developer || data.developer === 'Puzzle Fun Studio' || data.developer === 'Top Casual Studio') {
      if (comp.developer) {
        data.developer = comp.developer;
      }
    }
    return { id: comp.id, name: comp.name, data };
  };

  // Delete single change log
  const handleDeleteChangeLog = (logId: string) => {
    setChangeLogs(prev => prev.filter(item => item.id !== logId));
  };

  // Clear all change logs
  const handleClearAllChangeLogs = () => {
    setChangeLogs([]);
    setFetchNotice('已清空素材变动记录');
    setTimeout(() => setFetchNotice(null), 3000);
  };

  // Helper to validate if URL is a real game asset (and not a rating badge or placeholder)
  const isValidAssetUrl = (url?: string): boolean => {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;
    const lower = url.toLowerCase();
    if (
      lower.includes('esrb') ||
      lower.includes('pegi') ||
      lower.includes('rating') ||
      lower.includes('usk') ||
      lower.includes('everyone') ||
      lower.includes('mature')
    ) {
      return false;
    }
    return true;
  };

  // Batch Refresh All Competitors & Track Visual Diffs
  const handleBatchFetchAll = async () => {
    const compsToFetch = activeCompetitors;
    if (compsToFetch.length === 0) {
      setErrorMsg('项目库中暂无可拉取的竞品。');
      return;
    }

    setBatchLoading(true);
    setErrorMsg(null);
    setFetchNotice(null);

    try {
      const promises = compsToFetch.map(c => fetchSingleAsset(c));
      const results = await Promise.allSettled(promises);

      const newMap = { ...scrapedMap };
      const detectedChanges: AssetChangeLog[] = [];
      const nowObj = new Date();
      const timeStr = `${nowObj.getFullYear()}-${String(nowObj.getMonth() + 1).padStart(2, '0')}-${String(nowObj.getDate()).padStart(2, '0')} ${String(nowObj.getHours()).padStart(2, '0')}:${String(nowObj.getMinutes()).padStart(2, '0')}`;

      results.forEach((res, idx) => {
        const comp = compsToFetch[idx];
        if (res.status === 'fulfilled') {
          const oldAsset = scrapedMap[comp.id];
          const newAsset = res.value.data;

          const compTitle = comp.title || comp.name;

          // Check for Icon changes (only if both old & new are valid game assets)
          if (
            oldAsset &&
            isValidAssetUrl(oldAsset.iconUrl) &&
            isValidAssetUrl(newAsset.iconUrl) &&
            oldAsset.iconUrl !== newAsset.iconUrl
          ) {
            detectedChanges.push({
              id: `${comp.id}-icon-${Date.now()}-${Math.random()}`,
              timestamp: timeStr,
              compId: comp.id,
              compName: compTitle,
              competitorId: comp.id,
              competitorName: comp.name,
              assetType: 'Icon',
              oldUrl: oldAsset.iconUrl,
              newUrl: newAsset.iconUrl,
              isSequenceChange: false,
              isRead: false
            });
          }

          // Check for Feature Graphic changes (only if both old & new are valid game assets)
          if (
            oldAsset &&
            isValidAssetUrl(oldAsset.featureGraphicUrl) &&
            isValidAssetUrl(newAsset.featureGraphicUrl) &&
            oldAsset.featureGraphicUrl !== newAsset.featureGraphicUrl
          ) {
            detectedChanges.push({
              id: `${comp.id}-banner-${Date.now()}-${Math.random()}`,
              timestamp: timeStr,
              compId: comp.id,
              compName: compTitle,
              competitorId: comp.id,
              competitorName: comp.name,
              assetType: '置顶宣发图',
              oldUrl: oldAsset.featureGraphicUrl,
              newUrl: newAsset.featureGraphicUrl,
              isSequenceChange: false,
              isRead: false
            });
          }

          // Check for Screenshot changes (content & sequence changes)
          const maxScreenshots = Math.max(oldAsset?.screenshots?.length || 0, newAsset?.screenshots?.length || 0);
          for (let i = 0; i < maxScreenshots; i++) {
            const oldSc = oldAsset?.screenshots?.[i];
            const newSc = newAsset?.screenshots?.[i];
            if (
              isValidAssetUrl(oldSc) &&
              isValidAssetUrl(newSc) &&
              oldSc !== newSc
            ) {
              const oldIdxInOld = oldAsset?.screenshots?.indexOf(newSc!);
              const isSeqChange = oldIdxInOld !== undefined && oldIdxInOld !== -1;

              detectedChanges.push({
                id: `${comp.id}-sc-${i}-${Date.now()}`,
                timestamp: timeStr,
                compId: comp.id,
                compName: compTitle,
                competitorId: comp.id,
                competitorName: comp.name,
                assetType: '应用截图',
                slotName: `图 #${i + 1}`,
                oldUrl: oldSc!,
                newUrl: newSc!,
                isSequenceChange: isSeqChange,
                oldIndex: isSeqChange ? (oldIdxInOld + 1) : undefined,
                newIndex: isSeqChange ? (i + 1) : undefined,
                isRead: false
              });
            }
          }

          // Preserve past and expired events in archive while updating new events
          const oldEvents = oldAsset?.events || [];
          const newEvents = newAsset?.events || [];
          const mergedEventsMap = new Map<string, EventAsset>();

          oldEvents.forEach(ev => {
            const key = ev.eventId || ev.id || ev.imageUrl;
            mergedEventsMap.set(key, { ...ev, status: computeEventStatus(ev) });
          });

          newEvents.forEach(ev => {
            const key = ev.eventId || ev.id || ev.imageUrl;
            mergedEventsMap.set(key, { ...ev, status: computeEventStatus(ev) });
          });

          newAsset.events = Array.from(mergedEventsMap.values());

          newMap[comp.id] = newAsset;
          if (onUpdateCompetitorData) {
            onUpdateCompetitorData(comp.id, {
              iconUrl: newAsset.iconUrl,
              title: newAsset.title || comp.name,
              name: newAsset.title || comp.name,
              developer: newAsset.developer
            });
          }
        } else {
          console.warn(`Fetch failed for ${comp.name}:`, res.reason);
        }
      });

      setScrapedMap(newMap);

      if (detectedChanges.length > 0) {
        setChangeLogs(prev => [...detectedChanges, ...prev]);
        setFetchNotice(`已重新拉取 ${compsToFetch.length} 款竞品，检测到 ${detectedChanges.length} 处变更。`);
      } else {
        setFetchNotice(`已重新拉取 ${compsToFetch.length} 款竞品，素材均为最新，无变更。`);
      }
    } catch (err: any) {
      console.error('Batch fetch failed:', err);
      setErrorMsg('部分竞品素材拉取受阻，已保留默认高清资源。');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Enhanced image copy helper: copies actual image blob to clipboard if supported, fallback to URL
  const handleCopyImage = async (url: string, idKey: string) => {
    const key = `img-${idKey}`;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const loadPromise = new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      img.src = url;
      await loadPromise;

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
      }

      canvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard && window.ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            setCopiedUrl(key);
            setTimeout(() => setCopiedUrl(null), 2500);
            return;
          } catch (clipErr) {
            console.warn('ClipboardItem write error:', clipErr);
          }
        }
        await navigator.clipboard.writeText(url);
        setCopiedUrl(`url-${idKey}`);
        setTimeout(() => setCopiedUrl(null), 2500);
      }, 'image/png');
    } catch (e) {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedUrl(`url-${idKey}`);
        setTimeout(() => setCopiedUrl(null), 2500);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  // Direct download image helper
  const handleDownloadImage = async (url: string, filename: string = 'playstore-asset.png') => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Helper for Google Play Store URL
  const getStoreUrl = (comp: CompetitorInfo) => {
    if (comp.url && comp.url.startsWith('http')) return comp.url;
    const pkg = comp.packageName || comp.id;
    return `https://play.google.com/store/apps/details?id=${pkg}&hl=en&gl=us`;
  };

  // Filter active competitors based on top bar competitor selection and sort pinned items first
  const rawActiveCompetitors = (selectedCompetitorId && selectedCompetitorId !== 'all' && !isAllSelected)
    ? competitors.filter(c => c.id === selectedCompetitorId)
    : competitors;

  const activeCompetitors = [...rawActiveCompetitors].sort((a, b) => 
    (a.isPinned && !b.isPinned ? -1 : !a.isPinned && b.isPinned ? 1 : 0)
  );

  // Collect all events across active competitors with dynamic status
  const allEventsForFilterCounts = activeCompetitors
    .filter(c => activeEventCompId === 'all' || activeEventCompId === c.id)
    .flatMap(comp => {
      const data = scrapedMap[comp.id];
      const evs = data?.events || [];
      return evs.map(ev => ({
        ...ev,
        status: computeEventStatus(ev),
        compId: comp.id,
        compName: comp.title || comp.name,
        compIconUrl: data?.iconUrl || comp.iconUrl
      }));
    });

  const totalEventsCount = allEventsForFilterCounts.length;
  const activeEventsCount = allEventsForFilterCounts.filter(e => e.status === 'active').length;
  const upcomingEventsCount = allEventsForFilterCounts.filter(e => e.status === 'upcoming').length;
  const endedEventsCount = allEventsForFilterCounts.filter(e => e.status === 'ended').length;

  const allEventsWithComp = allEventsForFilterCounts
    .filter(ev => {
      if (eventStatusFilter === 'all') return true;
      return ev.status === eventStatusFilter;
    })
    .sort((a, b) => {
      // Sort active first, then upcoming, then ended; within same status, sort by startDate descending
      const order = { active: 1, upcoming: 2, ended: 3 };
      const diff = (order[a.status] || 2) - (order[b.status] || 2);
      if (diff !== 0) return diff;
      return (b.startDate || '').localeCompare(a.startDate || '');
    });

  return (
    <div className="space-y-6 pb-12">

      {/* Bubble Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Bubble 1: Dropdown View Selector Bubble */}
          <div className="relative inline-flex items-center">
            <Filter className="w-3.5 h-3.5 text-blue-600 absolute left-3.5 pointer-events-none" />
            <select
              value={activeTab}
              onChange={(e) => handleTabChange(e.target.value as any)}
              className="pl-9 pr-9 py-2 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 text-blue-900 text-xs font-black rounded-full shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition appearance-none"
            >
              <option value="all">全部素材</option>
              <option value="icons">图标</option>
              <option value="banners">置顶大图</option>
              <option value="screenshots">宣传截图</option>
              <option value="events">活动图</option>
              <option value="diffs">素材变更</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-blue-600 absolute right-3 pointer-events-none" />
          </div>

          {/* Bubble 2: One-click Re-fetch Action Button */}
          <button
            onClick={handleBatchFetchAll}
            disabled={batchLoading}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded-full shadow-2xs hover:shadow transition flex items-center space-x-1.5 cursor-pointer shrink-0"
          >
            {batchLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                <span>正在拉取 ({activeCompetitors.length})...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-slate-950 fill-current" />
                <span>一键重新拉取 ({activeCompetitors.length})</span>
              </>
            )}
          </button>

          {/* Bubble 3: Asset Change Comparison Button (directly right of '一键重新拉取') */}
          <button
            onClick={() => handleTabChange('diffs')}
            className={`px-4 py-2 border text-xs font-black rounded-full transition flex items-center space-x-1.5 cursor-pointer shrink-0 ${
              activeTab === 'diffs'
                ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-2xs'
                : 'bg-amber-50/80 hover:bg-amber-100/80 border-amber-200 text-amber-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-600" />
            <span>素材变更</span>
            {unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-red-600 text-white text-[10px] rounded-full font-black">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {fetchNotice && (
        <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{fetchNotice}</span>
          </div>
          <button
            onClick={() => handleTabChange('diffs')}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-bold rounded-lg transition shrink-0 cursor-pointer"
          >
            查看变更明细 →
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SECTION 1: Icon 展示 */}
      {(activeTab === 'all' || activeTab === 'icons') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">应用图标</h3>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">({activeCompetitors.length} 个竞品)</span>
          </div>

          {/* Single Horizontal Scrollable Row for Icons so ALL competitors stay in ONE row */}
          <div className="flex items-stretch space-x-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-300 snap-x">
            {activeCompetitors.map(comp => {
              const data = scrapedMap[comp.id];
              if (!data) return null;

              return (
                <div key={comp.id} className={`shrink-0 w-36 sm:w-40 md:w-44 bg-slate-50 border rounded-2xl p-3 space-y-2 text-center group relative hover:border-blue-300 transition shadow-2xs snap-start flex flex-col justify-between ${comp.isPinned ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200/80'}`}>
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-white shadow-2xs border border-slate-100 flex items-center justify-center">
                    {data.iconUrl ? (
                      <>
                        <img src={data.iconUrl} alt={comp.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        <button
                          onClick={() => setPreviewImageUrl({ url: data.iconUrl, title: `${comp.name} - Icon`, type: 'icon' })}
                          className="absolute top-1.5 left-1.5 p-1 bg-slate-900/70 hover:bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center p-2 text-slate-400">
                        <ImageIcon className="w-6 h-6 text-slate-300 mb-1" />
                        <span className="text-[10px] font-bold">暂无图标</span>
                      </div>
                    )}
                    {comp.isPinned && (
                      <span className="absolute top-1.5 right-1.5 p-1 bg-amber-500 text-slate-950 rounded-md shadow-xs z-10" title="已固定置顶">
                        <Pin className="w-3 h-3 fill-current" />
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-xs text-slate-900 truncate" title={data.title || comp.title || comp.name}>
                      {data.title || comp.title || comp.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate">{data.developer}</p>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-200/60">
                    <button
                      disabled={!data.iconUrl}
                      onClick={() => data.iconUrl && handleCopyImage(data.iconUrl, `${comp.id}-icon`)}
                      className={`flex-1 py-1 px-1.5 text-[10px] font-bold rounded-lg transition flex items-center justify-center space-x-1 shrink-0 ${
                        data.iconUrl
                          ? 'bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 cursor-pointer'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                      }`}
                      title={data.iconUrl ? "直接复制图片到剪贴板，可 Ctrl+V 粘贴" : "无有效图片"}
                    >
                      {copiedUrl === `img-${comp.id}-icon` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="text-emerald-700 font-extrabold">已复制图片</span>
                        </>
                      ) : copiedUrl === `url-${comp.id}-icon` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="text-emerald-700">已复制链接</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-blue-600 shrink-0" />
                          <span>复制图片</span>
                        </>
                      )}
                    </button>
                    <button
                      disabled={!data.iconUrl}
                      onClick={() => data.iconUrl && handleDownloadImage(data.iconUrl, `${comp.name}-icon.png`)}
                      className={`py-1 px-2 text-[10px] font-bold rounded-lg transition flex items-center justify-center space-x-1 shrink-0 ${
                        data.iconUrl
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                      }`}
                      title={data.iconUrl ? "下载图标到本地" : "无有效图片"}
                    >
                      <Download className="w-3 h-3 text-slate-600" />
                      <span>下载</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: 置顶大图 */}
      {(activeTab === 'all' || activeTab === 'banners') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">置顶大图</h3>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">({activeCompetitors.length} 张宣发图)</span>
          </div>

          {/* Single Compact Horizontal Scroll Row for 置顶大图 */}
          <div className="flex items-stretch space-x-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-300 snap-x">
            {activeCompetitors.map(comp => {
              const data = scrapedMap[comp.id];
              if (!data) return null;

              return (
                <div
                  key={comp.id}
                  className={`relative shrink-0 w-72 md:w-80 bg-slate-50 border rounded-2xl p-3 space-y-2.5 group hover:border-amber-400 hover:shadow-md transition shadow-2xs snap-start flex flex-col justify-between ${comp.isPinned ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200/80'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      {data.iconUrl ? (
                        <img src={data.iconUrl} alt="" className="w-6 h-6 rounded-lg object-cover shadow-2xs shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                          {comp.name.slice(0, 1)}
                        </div>
                      )}
                      <span className="font-extrabold text-xs text-slate-900 truncate" title={data.title || comp.title || comp.name}>
                        {data.title || comp.title || comp.name}
                      </span>
                    </div>
                    {comp.isPinned && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-md flex items-center space-x-1 shrink-0 border border-amber-200" title="已固定置顶">
                        <Pin className="w-2.5 h-2.5 fill-current text-amber-700" />
                        <span>置顶</span>
                      </span>
                    )}
                  </div>

                  <div className="relative aspect-[1024/500] w-full bg-slate-100 rounded-xl overflow-hidden shadow-2xs border border-slate-200 flex items-center justify-center">
                    {data.featureGraphicUrl ? (
                      <>
                        <img src={data.featureGraphicUrl} alt={`${comp.name} 置顶大图`} className="w-full h-full object-cover group-hover:scale-102 transition duration-300" />
                        
                        <button
                          onClick={() => setPreviewImageUrl({ url: data.featureGraphicUrl, title: `${comp.name} - 置顶大图`, type: 'banner' })}
                          className="absolute top-2 left-2 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full bg-slate-100/90 flex flex-col items-center justify-center text-slate-400 p-3 text-center border border-dashed border-slate-200">
                        <Sparkles className="w-5 h-5 text-slate-300 mb-1" />
                        <span className="text-[11px] font-bold text-slate-500">暂无置顶大图</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">未配置置顶大图</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                    <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full shrink-0">
                      1024 x 500
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        disabled={!data.featureGraphicUrl}
                        onClick={() => data.featureGraphicUrl && handleCopyImage(data.featureGraphicUrl, `${comp.id}-fg`)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition flex items-center space-x-1 ${
                          data.featureGraphicUrl
                            ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 cursor-pointer'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                        }`}
                        title={data.featureGraphicUrl ? "直接复制置顶大图" : "无有效图片"}
                      >
                        {copiedUrl === `img-${comp.id}-fg` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700 font-extrabold">已复制图片</span>
                          </>
                        ) : copiedUrl === `url-${comp.id}-fg` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">已复制链接</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-amber-700" />
                            <span>复制图片</span>
                          </>
                        )}
                      </button>
                      <button
                        disabled={!data.featureGraphicUrl}
                        onClick={() => data.featureGraphicUrl && handleDownloadImage(data.featureGraphicUrl, `${comp.name}-banner.png`)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition flex items-center space-x-1 ${
                          data.featureGraphicUrl
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                        }`}
                        title={data.featureGraphicUrl ? "下载原图" : "无有效图片"}
                      >
                        <Download className="w-3 h-3 text-slate-600" />
                        <span>下载</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: 宣传截图 (Screenshots) */}
      {(activeTab === 'all' || activeTab === 'screenshots') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">宣传截图</h3>
              </div>
            </div>

            {/* Competitor Switcher Dropdown Bubble */}
            <div className="relative inline-flex items-center">
              <Filter className="w-3.5 h-3.5 text-emerald-600 absolute left-3 pointer-events-none" />
              <select
                value={activeScreenshotCompId}
                onChange={(e) => setActiveScreenshotCompId(e.target.value)}
                className="pl-8 pr-8 py-1.5 bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-black rounded-full shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer transition appearance-none"
              >
                <option value="all">全部竞品</option>
                {activeCompetitors.map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-600 absolute right-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-6">
            {activeCompetitors
              .filter(c => activeScreenshotCompId === 'all' || activeScreenshotCompId === c.id)
              .map(comp => {
                const data = scrapedMap[comp.id];
                if (!data || !data.screenshots || data.screenshots.length === 0) return null;
                const uniqueScreenshots = deduplicateUrls(data.screenshots);
                if (uniqueScreenshots.length === 0) return null;

                return (
                  <div key={comp.id} className={`relative bg-slate-50/80 border rounded-2xl p-4 space-y-3 ${comp.isPinned ? 'border-amber-300 ring-1 ring-amber-200/80' : 'border-slate-200/80'}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <img src={data.iconUrl} alt="" className="w-6 h-6 rounded-lg object-cover shadow-2xs shrink-0" />
                        <span className="font-black text-xs text-slate-900 leading-snug" title={data.title || comp.title || comp.name}>
                          {data.title || comp.title || comp.name}
                        </span>
                        {comp.isPinned && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-md flex items-center space-x-1 border border-amber-200 shrink-0" title="已固定置顶">
                            <Pin className="w-2.5 h-2.5 fill-current text-amber-700" />
                            <span>置顶</span>
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 font-mono shrink-0">
                          ({uniqueScreenshots.length} 张有效应用截图)
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const urls = uniqueScreenshots.join('\n');
                          navigator.clipboard.writeText(urls);
                          setCopiedUrl(`sc-${comp.id}`);
                          setTimeout(() => setCopiedUrl(null), 2000);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedUrl === `sc-${comp.id}` ? (
                          <span className="text-emerald-600 font-bold">已复制全部链接</span>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-500" />
                            <span>批量复制截图链接</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Screenshots Horizontal Container with Native Aspect Ratio Display (No Cropping) */}
                    {uniqueScreenshots.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="font-bold text-slate-600">暂未抓取到该竞品的应用截图</p>
                        <p className="text-slate-400 text-[11px] mt-1">
                          可能原因：该应用在当前抓取区域（美区 US）未上线、包名已失效，或仅在特定国家/地区软启动。点击顶部“一键重新拉取”可重试。
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-stretch space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 snap-x">
                        {uniqueScreenshots.map((scUrl, idx) => (
                          <div
                            key={idx}
                            className="group relative shrink-0 bg-white rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition border border-slate-200 snap-start flex flex-col justify-between"
                            style={{ height: '300px' }}
                          >
                            {/* Image display viewport with object-contain to display portrait/landscape naturally without dark bars */}
                            <div className="relative h-[256px] min-w-[140px] max-w-[500px] bg-slate-50 flex items-center justify-center p-1 overflow-hidden">
                              <img
                                src={scUrl}
                                alt={`截图 ${idx + 1}`}
                                className="max-h-full max-w-full h-auto w-auto object-contain rounded-lg transition transform group-hover:scale-102"
                                loading="lazy"
                              />

                              <button
                                onClick={() => setPreviewImageUrl({ url: scUrl, title: `${comp.name} - 截图 ${idx + 1}`, type: 'screenshot' })}
                                className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition cursor-pointer"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="p-2 bg-white flex items-center justify-between text-[11px] border-t border-slate-100 gap-1">
                              <span className="font-bold text-slate-700 truncate">截图 #{idx + 1}</span>
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  onClick={() => handleCopyImage(scUrl, `${comp.id}-sc-${idx}`)}
                                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-900 rounded font-bold transition cursor-pointer flex items-center space-x-1"
                                  title="直接复制截图到剪贴板"
                                >
                                  {copiedUrl === `img-${comp.id}-sc-${idx}` ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span>已复制</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 text-emerald-700" />
                                      <span>复制图片</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDownloadImage(scUrl, `${comp.name}-screenshot-${idx + 1}.png`)}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-600 transition cursor-pointer"
                                  title="下载截图"
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                                <a
                                  href={scUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-slate-100 rounded text-slate-600 transition cursor-pointer"
                                  title="新窗口打开"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* SECTION 4: 竞品活动图与宣发文案 (LiveOps Events & Offers 历史与最新活动库) */}
      {(activeTab === 'all' || activeTab === 'events') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          {/* Header & Filter Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-100 pb-3.5 gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-base text-slate-900">竞品活动图</h3>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-900 text-xs font-black rounded-full">
                    {allEventsWithComp.length} / {totalEventsCount} 个活动
                  </span>
                </div>
                <p className="text-xs text-slate-500">自动解析竞品活动图与文案，历史活动永久归档</p>
              </div>
            </div>

            {/* Right: Competitor Filter Dropdown */}
            <div className="flex items-center space-x-2 shrink-0">
              <div className="relative inline-flex items-center">
                <Filter className="w-3.5 h-3.5 text-purple-600 absolute left-3 pointer-events-none" />
                <select
                  value={activeEventCompId}
                  onChange={(e) => setActiveEventCompId(e.target.value)}
                  className="pl-8 pr-8 py-1.5 bg-purple-50/90 hover:bg-purple-100 border border-purple-200 text-purple-900 text-xs font-black rounded-full shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition appearance-none"
                >
                  <option value="all">全部竞品活动 ({activeCompetitors.length})</option>
                  {activeCompetitors.map(comp => (
                    <option key={comp.id} value={comp.id}>
                      {comp.title || comp.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-purple-600 absolute right-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Status Filter Tab Pills */}
          <div className="flex items-center flex-wrap gap-2 pt-1 pb-1">
            <button
              onClick={() => setEventStatusFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                eventStatusFilter === 'all'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>全部活动</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                eventStatusFilter === 'all' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {totalEventsCount}
              </span>
            </button>

            <button
              onClick={() => setEventStatusFilter('active')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                eventStatusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>进行中活动</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                eventStatusFilter === 'active' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {activeEventsCount}
              </span>
            </button>

            <button
              onClick={() => setEventStatusFilter('upcoming')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                eventStatusFilter === 'upcoming'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/80'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>即将开启</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                eventStatusFilter === 'upcoming' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                {upcomingEventsCount}
              </span>
            </button>

            <button
              onClick={() => setEventStatusFilter('ended')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                eventStatusFilter === 'ended'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>历史活动归档</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                eventStatusFilter === 'ended' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {endedEventsCount}
              </span>
            </button>
          </div>

          {/* Events Grid / Card Layout */}
          {allEventsWithComp.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-700">
                {activeEventCompId !== 'all'
                  ? `【${activeCompetitors.find(c => c.id === activeEventCompId)?.title || activeCompetitors.find(c => c.id === activeEventCompId)?.name || '该竞品'}】暂无${eventStatusFilter === 'active' ? '进行中的' : eventStatusFilter === 'upcoming' ? '即将开启的' : eventStatusFilter === 'ended' ? '已结束的历史' : ''}活动`
                  : `所选竞品暂无${eventStatusFilter === 'active' ? '进行中的' : eventStatusFilter === 'upcoming' ? '即将开启的' : eventStatusFilter === 'ended' ? '已结束的历史' : ''}活动`
                }
              </p>
              <p className="text-slate-400 text-[11px]">
                竞品暂未开展活动时如实显示，不用其他数据填充。
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {allEventsWithComp.map((ev) => {
                const today = new Date().toISOString().split('T')[0];
                let daysLeftText = '';
                if (ev.status === 'active' && ev.endDate) {
                  const diffMs = new Date(ev.endDate).getTime() - new Date(today).getTime();
                  const diffDays = Math.ceil(diffMs / 86400000);
                  if (diffDays > 0) daysLeftText = `还剩 ${diffDays} 天`;
                  else if (diffDays === 0) daysLeftText = '今日结束';
                }

                return (
                  <div
                    key={ev.id}
                    className={`bg-white border rounded-2xl shadow-2xs hover:shadow-md transition overflow-hidden flex flex-col justify-between group ${
                      ev.status === 'active'
                        ? 'border-emerald-200/90 ring-1 ring-emerald-500/10'
                        : ev.status === 'upcoming'
                        ? 'border-blue-200/90'
                        : 'border-slate-200 opacity-90'
                    }`}
                  >
                    {/* Event Top Bar: Competitor & Live Status */}
                    <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0">
                        <img src={ev.compIconUrl} alt="" className="w-5 h-5 rounded-md object-cover shrink-0" />
                        <span className="font-extrabold text-xs text-slate-800 truncate" title={ev.compName}>
                          {ev.compName}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center space-x-1.5 shrink-0">
                        {ev.eventUrl && (
                          <a
                            href={ev.eventUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition"
                            title="在 Google Play 中查看官方活动详情"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full flex items-center space-x-1 ${
                          ev.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : ev.status === 'upcoming'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          <Tag className="w-2.5 h-2.5" />
                          <span>
                            {ev.status === 'active' ? `进行中${daysLeftText ? ` (${daysLeftText})` : ''}` : ev.status === 'upcoming' ? '即将开启' : '历史归档 (已结束)'}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Event Poster Image (活动图 16:9) */}
                    <div className="relative aspect-[16/9] w-full bg-slate-100 overflow-hidden flex items-center justify-center">
                      {ev.imageUrl ? (
                        <>
                          <img
                            src={ev.imageUrl}
                            alt={ev.title}
                            className={`w-full h-full object-cover group-hover:scale-103 transition duration-300 ${
                              ev.status === 'ended' ? 'grayscale-25' : ''
                            }`}
                          />
                          {ev.status === 'ended' && (
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-900/80 text-slate-200 text-[10px] font-bold rounded-md backdrop-blur-xs flex items-center space-x-1">
                              <History className="w-2.5 h-2.5" />
                              <span>往期历史活动</span>
                            </div>
                          )}
                          <button
                            onClick={() => setPreviewImageUrl({ url: ev.imageUrl, title: `${ev.compName} - ${ev.title}`, type: 'event' })}
                            className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            title="查看大图"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-50 to-slate-100 flex flex-col items-center justify-center p-3 text-center">
                          <Calendar className="w-6 h-6 text-purple-300 mb-1" />
                          <span className="text-[11px] font-bold text-purple-700">官方限时活动</span>
                          <span className="text-[9px] text-slate-400 mt-0.5">未附带专用活动宣传图</span>
                        </div>
                      )}
                    </div>

                    {/* Event Details: Date, Title, Marketing Copy */}
                    <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        {/* Activity Dates (活动开展日期) */}
                        <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-slate-100 border border-slate-200/80 text-slate-700 text-[10px] font-mono font-bold rounded-md">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>开展日期: {ev.startDate} ~ {ev.endDate}</span>
                        </div>

                        {/* Event Title */}
                        <h4 className="font-black text-xs text-slate-900 leading-snug line-clamp-2" title={ev.title}>
                          {ev.title}
                        </h4>

                        {/* Event Description (活动描述与宣发文案) */}
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-slate-400 flex items-center space-x-1">
                            <FileText className="w-3 h-3" />
                            <span>官方宣发文案：</span>
                          </div>
                          <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed max-h-28 overflow-y-auto scrollbar-thin select-text">
                            {ev.description}
                          </p>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 gap-1.5">
                        <button
                          onClick={() => {
                            const textToCopy = `${ev.title}\n\n${ev.description}`;
                            navigator.clipboard.writeText(textToCopy);
                            setCopiedUrl(`text-ev-${ev.id}`);
                            setTimeout(() => setCopiedUrl(null), 2000);
                          }}
                          className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 text-[10px] font-bold rounded-lg transition flex items-center space-x-1.5 cursor-pointer shrink-0"
                          title="复制活动标题与描述文案"
                        >
                          {copiedUrl === `text-ev-${ev.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700 font-extrabold">已复制文案</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-3 h-3 text-purple-700" />
                              <span>复制宣发文案</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center space-x-1.5">
                          <button
                            disabled={!ev.imageUrl}
                            onClick={() => ev.imageUrl && handleCopyImage(ev.imageUrl, `ev-${ev.id}`)}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition flex items-center space-x-1 ${
                              ev.imageUrl
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                            }`}
                            title={ev.imageUrl ? "复制图片到剪贴板" : "无有效活动图"}
                          >
                            {copiedUrl === `img-ev-${ev.id}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700 font-extrabold">已复制图</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-600" />
                                <span>复制图</span>
                              </>
                            )}
                          </button>
                          <button
                            disabled={!ev.imageUrl}
                            onClick={() => ev.imageUrl && handleDownloadImage(ev.imageUrl, `${ev.compName}-${ev.title}.png`)}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition flex items-center space-x-1 ${
                              ev.imageUrl
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                            }`}
                            title={ev.imageUrl ? "下载活动图海报" : "无有效活动图"}
                          >
                            <Download className="w-3 h-3 text-slate-600" />
                            <span>下载</span>
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: 素材新变更对比 (Diffs Page with Timeline & Filters) */}
      {(activeTab === 'all' || activeTab === 'diffs') && (() => {
        // 1. Filter by current project's competitors
        const projectChangeLogs = changeLogs.filter(log => {
          const lId = log.compId || log.competitorId;
          const lName = log.compName || log.competitorName;
          const belongsToComp = competitors.some(c =>
            c.id === lId ||
            c.name === lName ||
            (lName && c.name && (c.name.toLowerCase().includes(lName.toLowerCase()) || lName.toLowerCase().includes(c.name.toLowerCase()))) ||
            (lName && c.title && (c.title.toLowerCase().includes(lName.toLowerCase()) || lName.toLowerCase().includes(c.title.toLowerCase())))
          );
          const matchesGlobalSelected = isAllSelected || !selectedCompetitorId || selectedCompetitorId === 'all' || lId === selectedCompetitorId;
          return belongsToComp && matchesGlobalSelected;
        });

        // 2. Count statistics
        const totalLogsCount = projectChangeLogs.length;
        const iconLogsCount = projectChangeLogs.filter(l => l.assetType === 'Icon').length;
        const bannerLogsCount = projectChangeLogs.filter(l => l.assetType === '置顶宣发图').length;
        const screenshotLogsCount = projectChangeLogs.filter(l => l.assetType === '应用截图').length;

        // 3. Filter by local diff filters
        const filteredChangeLogs = projectChangeLogs.filter(log => {
          const lId = log.compId || log.competitorId;
          const lName = log.compName || log.competitorName;

          // Competitor filter
          const matchesComp = diffFilterCompId === 'all' || lId === diffFilterCompId || lName === diffFilterCompId;

          // Asset type filter
          const matchesType = diffFilterType === 'all' || log.assetType === diffFilterType;

          return matchesComp && matchesType;
        });

        return (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-black text-base text-slate-900">素材变更</h3>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-xs font-black rounded-full">
                      {filteredChangeLogs.length} / {totalLogsCount} 条记录
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">双视角画面对比与历史素材变更归档</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {totalLogsCount > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('确认清空当前对比记录，并将当前全部素材设为第一基准版本？')) {
                        setChangeLogs([]);
                        try {
                          localStorage.removeItem(STORAGE_KEY_CHANGELOGS);
                        } catch (e) {}
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold text-xs rounded-full border border-slate-200 transition flex items-center space-x-1.5 cursor-pointer shrink-0"
                    title="清空无效旧记录并将当前素材设为初始版本"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>重设第一版基准</span>
                  </button>
                )}
                <button
                  onClick={handleBatchFetchAll}
                  disabled={batchLoading}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs rounded-full shadow-2xs transition flex items-center space-x-1.5 cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${batchLoading ? 'animate-spin' : ''}`} />
                  <span>检测最新变动</span>
                </button>
              </div>
            </div>

            {/* Filter Toolbar: Dropdown Select Controls */}
            {totalLogsCount > 0 && (
              <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-4 flex-wrap gap-y-2.5">
                  {/* Dropdown 1: Competitor Filter */}
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-slate-600 font-bold text-xs shrink-0">
                      <Filter className="w-3.5 h-3.5 text-amber-600" />
                      <span>按竞品筛选:</span>
                    </div>
                    <div className="relative">
                      <select
                        value={diffFilterCompId}
                        onChange={(e) => setDiffFilterCompId(e.target.value)}
                        className="appearance-none bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-800 py-1.5 pl-3 pr-8 shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer max-w-[220px] truncate"
                      >
                        <option value="all">全部竞品 ({totalLogsCount})</option>
                        {competitors.map(c => {
                          const cCount = projectChangeLogs.filter(l => (l.compId === c.id || l.competitorId === c.id || l.compName === c.name || l.competitorName === c.name)).length;
                          return (
                            <option key={c.id} value={c.id}>
                              {c.title || c.name} ({cCount})
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Dropdown 2: Asset Type Filter */}
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-slate-600 font-bold text-xs shrink-0">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>按素材类型:</span>
                    </div>
                    <div className="relative">
                      <select
                        value={diffFilterType}
                        onChange={(e) => setDiffFilterType(e.target.value as any)}
                        className="appearance-none bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-800 py-1.5 pl-3 pr-8 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="all">全部类型 ({totalLogsCount})</option>
                        <option value="Icon">图标 ({iconLogsCount})</option>
                        <option value="置顶宣发图">置顶宣发图 ({bannerLogsCount})</option>
                        <option value="应用截图">应用截图 ({screenshotLogsCount})</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Reset / Status Bar */}
                <div className="flex items-center space-x-2 text-xs">
                  {(diffFilterCompId !== 'all' || diffFilterType !== 'all') && (
                    <button
                      onClick={() => { setDiffFilterCompId('all'); setDiffFilterType('all'); }}
                      className="px-2.5 py-1 bg-slate-200/70 hover:bg-slate-200 text-slate-700 font-extrabold rounded-lg transition flex items-center space-x-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 text-slate-500" />
                      <span>重置筛选</span>
                    </button>
                  )}

                  {changeLogs.length > 0 && (
                    <button
                      onClick={handleClearAllChangeLogs}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition flex items-center space-x-1 cursor-pointer border border-rose-200 shadow-2xs"
                      title="清除由于拉取异常残留的错误变动记录"
                    >
                      <Trash2 className="w-3 h-3 text-rose-500" />
                      <span>清空历史记录</span>
                    </button>
                  )}

                  <span className="text-[11px] text-slate-400 font-mono">
                    共 {totalLogsCount} 条记录
                  </span>
                </div>
              </div>
            )}

            {/* List or Empty State */}
            {filteredChangeLogs.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-slate-800">
                    {totalLogsCount === 0 ? '当前项目暂未检测到最新视觉素材变动' : '符合筛选条件的变动记录为 0'}
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    {totalLogsCount === 0
                      ? '点击【检测最新变动】比对商店素材。'
                      : '请尝试切换顶部的竞品或素材类型筛选。'}
                  </p>
                </div>
                {totalLogsCount === 0 ? (
                  <div className="flex items-center justify-center space-x-2 pt-1">
                    <button
                      onClick={handleBatchFetchAll}
                      disabled={batchLoading}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer shadow-2xs flex items-center space-x-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${batchLoading ? 'animate-spin' : ''}`} />
                      <span>检测商店最新素材变动</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setDiffFilterCompId('all'); setDiffFilterType('all'); }}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    重置所有筛选条件
                  </button>
                )}
              </div>
            ) : (
              /* Timeline & Visual Diff Display Cards */
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {filteredChangeLogs.map((log) => {
                  const isIcon = log.assetType === 'Icon';
                  const isScreenshot = log.assetType === '应用截图';
                  const isBanner = log.assetType === '置顶宣发图';

                  return (
                    <div key={log.id} className="relative space-y-3">
                      {/* Timeline Node Dot */}
                      <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-100" />

                      {/* Log Card Container */}
                      <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-2xs hover:shadow-xs transition">
                        {/* Header Bar */}
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 flex-wrap gap-2">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className={`px-2.5 py-1 text-[11px] font-black rounded-lg flex items-center space-x-1.5 ${
                              log.isSequenceChange 
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' 
                                : isIcon
                                ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                : isBanner
                                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                : 'bg-blue-100 text-blue-900 border border-blue-200'
                            }`}>
                              <span>
                                {log.isSequenceChange
                                  ? '顺序变动'
                                  : isIcon
                                  ? '图标换新'
                                  : isBanner
                                  ? '宣发图更新'
                                  : '截图更新'}
                              </span>
                              <span>·</span>
                              <span>{log.slotName || log.assetType}</span>
                            </span>

                            <span className="font-extrabold text-sm text-slate-900">{log.compName || log.competitorName}</span>

                            {log.isSequenceChange && (
                              <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                                原第 {log.oldIndex || '?'} 张 ➔ 现第 {log.newIndex || '?'} 张
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <span className="text-xs text-slate-400 font-mono flex items-center space-x-1 bg-white px-2 py-0.5 rounded-md border border-slate-200/60">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{log.timestamp}</span>
                            </span>
                            <button
                              onClick={() => handleDeleteChangeLog(log.id)}
                              className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                              title="删除此条对比记录"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* VISUAL DIFF DISPLAY - CUSTOMIZED BY ASSET TYPE */}
                        {isIcon ? (
                          /* ICON DIFF: Compact 1:1 Side-by-Side Comparison */
                          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-around gap-4">
                            {/* BEFORE ICON */}
                            <div className="flex flex-col items-center space-y-2 text-center group">
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black rounded-md">
                                旧版图标
                              </span>
                              <div
                                onClick={() => setPreviewImageUrl({ url: log.oldUrl, title: `${log.compName} - 旧版 Icon`, type: 'icon' })}
                                className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-rose-200 shadow-sm group-hover:scale-105 transition cursor-pointer bg-slate-900 flex items-center justify-center"
                              >
                                <img src={log.oldUrl} alt="Old Icon" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold space-x-1">
                                  <Eye className="w-4 h-4" />
                                  <span>放大查看</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleCopyImage(log.oldUrl, `diff-old-${log.id}`)}
                                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded transition cursor-pointer"
                                >
                                  {copiedUrl === `img-diff-old-${log.id}` ? '已复制' : '复制旧图'}
                                </button>
                                <button
                                  onClick={() => handleDownloadImage(log.oldUrl, `${log.compName}-old-icon.png`)}
                                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded transition cursor-pointer"
                                >
                                  下载
                                </button>
                              </div>
                            </div>

                            {/* CENTER ARROW BADGE */}
                            <div className="flex flex-col items-center justify-center space-y-1 text-amber-600 font-extrabold text-xs">
                              <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shadow-2xs">
                                <ArrowRight className="w-5 h-5 animate-pulse" />
                              </div>
                              <span className="text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">更换图标设计</span>
                            </div>

                            {/* AFTER ICON */}
                            <div className="flex flex-col items-center space-y-2 text-center group">
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black rounded-md">
                                最新图标
                              </span>
                              <div
                                onClick={() => setPreviewImageUrl({ url: log.newUrl, title: `${log.compName} - 最新 Icon`, type: 'icon' })}
                                className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-emerald-300 shadow-md group-hover:scale-105 transition cursor-pointer bg-slate-900 flex items-center justify-center"
                              >
                                <img src={log.newUrl} alt="New Icon" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold space-x-1">
                                  <Eye className="w-4 h-4" />
                                  <span>放大查看</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleCopyImage(log.newUrl, `diff-new-${log.id}`)}
                                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded transition border border-emerald-200 cursor-pointer"
                                >
                                  {copiedUrl === `img-diff-new-${log.id}` ? '已复制' : '复制新图'}
                                </button>
                                <button
                                  onClick={() => handleDownloadImage(log.newUrl, `${log.compName}-new-icon.png`)}
                                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded transition cursor-pointer"
                                >
                                  下载
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : isScreenshot ? (
                          /* SCREENSHOT DIFF: Mobile Phone Screen Container */
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* BEFORE SCREENSHOT */}
                            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 flex flex-col">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px]">
                                  变更前
                                </span>
                                <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                                  {log.isSequenceChange ? `原位置 #${log.oldIndex || '?'}` : '旧'}
                                </span>
                              </div>
                              <div
                                onClick={() => setPreviewImageUrl({ url: log.oldUrl, title: `${log.compName} - 旧版截图`, type: 'screenshot' })}
                                className="relative aspect-[3/4] sm:aspect-[9/16] max-h-72 w-full mx-auto bg-slate-900 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center cursor-pointer group shadow-2xs"
                              >
                                <img src={log.oldUrl} alt="" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold space-x-1">
                                  <Maximize2 className="w-4 h-4" />
                                  <span>点击放大</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1.5 pt-1 mt-auto">
                                <button
                                  onClick={() => handleCopyImage(log.oldUrl, `diff-old-${log.id}`)}
                                  className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold rounded-lg transition flex items-center justify-center space-x-1 cursor-pointer"
                                >
                                  {copiedUrl === `img-diff-old-${log.id}` ? '已复制' : '复制旧图'}
                                </button>
                                <button
                                  onClick={() => handleDownloadImage(log.oldUrl, `${log.compName}-old-sc.png`)}
                                  className="py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition cursor-pointer"
                                >
                                  下载
                                </button>
                              </div>
                            </div>

                            {/* AFTER SCREENSHOT */}
                            <div className="bg-white p-3 rounded-xl border-2 border-emerald-300 space-y-2 flex flex-col shadow-xs">
                              <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-black">
                                  最新画面
                                </span>
                                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded">
                                  {log.isSequenceChange ? `现位置 #${log.newIndex || '?'}` : '新'}
                                </span>
                              </div>
                              <div
                                onClick={() => setPreviewImageUrl({ url: log.newUrl, title: `${log.compName} - 最新截图`, type: 'screenshot' })}
                                className="relative aspect-[3/4] sm:aspect-[9/16] max-h-72 w-full mx-auto bg-slate-900 rounded-xl overflow-hidden border border-emerald-200 flex items-center justify-center cursor-pointer group shadow-2xs"
                              >
                                <img src={log.newUrl} alt="" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold space-x-1">
                                  <Maximize2 className="w-4 h-4" />
                                  <span>点击放大</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1.5 pt-1 mt-auto">
                                <button
                                  onClick={() => handleCopyImage(log.newUrl, `diff-new-${log.id}`)}
                                  className="flex-1 py-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-[10px] font-bold rounded-lg transition border border-emerald-200 flex items-center justify-center space-x-1 cursor-pointer"
                                >
                                  {copiedUrl === `img-diff-new-${log.id}` ? '已复制' : '复制新图'}
                                </button>
                                <button
                                  onClick={() => handleDownloadImage(log.newUrl, `${log.compName}-new-sc.png`)}
                                  className="py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition cursor-pointer"
                                >
                                  下载
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* FEATURE GRAPHIC / BANNER DIFF: Wide Aspect Grid */
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* BEFORE BANNER */}
                            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px]">
                                  变更前
                                </span>
                                <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded">旧</span>
                              </div>
                              <div
                                onClick={() => setPreviewImageUrl({ url: log.oldUrl, title: `${log.compName} - 旧版宣发图`, type: 'banner' })}
                                className="relative aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center cursor-pointer group shadow-2xs"
                              >
                                <img src={log.oldUrl} alt="" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold space-x-1">
                                  <Maximize2 className="w-4 h-4" />
                                  <span>放大查看</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1.5 pt-1">
                                <button
                                  onClick={() => handleCopyImage(log.oldUrl, `diff-old-${log.id}`)}
                                  className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold rounded-lg transition flex items-center justify-center space-x-1 cursor-pointer"
                                >
                                  {copiedUrl === `img-diff-old-${log.id}` ? '已复制' : '复制旧图'}
                                </button>
                                <button
                                  onClick={() => handleDownloadImage(log.oldUrl, `${log.compName}-old-banner.png`)}
                                  className="py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition cursor-pointer"
                                >
                                  下载
                                </button>
                              </div>
                            </div>

                            {/* AFTER BANNER */}
                            <div className="bg-white p-3 rounded-xl border-2 border-purple-300 space-y-2 shadow-xs">
                              <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                                <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded text-[10px] font-black">
                                  最新宣发图
                                </span>
                                <span className="text-[10px] font-mono bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded font-bold">新</span>
                              </div>
                              <div
                                onClick={() => setPreviewImageUrl({ url: log.newUrl, title: `${log.compName} - 最新宣发图`, type: 'banner' })}
                                className="relative aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-purple-200 flex items-center justify-center cursor-pointer group shadow-2xs"
                              >
                                <img src={log.newUrl} alt="" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold space-x-1">
                                  <Maximize2 className="w-4 h-4" />
                                  <span>放大查看</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1.5 pt-1">
                                <button
                                  onClick={() => handleCopyImage(log.newUrl, `diff-new-${log.id}`)}
                                  className="flex-1 py-1 px-2 bg-purple-50 hover:bg-purple-100 text-purple-900 text-[10px] font-bold rounded-lg transition border border-purple-200 flex items-center justify-center space-x-1 cursor-pointer"
                                >
                                  {copiedUrl === `img-diff-new-${log.id}` ? '已复制' : '复制新图'}
                                </button>
                                <button
                                  onClick={() => handleDownloadImage(log.newUrl, `${log.compName}-new-banner.png`)}
                                  className="py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition cursor-pointer"
                                >
                                  下载
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* High-Res Image Preview Lightbox Modal */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">{previewImageUrl.title}</h4>
                <div className="text-[11px] text-slate-500 font-mono break-all">{previewImageUrl.url}</div>
              </div>
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex items-center justify-center bg-slate-950 min-h-[300px]">
              <img
                src={previewImageUrl.url}
                alt=""
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">谷歌商店高清素材</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCopyImage(previewImageUrl.url, 'preview-modal')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                >
                  {copiedUrl === 'img-preview-modal' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span className="text-emerald-100">已复制图片到剪贴板</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>一键复制图片</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDownloadImage(previewImageUrl.url, `${previewImageUrl.title}.png`)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>一键下载高清图</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
