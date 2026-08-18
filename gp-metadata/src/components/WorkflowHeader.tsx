import React, { useState } from 'react';
import { Project } from '../types';
import { Folder, Plus, Edit2, Trash2, Check, X } from 'lucide-react';

interface WorkflowHeaderProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProjectClick: () => void;
  onRenameProject: (id: string, newName: string) => void;
  onDeleteProject: (id: string) => void;
}

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProjectClick,
  onRenameProject,
  onDeleteProject
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 3000);
  };

  const startRename = (e: React.MouseEvent, p: Project) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
    setEditingId(p.id);
    setEditingName(p.name);
  };

  const saveRename = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (editingName.trim()) {
      onRenameProject(id, editingName.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (projects.length <= 1) {
      showNotice('至少需要保留一个 ASO 项目！');
      return;
    }
    setConfirmDeleteId(id);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
        
        {/* Title & Info */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            <Folder className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xs font-black text-slate-900 tracking-tight">
                项目库 ({projects.length})
              </h2>
              {noticeMessage && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-fadeIn">
                  {noticeMessage}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">选择、添加与重命名当前分析项目</p>
          </div>
        </div>

        {/* Create New Project Button */}
        <button
          onClick={onCreateProjectClick}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-2xs flex items-center space-x-1.5 shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新建项目</span>
        </button>
      </div>

      {/* Horizontal Project List Selector */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200">
        {projects.map((proj) => {
          const isActive = proj.id === activeProjectId;
          const isEditing = editingId === proj.id;

          return (
            <div
              key={proj.id}
              onClick={() => !isEditing && onSelectProject(proj.id)}
              className={`shrink-0 cursor-pointer p-2.5 px-3 rounded-xl border transition-all flex items-center space-x-2.5 relative group ${
                isActive
                  ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-100 shadow-2xs text-blue-950'
                  : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                isActive ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-600'
              }`}>
                {proj.name.charAt(0)}
              </div>

              {isEditing ? (
                <form onSubmit={(e) => saveRename(e, proj.id)} className="flex items-center space-x-1">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-28 bg-white border border-blue-400 rounded-lg px-1.5 py-0.5 text-xs text-slate-900 font-bold focus:outline-none"
                  />
                  <button
                    type="submit"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    title="保存"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelRename}
                    className="p-1 bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300"
                    title="取消"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="min-w-0">
                    <p className={`text-xs truncate max-w-[130px] ${isActive ? 'font-black text-blue-950' : 'font-bold text-slate-800'}`}>
                      {proj.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                      {proj.competitors.length} 竞品
                    </p>
                  </div>

                  {/* Actions (Rename / Delete) */}
                  {confirmDeleteId === proj.id ? (
                    <div className="flex items-center space-x-1 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-lg shrink-0">
                      <span className="text-[10px] text-red-700 font-bold">删?</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(proj.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700"
                      >
                        是
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                        className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded hover:bg-slate-300"
                      >
                        否
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startRename(e, proj)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition"
                        title="重命名项目"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(e, proj.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition"
                        title={projects.length > 1 ? "删除项目" : "至少保留一个项目"}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
