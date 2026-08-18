import React, { useState } from 'react';
import { 
  X, CheckCircle2, AlertTriangle, ExternalLink, BookOpen, Layers, 
  Target, ShieldAlert, Sparkles, Smile, ListChecks, FileCode, Check,
  Cpu, Network, Eye, MessageSquare, Smartphone, BarChart3, Flame
} from 'lucide-react';

interface AlgorithmGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlgorithmGuideModal: React.FC<AlgorithmGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'deep_algo' | 'density' | 'structure' | 'emoji' | 'policy' | 'prompt'>('rules');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 shadow-xl relative space-y-5 text-slate-800 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">算法手册</h2>
              <p className="text-xs text-slate-500">涵盖字段权重、关键词分层、描述结构与政策红线</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1.5 border-b border-slate-200/80 pb-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
              activeTab === 'rules' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            字段与权重
          </button>
          <button
            onClick={() => setActiveTab('deep_algo')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
              activeTab === 'deep_algo' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            推荐算法
          </button>
          <button
            onClick={() => setActiveTab('density')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
              activeTab === 'density' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            分层词库与密度
          </button>
          <button
            onClick={() => setActiveTab('structure')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
              activeTab === 'structure' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            描述结构
          </button>
          <button
            onClick={() => setActiveTab('emoji')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
              activeTab === 'emoji' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            表情与风格
          </button>
          <button
            onClick={() => setActiveTab('policy')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
              activeTab === 'policy' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            真实玩法与政策
          </button>
        </div>

        {/* Tab 1: §0~§2 Overview */}
        {activeTab === 'rules' && (
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>各字段规格与权重金字塔</span>
              </h3>
              <p className="text-slate-600">
                Google Play 索引引擎对不同元数据字段有极其严格的权重梯度和字符长度硬约束：
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-950">应用标题</span>
                  <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-bold">权重 5.0</span>
                </div>
                <span className="text-[10px] text-rose-700 font-mono block">上限 30 字符（绝对硬约束）</span>
                <p className="text-slate-700 text-[11px]">
                  决定搜索基准排名的第一生命线。必须包含品牌名 + 1 个核心词（如 <code>Splashbuster: Cannon Smash 3D</code>）。
                </p>
              </div>

              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-950">简短说明</span>
                  <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.2 rounded font-bold">权重 4.5</span>
                </div>
                <span className="text-[10px] text-purple-700 font-mono block">上限 80 字符（折叠前完整展示）</span>
                <p className="text-slate-700 text-[11px]">
                  商店详情页和搜索结果卡片直接可见。采用“核心价值+核心词+轻CTA”，是撬动安装转化率 (CVR) 的关键杠杆。
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950">完整说明</span>
                  <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-bold">权重 4.0</span>
                </div>
                <span className="text-[10px] text-blue-700 font-mono block">上限 4,000 字符（5 段式架构）</span>
                <p className="text-slate-700 text-[11px]">
                  语义建库的主体。折叠前首屏（前 2~3 行 / 167 字符）权重最高，必须自然包含核心词并适度加粗。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Deep Algo Knowledge */}
        {activeTab === 'deep_algo' && (
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <h3 className="font-bold text-emerald-950 text-sm flex items-center space-x-1.5">
                <Cpu className="w-4 h-4 text-emerald-600" />
                <span>推荐算法与行为机制</span>
              </h3>
              <p className="text-emerald-900">
                深入理解 Google 推荐系统的底层逻辑，掌握大厂算法推流的核心抓手。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <Network className="w-3.5 h-3.5 text-blue-600" />
                  <span>推荐推流与语义向量</span>
                </h4>
                <p className="text-slate-600 text-[11px]">
                  “类似应用”推荐通过用户塔与应用塔的高维向量相似度匹配。文案自然融入品类标准实体动词（如 combo、cascade、booster），两塔匹配得分最高。
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <Eye className="w-3.5 h-3.5 text-cyan-600" />
                  <span>截图识别加权</span>
                </h4>
                <p className="text-slate-600 text-[11px]">
                  谷歌会扫描截图并识别大字宣发标语。若截图文字与关键词强一致，触发信息置信度提权。
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>开发者回复实时索引</span>
                </h4>
                <p className="text-slate-600 text-[11px]">
                  在开发者后台回复玩家评论时，回复的内容会被谷歌索引，可巧妙带入长尾词。
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                  <span>包名（终身强权重）</span>
                </h4>
                <p className="text-slate-600 text-[11px]">
                  应用包名（如 <code>com.studio.blockpuzzle</code>）权重与标题相当且终身不可改，立项时即需规划核心词。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Density & 3-Tier */}
        {activeTab === 'density' && (
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                <Target className="w-4 h-4 text-blue-600" />
                <span>分层词库与黄金密度（2.0%~3.0%）</span>
              </h3>
              <p className="text-slate-600">
                严禁随意堆砌或机械重复，按分层梯度科学布局：
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-[11px]">
                <strong className="text-blue-900 block mb-1">核心词（1–3 个）：</strong>
                <p className="text-blue-800">最高搜索量与最精准主词。必须在<strong>标题 (1次) + 短描述 (1次) + 长描述首屏 (1次) + 正文总结段 (1-2次)</strong> 贯穿出现。</p>
              </div>

              <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl text-[11px]">
                <strong className="text-purple-900 block mb-1">主要词（5–8 个）：</strong>
                <p className="text-purple-800">核心玩法与品类词。布局在长描述的<strong>核心玩法机制段落</strong>，每条用表情分隔。</p>
              </div>

              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-[11px]">
                <strong className="text-slate-900 block mb-1">长尾词（10–20 个）：</strong>
                <p className="text-slate-700">场景、人群与低竞争词（如 offline puzzle no wifi）。布局在<strong>特色与差异化段落</strong>。</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: 5-Stage Structure */}
        {activeTab === 'structure' && (
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>长描述 5 段式结构</span>
              </h3>
              <p className="text-slate-600">长描述必须遵循严格的 5 段递进权重流：</p>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg">
                <strong className="text-blue-900">1. 首屏钩子段（前 2~3 行 / 约 167 字符）：</strong>
                <p className="text-slate-700 mt-0.5">折叠前唯一可见区。一句话阐述核心体验 + 包含核心词（建议用 <code>&lt;b&gt;</code> 适度加粗）。</p>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <strong className="text-slate-900">2. 核心玩法机制段：</strong>
                <p className="text-slate-700 mt-0.5">3–5 条玩法要点，行首带同族表情分隔，自然铺设主要玩法词。</p>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <strong className="text-slate-900">3. 差异化特色段：</strong>
                <p className="text-slate-700 mt-0.5">3–4 条差异化亮点（离线畅玩、精美特效、舒缓解压），铺设长尾词。</p>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <strong className="text-slate-900">4. 社交与社群氛围段：</strong>
                <p className="text-slate-700 mt-0.5">面向各年龄层的轻松解压描述，建立情绪共鸣。</p>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <strong className="text-slate-900">5. 结尾行动号召：</strong>
                <p className="text-slate-700 mt-0.5">1–2 句清晰召唤下载语，最后一次自然呼应核心词。</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Emoji */}
        {activeTab === 'emoji' && (
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                <Smile className="w-4 h-4 text-blue-600" />
                <span>表情与风格匹配</span>
              </h3>
              <p className="text-slate-600">
                表情仅作为视觉断句与风格强化的辅助，切勿滥用导致廉价感：
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <strong className="text-slate-900">休闲益智 / 轻松解压：</strong>
                <p className="text-slate-600 font-mono">🧩 🎯 💥 🏆 ⭐️ ✨</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <strong className="text-slate-900">华丽典雅：</strong>
                <p className="text-slate-600 font-mono">👑 💎 ✨ 🏰 🛡️ ⚔️</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <strong className="text-slate-900">竞技爆破 / 爽快击碎：</strong>
                <p className="text-slate-600 font-mono">🔥 💥 🏆 ⚡ 🎯 🚀</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <strong className="text-slate-900">极简解压 ASMR：</strong>
                <p className="text-slate-600 font-mono">🍃 🎧 🧘 🫧 🌸 🕊️</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Policy & Authenticity */}
        {activeTab === 'policy' && (
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <h3 className="font-bold text-rose-950 text-sm flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>真实玩法与政策红线</span>
              </h3>
              <p className="text-rose-900">
                一票否决项。违反政策或虚构数据会导致拒审甚至封禁开发者账号：
              </p>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">严禁虚构具体数字：</strong>
                  <p className="text-slate-600">绝不允许捏造 “200+ 关卡”、“1000+ 挑战”、“100万玩家” 等虚假数字。</p>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">严禁违规促销与排名宣称：</strong>
                  <p className="text-slate-600">严禁在标题和短描述中使用 “Best”, “#1”, “Free Download”, “Top Game” 等被明确禁止的促销词。</p>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">单一事实来源（真实清单）：</strong>
                  <p className="text-slate-600">文案中的每一项模式和特色必须在游戏实际功能清单中真实存在，绝不夸大编造。</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
