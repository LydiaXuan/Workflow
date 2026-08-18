import React, { useState, useEffect } from 'react';
import { Navbar, MainDomain } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { WorkflowHeader } from './components/WorkflowHeader';
import { ProjectCompetitorBar } from './components/ProjectCompetitorBar';
import { ProjectCenter } from './components/ProjectCenter';
import { CompetitorGrabber } from './components/CompetitorGrabber';
import { CompetitorAnalyzer } from './components/CompetitorAnalyzer';
import { ReleaseNotesGenerator } from './components/ReleaseNotesGenerator';
import { AsoGenerator } from './components/AsoGenerator';
import { AssetScraper } from './components/AssetScraper';
import { AlgorithmKnowledgeCenter } from './components/AlgorithmKnowledgeCenter';
import { VisualOcrInspector } from './components/VisualOcrInspector';
import { AlgorithmGuideModal } from './components/AlgorithmGuideModal';
import { AsoSuggestionsModal } from './components/AsoSuggestionsModal';

import { INITIAL_PROJECTS, INITIAL_COMPETITORS, INITIAL_ASO_COPY } from './data/presets';
import { Project, CompetitorInfo, AsoCopy, RecycledCompetitor } from './types';

const STORAGE_KEY = 'asox_projects_v6';
const ACTIVE_PROJECT_KEY = 'asox_active_project_id_v6';
const ACTIVE_COMPETITOR_KEY = 'asox_active_competitor_id_v6';
const ACTIVE_TAB_KEY = 'asox_active_tab_v6';
const RECYCLED_STORAGE_KEY = 'asox_recycled_competitors_v6';

function resolveDeveloperName(c: { packageName?: string; name?: string; developer?: string }): string {
  const pkg = c.packageName || '';
  const name = c.name || '';
  if (pkg === 'com.nebula.splashbuster' || /^splash\s*buster$/i.test(name)) return 'Nebula Studio';
  if (pkg === 'com.saygames.smashfest' || /^smash\s*fest/i.test(name)) return 'SayGames';
  if (pkg === 'com.physics.cannon.demolition3d') return 'Voodoo';
  if (pkg === 'com.smash.castle.crusher.physics') return 'Lion Studios';
  if (pkg === 'com.ragdoll.demolition.asmr') return 'CrazyLabs';
  if (pkg === 'com.citrus.game.studios') return 'Citrus Game Studios';
  if (pkg === 'com.plarium.global') return 'Plarium Global';

  if (c.developer && c.developer !== 'Google Play 开发者' && c.developer !== 'App Studio') {
    return c.developer;
  }

  if (pkg && pkg.includes('.')) {
    const parts = pkg.split('.');
    if (parts.length >= 2) {
      const p1 = parts[1].toLowerCase();
      if (!['com', 'org', 'net', 'android', 'app', 'game', 'play', 'google', 'store'].includes(p1)) {
        return p1.charAt(0).toUpperCase() + p1.slice(1);
      }
      if (parts.length >= 3) {
        const p2 = parts[2].toLowerCase();
        if (!['android', 'app', 'game', 'store', 'puzzle', 'physics'].includes(p2)) {
          return p2.charAt(0).toUpperCase() + p2.slice(1);
        }
      }
    }
  }

  if (name) {
    return name.replace(/[-_.:].*$/g, '').trim();
  }

  return 'Google Play 开发者';
}

export default function App() {
  // Load projects from localStorage or default presets
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: Project) => {
            const rawProjName = p.name ? p.name.trim() : '';
            const cleanProjName = /^splash\s*buster$/i.test(rawProjName) ? 'Splashbuster' : rawProjName;
            return {
              ...p,
              name: cleanProjName,
              competitors: (p.competitors || []).map(c => {
                const rawName = c.name ? c.name.trim() : '';
                const isSplash = c.packageName === 'com.nebula.splashbuster' || /^splash\s*buster$/i.test(rawName);
                const finalDev = resolveDeveloperName(c);
                return {
                  ...c,
                  name: isSplash ? 'Splashbuster' : rawName,
                  developer: finalDev,
                  iconUrl: isSplash 
                    ? 'https://play-lh.googleusercontent.com/jjosaZOyKGtjL6N--FRuGbNuaStI8iEYRAEj0G78I4OasXfvtZd2M0Sv5_xv8wqzctWA84WyK7MAAjG3AXoz'
                    : c.iconUrl
                };
              })
            };
          });
        }
      }
    } catch (e) {
      console.error('Failed to load saved projects', e);
    }
    return INITIAL_PROJECTS.map(p => ({
      ...p,
      competitors: p.competitors.map(c => ({
        ...c,
        developer: resolveDeveloperName(c)
      }))
    }));
  });

  // Load recycled competitors (Trash Bin)
  const [recycledCompetitors, setRecycledCompetitors] = useState<RecycledCompetitor[]>(() => {
    try {
      const saved = localStorage.getItem(RECYCLED_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load recycled competitors', e);
    }
    return [];
  });

  // Load active project ID from localStorage or default to first project
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_PROJECT_KEY);
      if (saved && projects.some(p => p.id === saved)) {
        return saved;
      }
    } catch (e) {
      console.error('Failed to load active project id', e);
    }
    return projects[0]?.id || 'p-1';
  });

  // Load active tab from localStorage
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_TAB_KEY);
      if (saved) return saved;
    } catch (e) {}
    return 'competitor';
  });

  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState<boolean>(false);

  // Active project helper
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  // Selected competitor inside active project from localStorage
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_COMPETITOR_KEY);
      if (saved && activeProject?.competitors?.some(c => c.id === saved)) {
        return saved;
      }
    } catch (e) {}
    return activeProject?.competitors?.[0]?.id || 'c1';
  });

  // Toggle for "全选所有产品共同分析"
  const [isAllSelected, setIsAllSelected] = useState<boolean>(false);

  // Sync projects state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects to localStorage', e);
    }
  }, [projects]);

  // Sync activeProjectId to localStorage
  useEffect(() => {
    try {
      if (activeProjectId) {
        localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
      }
    } catch (e) {}
  }, [activeProjectId]);

  // Sync selectedCompetitorId to localStorage
  useEffect(() => {
    try {
      if (selectedCompetitorId !== undefined) {
        localStorage.setItem(ACTIVE_COMPETITOR_KEY, selectedCompetitorId);
      }
    } catch (e) {}
  }, [selectedCompetitorId]);

  // Sync activeTab to localStorage
  useEffect(() => {
    try {
      if (activeTab) {
        localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
      }
    } catch (e) {}
  }, [activeTab]);

  // Sync recycledCompetitors to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(RECYCLED_STORAGE_KEY, JSON.stringify(recycledCompetitors));
    } catch (e) {}
  }, [recycledCompetitors]);

  // Auto re-fetch & clean developer names & metadata for all existing products
  useEffect(() => {
    let isMounted = true;
    const autoRefetchDevelopers = async () => {
      let hasChanges = false;
      const updatedProjects = await Promise.all(
        projects.map(async (p) => {
          const updatedCompetitors = await Promise.all(
            p.competitors.map(async (c) => {
              const currentDev = c.developer || '';
              const resolvedDev = resolveDeveloperName(c);
              const needsUpdate = !currentDev || currentDev === 'Google Play 开发者' || currentDev === 'App Studio' || !c.iconUrl || c.iconUrl.includes('dicebear');

              if (needsUpdate) {
                hasChanges = true;
                try {
                  const targetUrl = c.url || (c.packageName ? `https://play.google.com/store/apps/details?id=${c.packageName}` : c.name);
                  const res = await fetch('/api/gemini/analyze-competitor', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: targetUrl, name: c.name })
                  });
                  if (res.ok) {
                    const data = await res.json();
                    return {
                      ...c,
                      developer: (data.developer && data.developer !== 'Google Play 开发者') ? data.developer : resolvedDev,
                      iconUrl: (data.iconUrl && !data.iconUrl.includes('dicebear')) ? data.iconUrl : (c.iconUrl || data.iconUrl),
                      title: data.title || c.title,
                      titleZh: data.titleZh || c.titleZh,
                      shortDescription: data.shortDescription || c.shortDescription,
                      shortDescriptionZh: data.shortDescriptionZh || c.shortDescriptionZh,
                      longDescription: data.longDescription || c.longDescription,
                      longDescriptionZh: data.longDescriptionZh || c.longDescriptionZh,
                      downloads: data.downloads || c.downloads,
                      rating: data.rating || c.rating,
                      category: data.category || c.category
                    };
                  }
                } catch (err) {
                  console.warn('Auto developer/metadata re-fetch failed for:', c.name, err);
                }
                return { ...c, developer: resolvedDev };
              }
              return c;
            })
          );
          return { ...p, competitors: updatedCompetitors };
        })
      );

      if (isMounted && hasChanges) {
        setProjects(updatedProjects);
      }
    };

    autoRefetchDevelopers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle switching active project
  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setIsAllSelected(false);
    const targetProject = projects.find(p => p.id === projectId);
    if (targetProject && targetProject.competitors?.length > 0) {
      setSelectedCompetitorId(targetProject.competitors[0].id);
    } else {
      setSelectedCompetitorId('');
    }
    if (activeTab === 'projects') {
      setActiveTab('competitor');
    }
  };

  // Handle Project Creation
  const handleCreateProject = (newProj: Project) => {
    setProjects(prev => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setIsAllSelected(false);
    if (newProj.competitors?.length > 0) {
      setSelectedCompetitorId(newProj.competitors[0].id);
    } else {
      setSelectedCompetitorId('');
    }
    setActiveTab('competitor');
  };

  // Quick New Project handler
  const handleQuickCreateProject = () => {
    const id = `p-${Date.now()}`;
    const projName = `新 ASO 项目 ${projects.length + 1}`;
    const newProj: Project = {
      id,
      name: projName,
      category: 'Games > Puzzle',
      packageName: `com.asox.game${projects.length + 1}`,
      updatedAt: new Date().toLocaleDateString(),
      targetKeywords: ['3d', 'puzzle', 'casual', 'brain', 'physics'],
      competitors: [],
      asoCopy: {
        appName: projName,
        title: projName,
        shortDescription: '',
        longDescription: '',
        targetKeywords: ['3d', 'puzzle', 'casual', 'brain', 'physics'],
        subGenre: 'Games > Puzzle'
      }
    };
    handleCreateProject(newProj);
  };

  // Handle Project Rename & Package Name Edit
  const handleRenameProject = (id: string, newName: string, newPackageName?: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          name: newName,
          packageName: newPackageName !== undefined && newPackageName.trim() ? newPackageName.trim() : p.packageName,
          updatedAt: new Date().toLocaleDateString(),
          asoCopy: {
            ...p.asoCopy,
            appName: newName
          }
        };
      }
      return p;
    }));
  };

  // Handle Project Duplicate
  const handleDuplicateProject = (id: string) => {
    const target = projects.find(p => p.id === id);
    if (!target) return;
    const newProj: Project = JSON.parse(JSON.stringify(target));
    newProj.id = `p-${Date.now()}`;
    newProj.name = `${target.name} (副本)`;
    newProj.updatedAt = new Date().toLocaleDateString();
    handleCreateProject(newProj);
  };

  // Handle Project Pin Toggle
  const handleTogglePinProject = (id: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          isPinned: !p.isPinned,
          updatedAt: new Date().toLocaleDateString()
        };
      }
      return p;
    }));
  };

  // Handle Competitor Pin Toggle
  const handleTogglePinCompetitor = (compId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          competitors: p.competitors.map(c => c.id === compId ? { ...c, isPinned: !c.isPinned } : c),
          updatedAt: new Date().toLocaleDateString()
        };
      }
      return p;
    }));
  };

  // Handle Project Delete
  const handleDeleteProject = (id: string) => {
    setProjects(prev => {
      const remaining = prev.filter(p => p.id !== id);
      if (activeProjectId === id) {
        if (remaining.length > 0) {
          setActiveProjectId(remaining[0].id);
          if (remaining[0].competitors?.length > 0) {
            setSelectedCompetitorId(remaining[0].competitors[0].id);
          } else {
            setSelectedCompetitorId('');
          }
        } else {
          setActiveProjectId('');
          setSelectedCompetitorId('');
        }
      }
      return remaining;
    });
    setIsAllSelected(false);
  };

  // Handle updating active project's AsoCopy
  const handleUpdateActiveAsoCopy = (updatedCopy: AsoCopy) => {
    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          asoCopy: updatedCopy,
          updatedAt: new Date().toLocaleDateString()
        };
      }
      return p;
    }));
  };

  // Batch add competitor links with real server AI & Google Play scraping
  const handleBatchAddCompetitors = async (urlsText: string) => {
    const rawLines = urlsText
      .split(/[\n,;]+/)
      .map(l => l.trim())
      .filter(Boolean);

    if (rawLines.length === 0) return;

    // Helper to extract package ID or normalized key from URL/string
    const extractPkgKey = (urlStr: string) => {
      const match = urlStr.match(/id=([a-zA-Z0-9_.]+)/);
      if (match && match[1]) return match[1].toLowerCase();
      // If it's a raw package id or full URL without id= parameter
      const clean = urlStr.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();
      return clean;
    };

    // Existing package IDs / URLs in active project
    const existingKeys = new Set(
      (activeProject?.competitors || []).map(c => extractPkgKey(c.url || c.name || ''))
    );

    // Deduplicate within the batch itself & against existing project competitors
    const linesToProcess: string[] = [];
    const seenInBatch = new Set<string>();

    for (const rawUrl of rawLines) {
      const key = extractPkgKey(rawUrl);
      if (!key) continue;
      // Skip if already seen in current batch or already exists in current project
      if (seenInBatch.has(key) || existingKeys.has(key)) {
        continue;
      }
      seenInBatch.add(key);
      linesToProcess.push(rawUrl);
    }

    if (linesToProcess.length === 0) {
      return;
    }

    const newCompetitors: CompetitorInfo[] = [];

    for (let index = 0; index < linesToProcess.length; index++) {
      const rawUrl = linesToProcess[index];
      let pkgName = '';
      let fullUrl = rawUrl;

      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        fullUrl = rawUrl;
        const match = rawUrl.match(/id=([a-zA-Z0-9_.]+)/);
        if (match && match[1]) pkgName = match[1];
      } else if (/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$/.test(rawUrl.trim())) {
        pkgName = rawUrl.trim();
        fullUrl = `https://play.google.com/store/apps/details?id=${pkgName}`;
      } else {
        // Search term like "Smash Fest"
        pkgName = '';
        fullUrl = rawUrl.trim();
      }

      const cleanTitleSegment = pkgName ? (pkgName.split('.').pop() || rawUrl) : rawUrl;
      const formattedName = cleanTitleSegment
        .replace(/[-_.]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^splashbuster$/i, 'splash buster')
        .split(/\s+/)
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ') || rawUrl;

      try {
        const response = await fetch('/api/gemini/analyze-competitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: fullUrl, name: rawUrl })
        });

        if (response.ok) {
          const data = await response.json();
          const finalPkgName = data.packageName || pkgName || `com.app.${rawUrl.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          const finalUrl = data.url || (finalPkgName ? `https://play.google.com/store/apps/details?id=${finalPkgName}` : fullUrl);

          let rawTitle = data.title || formattedName;
          rawTitle = rawTitle.replace(/\s*-\s*Apps on Google Play.*/i, '').replace(/\s*-\s*Google Play.*/i, '').trim();
          if (/^splashbuster$/i.test(rawTitle.replace(/\s+/g, ''))) {
            rawTitle = 'Splashbuster';
          }

          const resolvedDev = (data.developer && data.developer !== 'Google Play 开发者')
            ? data.developer
            : resolveDeveloperName({ packageName: finalPkgName, name: rawTitle });

          newCompetitors.push({
            id: `c-batch-${Date.now()}-${index}`,
            name: rawTitle,
            url: finalUrl,
            packageName: finalPkgName,
            developer: resolvedDev,
            iconUrl: data.iconUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(finalPkgName)}`,
            featureGraphicUrl: data.featureGraphicUrl,
            screenshots: data.screenshots,
            rating: data.rating || 4.6,
            downloads: data.downloads || '1,000,000+',
            category: data.category || 'Games > Action',
            title: data.title || rawTitle,
            titleZh: data.titleZh || rawTitle,
            shortDescription: data.shortDescription || `${rawTitle} on Google Play Store`,
            shortDescriptionZh: data.shortDescriptionZh || data.shortDescription || `${rawTitle} 官方 Google Play 应用`,
            longDescription: data.longDescription || `${rawTitle} official application on Google Play Store.`,
            longDescriptionZh: data.longDescriptionZh || data.longDescription || `${rawTitle} 官方应用及产品信息。`,
            keywords: data.keywords || [
              { word: 'game', count: 12, category: 'genre', density: 2.5, translation: '游戏' },
              { word: 'play', count: 8, category: 'action', density: 1.8, translation: '游玩' }
            ],
            coreFeatures: data.coreFeatures || ['核心应用特色', '多语言支持'],
            commonPoints: data.commonPoints || ['定期版本更新', '玩家互动体验'],
            differentiationPoints: data.differentiationPoints || ['独家视觉设计', '创新玩法交互']
          });
          continue;
        }
      } catch (err) {
        console.error('Batch competitor fetch error:', err);
      }

      // Fallback if fetch fails
      const fallbackPkg = pkgName || `com.app.${rawUrl.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      newCompetitors.push({
        id: `c-batch-${Date.now()}-${index}`,
        name: formattedName,
        url: fullUrl.startsWith('http') ? fullUrl : `https://play.google.com/store/apps/details?id=${fallbackPkg}`,
        packageName: fallbackPkg,
        developer: resolveDeveloperName({ packageName: fallbackPkg, name: formattedName }),
        iconUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(fallbackPkg)}`,
        rating: 4.6,
        downloads: '1,000,000+',
        category: 'Games > Action',
        title: formattedName,
        titleZh: formattedName,
        shortDescription: `${formattedName} on Google Play Store`,
        shortDescriptionZh: `${formattedName} 官方 Google Play 应用`,
        longDescription: `${formattedName} official application on Google Play Store.`,
        longDescriptionZh: `${formattedName} 官方应用及产品信息。`,
        keywords: [
          { word: 'game', count: 10, category: 'genre', density: 2.0, translation: '游戏' }
        ],
        coreFeatures: ['核心应用特色'],
        commonPoints: ['官方版本更新'],
        differentiationPoints: ['独家视觉体验']
      });
    }

    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          competitors: [...newCompetitors, ...p.competitors],
          updatedAt: new Date().toLocaleDateString()
        };
      }
      return p;
    }));

    if (newCompetitors.length > 0) {
      setSelectedCompetitorId(newCompetitors[0].id);
    }
  };

  // Delete a competitor (Moves to Recycle Bin)
  const handleDeleteCompetitor = (compId: string) => {
    const targetComp = activeProject?.competitors.find(c => c.id === compId);
    if (targetComp) {
      const recItem: RecycledCompetitor = {
        id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        competitor: targetComp,
        projectId: activeProjectId,
        projectName: activeProject?.name || 'ASO 项目',
        deletedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: '2-digit', day: '2-digit' })
      };
      setRecycledCompetitors(prev => [recItem, ...prev]);
    }

    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        const remaining = p.competitors.filter(c => c.id !== compId);
        return {
          ...p,
          competitors: remaining,
          updatedAt: new Date().toLocaleDateString()
        };
      }
      return p;
    }));

    // If deleted competitor was currently selected, select another remaining competitor or clear
    if (selectedCompetitorId === compId) {
      const remainingCompetitors = activeProject?.competitors.filter(c => c.id !== compId) || [];
      if (remainingCompetitors.length > 0) {
        setSelectedCompetitorId(remainingCompetitors[0].id);
      } else {
        setSelectedCompetitorId('');
      }
    }
  };

  // Restore a competitor from Recycle Bin
  const handleRestoreCompetitor = (recycledId: string) => {
    const recItem = recycledCompetitors.find(r => r.id === recycledId);
    if (!recItem) return;

    setProjects(prev => prev.map(p => {
      if (p.id === recItem.projectId) {
        // Avoid duplicate insertion
        if (p.competitors.some(c => c.id === recItem.competitor.id)) {
          return p;
        }
        return {
          ...p,
          competitors: [recItem.competitor, ...p.competitors],
          updatedAt: new Date().toLocaleDateString()
        };
      }
      return p;
    }));

    setRecycledCompetitors(prev => prev.filter(r => r.id !== recycledId));

    if (recItem.projectId === activeProjectId) {
      setSelectedCompetitorId(recItem.competitor.id);
      setIsAllSelected(false);
    }
  };

  // Permanently delete a competitor from Recycle Bin
  const handlePermanentlyDeleteCompetitor = (recycledId: string) => {
    setRecycledCompetitors(prev => prev.filter(r => r.id !== recycledId));
  };

  // Empty Trash
  const handleEmptyTrash = () => {
    setRecycledCompetitors([]);
  };

  // Import projects from JSON Backup
  const handleImportProjects = (imported: Project[]) => {
    if (imported && imported.length > 0) {
      setProjects(imported);
      setActiveProjectId(imported[0].id);
      if (imported[0].competitors?.length > 0) {
        setSelectedCompetitorId(imported[0].competitors[0].id);
      }
    }
  };

  // Update single competitor data (e.g. iconUrl, title) from scraping
  const handleUpdateCompetitorData = (compId: string, updatedData: { iconUrl?: string; name?: string; title?: string; developer?: string }) => {
    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          competitors: p.competitors.map(c => {
            if (c.id === compId) {
              return {
                ...c,
                ...(updatedData.iconUrl ? { iconUrl: updatedData.iconUrl } : {}),
                ...(updatedData.title ? { title: updatedData.title } : {}),
                ...(updatedData.name ? { name: updatedData.name } : {}),
                ...(updatedData.developer ? { developer: updatedData.developer } : {})
              };
            }
            return c;
          })
        };
      }
      return p;
    }));
  };

  // Apply competitor words to active project's ASO copy generator (clean overwrite with imported keywords)
  const handleApplyKeywordsToWriter = (keywordsArray: string[]) => {
    if (activeProject) {
      const cleanKeywords = Array.from(new Set(keywordsArray));
      handleUpdateActiveAsoCopy({
        ...activeProject.asoCopy,
        targetKeywords: cleanKeywords
      });
    }
    setActiveTab('generator');
  };

  // Derive top-level active domain
  const currentDomain: MainDomain = ['assets', 'visual_ocr'].includes(activeTab) ? 'visuals' : 'copywriting';

  const handleChangeDomain = (domain: MainDomain) => {
    if (domain === 'copywriting') {
      if (['assets', 'visual_ocr'].includes(activeTab)) {
        setActiveTab('generator');
      }
    } else {
      if (!['assets', 'visual_ocr'].includes(activeTab)) {
        setActiveTab('assets');
      }
    }
  };

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col overflow-hidden selection:bg-blue-600 selection:text-white">
      
      {/* 1. Top Navbar Banner */}
      <Navbar
        currentDomain={currentDomain}
        onChangeDomain={handleChangeDomain}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenSuggestions={() => setIsSuggestionsOpen(true)}
      />

      {/* 2. Swapped Layout: Left Functional Menu Sidebar + Right Main Workspace */}
      <div className="flex-1 flex overflow-hidden w-full max-w-[1920px] mx-auto">
        
        {/* Left Fixed Sidebar: Functional Steps for Current Domain */}
        <Sidebar
          currentDomain={currentDomain}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenGuide={() => setIsGuideOpen(true)}
        />

        {/* Right Main Content Workspace (Independent Scrollable Area) */}
        <main className="flex-1 h-full overflow-y-auto p-6 space-y-6 min-w-0">
          
          {/* Top Unified Project Selector & Competitor Selector Bar */}
          {activeTab !== 'projects' && activeProject && (
            <ProjectCompetitorBar
              projects={projects}
              activeProjectId={activeProjectId}
              onSelectProject={handleSelectProject}
              onCreateProjectClick={handleQuickCreateProject}
              onUpdateProjectDetails={handleRenameProject}
              onDeleteProject={handleDeleteProject}
              onTogglePinProject={handleTogglePinProject}
              activeProject={activeProject}
              selectedCompetitorId={selectedCompetitorId}
              isAllSelected={isAllSelected}
              onSelectCompetitor={(id) => {
                setIsAllSelected(false);
                setSelectedCompetitorId(id);
              }}
              onToggleSelectAll={() => setIsAllSelected(!isAllSelected)}
              onAddCompetitorBatch={handleBatchAddCompetitors}
              onDeleteCompetitor={handleDeleteCompetitor}
              onTogglePinCompetitor={handleTogglePinCompetitor}
              recycledCompetitors={recycledCompetitors}
              onRestoreCompetitor={handleRestoreCompetitor}
              onPermanentlyDeleteCompetitor={handlePermanentlyDeleteCompetitor}
              onEmptyTrash={handleEmptyTrash}
            />
          )}

          {/* Core Views */}
          {activeTab === 'projects' && (
            <ProjectCenter
              projects={projects}
              activeProjectId={activeProjectId}
              onSelectProject={handleSelectProject}
              onCreateProject={handleCreateProject}
              onUpdateProjectName={handleRenameProject}
              onDuplicateProject={handleDuplicateProject}
              onDeleteProject={handleDeleteProject}
              onTogglePinProject={handleTogglePinProject}
              onImportProjects={handleImportProjects}
            />
          )}

          {activeTab === 'competitor' && activeProject && (
            <CompetitorGrabber
              competitors={activeProject.competitors}
              selectedCompetitorId={selectedCompetitorId}
              onSelectCompetitor={(comp) => setSelectedCompetitorId(comp.id)}
              onAddNewCompetitor={(newComp) => {
                setProjects(prev => prev.map(p => {
                  if (p.id === activeProjectId) {
                    return {
                      ...p,
                      competitors: [newComp, ...p.competitors],
                      updatedAt: new Date().toLocaleDateString()
                    };
                  }
                  return p;
                }));
                setSelectedCompetitorId(newComp.id);
              }}
              onNavigateToAnalysis={(step) => setActiveTab(step || 'analysis')}
            />
          )}

          {activeTab === 'analysis' && activeProject && (
            <CompetitorAnalyzer
              competitors={activeProject.competitors}
              selectedCompetitorId={selectedCompetitorId}
              isAllSelected={isAllSelected}
              onSelectCompetitor={(comp) => {
                setIsAllSelected(false);
                setSelectedCompetitorId(comp.id);
              }}
              onToggleSelectAll={() => setIsAllSelected(!isAllSelected)}
              onApplyToAsoWriter={(comp) => handleApplyKeywordsToWriter(comp.keywords.map(k => k.word))}
              onApplyAllKeywordsToWriter={handleApplyKeywordsToWriter}
              onNavigateStep={(step) => setActiveTab(step)}
            />
          )}

          {activeTab === 'generator' && activeProject && (
            <AsoGenerator
              key={activeProject.id}
              currentCopy={activeProject.asoCopy}
              competitors={activeProject.competitors}
              activeProjectName={activeProject.name}
              onApplyGeneratedCopy={handleUpdateActiveAsoCopy}
              onNavigateToSimulator={(step) => setActiveTab(step || 'analysis')}
            />
          )}

          {activeTab === 'releasenotes' && activeProject && (
            <ReleaseNotesGenerator
              appName={activeProject.asoCopy.appName || activeProject.name}
              onNavigateStep={(step) => setActiveTab(step)}
            />
          )}

          {activeTab === 'knowledge' && (
            <AlgorithmKnowledgeCenter />
          )}

          {activeTab === 'assets' && activeProject && (
            <AssetScraper
              competitors={activeProject.competitors}
              selectedCompetitorId={selectedCompetitorId}
              isAllSelected={isAllSelected}
              onSelectCompetitor={(id) => {
                setIsAllSelected(false);
                setSelectedCompetitorId(id);
              }}
              onUpdateCompetitorData={handleUpdateCompetitorData}
            />
          )}

          {activeTab === 'visual_ocr' && activeProject && (
            <VisualOcrInspector
              competitors={activeProject.competitors}
              currentAsoCopy={activeProject.asoCopy}
            />
          )}

        </main>

      </div>

      {/* Modals */}
      <AlgorithmGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <AsoSuggestionsModal
        isOpen={isSuggestionsOpen}
        onClose={() => setIsSuggestionsOpen(false)}
      />

    </div>
  );
}
