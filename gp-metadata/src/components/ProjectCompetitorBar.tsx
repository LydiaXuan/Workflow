import React, { useState, useEffect, useRef } from 'react';
import { CompetitorInfo, Project, RecycledCompetitor } from '../types';
import { Link, Plus, CheckSquare, Square, Trash2, ExternalLink, Sparkles, Folder, ChevronDown, Check, Loader2, Edit3, ArrowUpRight, Pin, RotateCcw } from 'lucide-react';

interface ProjectCompetitorBarProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProjectClick: () => void;
  onUpdateProjectDetails?: (id: string, newName: string, newPackageName?: string) => void;
  onDeleteProject?: (id: string) => void;
  onTogglePinProject?: (id: string) => void;
  activeProject: Project;
  selectedCompetitorId: string;
  isAllSelected: boolean;
  onSelectCompetitor: (id: string) => void;
  onToggleSelectAll: () => void;
  onAddCompetitorBatch: (urlsText: string) => Promise<void> | void;
  onDeleteCompetitor: (id: string) => void;
  onTogglePinCompetitor?: (id: string) => void;
  recycledCompetitors?: RecycledCompetitor[];
  onRestoreCompetitor?: (recycledId: string) => void;
  onPermanentlyDeleteCompetitor?: (recycledId: string) => void;
  onEmptyTrash?: () => void;
}

export const ProjectCompetitorBar: React.FC<ProjectCompetitorBarProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProjectClick,
  onUpdateProjectDetails,
  onDeleteProject,
  onTogglePinProject,
  activeProject,
  selectedCompetitorId,
  isAllSelected,
  onSelectCompetitor,
  onToggleSelectAll,
  onAddCompetitorBatch,
  onDeleteCompetitor,
  onTogglePinCompetitor,
  recycledCompetitors = [],
  onRestoreCompetitor,
  onPermanentlyDeleteCompetitor,
  onEmptyTrash
}) => {
  const [urlsInput, setUrlsInput] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showRecycleBinModal, setShowRecycleBinModal] = useState(false);
  const [showConfirmEmptyTrash, setShowConfirmEmptyTrash] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const projectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node)
      ) {
        setShowProjectDropdown(false);
      }
    };

    if (showProjectDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProjectDropdown]);

  // Quick Edit Meta Modal state
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPackage, setEditPackage] = useState('');

  const competitors = activeProject?.competitors || [];

  const handleOpenEditMeta = () => {
    if (activeProject) {
      setEditName(activeProject.name);
      setEditPackage(activeProject.packageName);
      setIsEditingMeta(true);
    }
  };

  const handleSaveMeta = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeProject && editName.trim() && onUpdateProjectDetails) {
      onUpdateProjectDetails(activeProject.id, editName.trim(), editPackage.trim());
    }
    setIsEditingMeta(false);
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlsInput.trim() || isImporting) return;
    setIsImporting(true);
    try {
      await onAddCompetitorBatch(urlsInput);
      setUrlsInput('');
      setShowBatchModal(false);
    } catch (err) {
      console.error('Batch import failed:', err);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      
      {/* Top Bar: Project Switcher & Quick Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        
        {/* Project Selector & Quick Edit */}
        <div className="flex items-center space-x-2">
          <div className="relative" ref={projectDropdownRef}>
            <div className="flex items-center space-x-1.5 bg-blue-50/90 hover:bg-blue-100/90 border border-blue-200 rounded-full px-4 py-2 transition shadow-2xs">
              <button
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                className="flex items-center space-x-2 text-blue-950 text-sm sm:text-base font-black cursor-pointer group"
              >
                <span className="truncate max-w-[220px] sm:max-w-[320px]">
                  {activeProject?.name || '当前项目'}
                </span>
                <ChevronDown className="w-4 h-4 text-blue-600 shrink-0 group-hover:translate-y-0.5 transition-transform" />
              </button>

              {/* Pencil Icon Button placed directly to the right of the dropdown arrow */}
              <button
                onClick={handleOpenEditMeta}
                className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-200/60 rounded-full transition cursor-pointer shrink-0 ml-1"
                title="修改项目名称与包名"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Project Dropdown Menu */}
            {showProjectDropdown && (
              <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 border-b border-slate-100">
                  切换项目（{projects.length}）
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {[...projects]
                    .sort((a, b) => (a.isPinned && !b.isPinned ? -1 : !a.isPinned && b.isPinned ? 1 : 0))
                    .map((p) => (
                      <div
                        key={p.id}
                        className={`w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition group/item ${
                          p.id === activeProjectId ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                        }`}
                      >
                        <button
                          onClick={() => {
                            onSelectProject(p.id);
                            setShowProjectDropdown(false);
                          }}
                          className="flex-1 text-left truncate flex items-center space-x-1.5 cursor-pointer"
                        >
                          {p.isPinned && (
                            <span className="px-1 py-0.2 bg-amber-100 text-amber-900 border border-amber-200 text-[9px] font-black rounded shrink-0 flex items-center space-x-0.5">
                              <Pin className="w-2.5 h-2.5 fill-current" />
                              <span>置顶</span>
                            </span>
                          )}
                          <span className="truncate">{p.name}</span>
                          {p.id === activeProjectId && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                        </button>
                        
                        <div className="flex items-center space-x-1 shrink-0">
                          {onTogglePinProject && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePinProject(p.id);
                              }}
                              className={`p-1 rounded transition cursor-pointer ${
                                p.isPinned
                                  ? 'text-amber-600 bg-amber-100 border border-amber-300'
                                  : 'text-slate-400 hover:text-amber-600 hover:bg-slate-200/60'
                              }`}
                              title={p.isPinned ? '取消固定项目' : '固定/置顶项目'}
                            >
                              <Pin className="w-3 h-3 fill-current" />
                            </button>
                          )}
                          {projects.length > 1 && onDeleteProject && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteProject(p.id);
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-200/60 rounded transition cursor-pointer"
                              title="删除该项目"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
                <div className="p-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      onCreateProjectClick();
                      setShowProjectDropdown(false);
                    }}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition text-center flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <span>新建项目</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Actions: Batch Add Links Modal Trigger, Recycle Bin & Toggle All Analysis */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowBatchModal(!showBatchModal)}
            className="px-3.5 py-1.5 bg-blue-50/80 hover:bg-blue-100/80 text-blue-700 border border-blue-200/80 font-bold text-xs rounded-full transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Link className="w-3.5 h-3.5" />
            <span>批量导入竞品</span>
          </button>

          <button
            onClick={() => setShowRecycleBinModal(true)}
            className="relative px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 font-bold text-xs rounded-full transition flex items-center space-x-1.5 cursor-pointer"
            title="查看竞品回收站"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span>回收站</span>
            {recycledCompetitors.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ml-0.5">
                {recycledCompetitors.length}
              </span>
            )}
          </button>

          <button
            onClick={onToggleSelectAll}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border ${
              isAllSelected
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            <span>{isAllSelected ? '已全选对比' : '全选竞品对比'}</span>
          </button>
        </div>

      </div>

      {/* Batch Links Drawer / Inline Modal Input */}
      {showBatchModal && (
        <form onSubmit={handleBatchSubmit} className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 flex items-center space-x-1.5">
              <Link className="w-4 h-4 text-blue-600" />
              <span>批量导入竞品链接</span>
            </span>
            <span className="text-[10px] text-blue-700">逗号或换行分隔</span>
          </div>
          <textarea
            rows={2}
            value={urlsInput}
            onChange={(e) => setUrlsInput(e.target.value)}
            placeholder="例如: https://play.google.com/store/apps/details?id=com.app1, https://play.google.com/store/apps/details?id=com.app2"
            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowBatchModal(false)}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!urlsInput.trim() || isImporting}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition disabled:opacity-50 flex items-center space-x-1.5"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>正在导入...</span>
                </>
              ) : (
                <span>确定导入</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Bottom Horizontal Competitors Row */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">
              竞品库（{competitors.length}）
            </span>
            {selectedCompetitorId && onTogglePinCompetitor && (
              <button
                onClick={() => onTogglePinCompetitor(selectedCompetitorId)}
                className={`px-2 py-0.5 text-[11px] font-bold rounded-full transition flex items-center space-x-1 cursor-pointer ${
                  competitors.find(c => c.id === selectedCompetitorId)?.isPinned
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                    : 'bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-800 border border-slate-200'
                }`}
                title="置顶固定当前选中的竞品"
              >
                <Pin className={`w-3 h-3 ${competitors.find(c => c.id === selectedCompetitorId)?.isPinned ? 'fill-current text-amber-700' : 'text-slate-500'}`} />
                <span>
                  {competitors.find(c => c.id === selectedCompetitorId)?.isPinned ? '已置顶' : '置顶'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Horizontal Row */}
        <div className="flex items-center space-x-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {[...competitors]
            .sort((a, b) => (a.isPinned && !b.isPinned ? -1 : !a.isPinned && b.isPinned ? 1 : 0))
            .map((comp) => {
              const isSelected = !isAllSelected && comp.id === selectedCompetitorId;
              return (
                <div
                  key={comp.id}
                  onClick={() => onSelectCompetitor(comp.id)}
                  className={`shrink-0 cursor-pointer p-2.5 pr-20 rounded-xl border transition-all flex items-center space-x-2.5 relative group ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200 shadow-2xs'
                      : isAllSelected
                      ? 'bg-blue-50/30 border-blue-200'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {/* Top Right Actions: Pin, Delete & External Store Link */}
                  <div className="absolute top-1.5 right-1.5 flex items-center space-x-0.5 z-10">
                    {onTogglePinCompetitor && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePinCompetitor(comp.id);
                        }}
                        className={`p-1 rounded transition cursor-pointer ${
                          comp.isPinned
                            ? 'text-amber-600 bg-amber-100/90 hover:bg-amber-200 border border-amber-300'
                            : 'text-slate-400 hover:text-amber-600 hover:bg-white border border-slate-200/80'
                        }`}
                        title={comp.isPinned ? '取消置顶固定' : '置顶固定该竞品'}
                      >
                        <Pin className="w-3 h-3 fill-current" />
                      </button>
                    )}

                    {competitors.length > 1 && onDeleteCompetitor && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCompetitor(comp.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-white border border-slate-200/60 hover:border-red-200 rounded transition cursor-pointer"
                        title="删除/移至回收站"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}

                    <a
                      href={comp.url && comp.url.startsWith('http') ? comp.url : `https://play.google.com/store/apps/details?id=${comp.packageName || comp.id}&hl=en&gl=us`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                      title="跳转至 Google Play 商店"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Icon & Pin Badge */}
                  <div className="relative shrink-0">
                    <img
                      src={comp.iconUrl}
                      alt={comp.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(comp.name)}`;
                      }}
                      className="w-9 h-9 rounded-lg object-cover border border-slate-200 shadow-2xs"
                    />
                    {comp.isPinned && (
                      <span className="absolute -top-1 -left-1 bg-amber-500 text-white p-0.5 rounded-full shadow-2xs" title="已固定置顶">
                        <Pin className="w-2.5 h-2.5 fill-current" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 pr-1">
                    <div className="font-bold text-xs text-slate-900 truncate max-w-[95px] flex items-center space-x-1" title={comp.title || comp.name}>
                      <span className="truncate">{comp.title || comp.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {comp.rating ? `${comp.rating} ★` : '4.6 ★'} · {comp.downloads || '10万+'}
                    </div>
                  </div>

                  {isSelected && (
                    <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold shrink-0">
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Quick Edit Meta Modal */}
      {isEditingMeta && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>修改项目信息</span>
              </h4>
              <button
                onClick={() => setIsEditingMeta(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMeta} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">项目名称</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">应用包名</label>
                <input
                  type="text"
                  required
                  value={editPackage}
                  onChange={e => setEditPackage(e.target.value)}
                  placeholder="com.company.appname"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingMeta(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-md"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-2xs"
                >
                  保存更改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recycle Bin Modal */}
      {showRecycleBinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-red-50 border border-red-100 rounded-lg text-red-600">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">竞品回收站</h4>
                  <p className="text-[11px] text-slate-500">可随时恢复或彻底删除</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecycleBinModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {recycledCompetitors.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Trash2 className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">回收站为空，暂无被删除的竞品。</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>共有 {recycledCompetitors.length} 个已删除竞品</span>
                  {onEmptyTrash && (
                    showConfirmEmptyTrash ? (
                      <div className="flex items-center space-x-2 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                        <span className="text-red-700 font-bold text-[11px]">确定清空回收站？</span>
                        <button
                          type="button"
                          onClick={() => {
                            onEmptyTrash();
                            setShowConfirmEmptyTrash(false);
                          }}
                          className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded transition cursor-pointer shadow-2xs"
                        >
                          确认清空
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowConfirmEmptyTrash(false)}
                          className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] rounded transition cursor-pointer"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowConfirmEmptyTrash(true)}
                        className="text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer"
                      >
                        清空回收站
                      </button>
                    )
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {recycledCompetitors.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-100/80 transition"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <img
                          src={rec.competitor.iconUrl}
                          alt={rec.competitor.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(rec.competitor.name)}`;
                          }}
                          className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {rec.competitor.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {rec.competitor.packageName || '未知包名'} · 来自项目: {rec.projectName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            删除时间: {rec.deletedAt}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {onRestoreCompetitor && (
                          <button
                            onClick={() => onRestoreCompetitor(rec.id)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                            title="恢复该竞品至项目库"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>一键恢复</span>
                          </button>
                        )}
                        {onPermanentlyDeleteCompetitor && (
                          <button
                            onClick={() => onPermanentlyDeleteCompetitor(rec.id)}
                            className="px-2 py-1 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                            title="彻底删除"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>彻底删除</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRecycleBinModal(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
