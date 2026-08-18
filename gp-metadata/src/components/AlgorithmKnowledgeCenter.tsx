import React, { useState } from 'react';
import { 
  Cpu, Layers, Target, ShieldAlert, Sparkles, BarChart3, 
  Eye, CheckCircle2, AlertTriangle, ArrowRight, BookOpen, 
  ExternalLink, Network, Search, MessageSquare, History, 
  Flame, Smartphone, Download, Star, Award, Lightbulb
} from 'lucide-react';

export const AlgorithmKnowledgeCenter: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'weights' | 'retrieval' | 'multimodal' | 'reviews' | 'behavior' | 'tiers'>('weights');

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden space-y-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900">算法知识库</h2>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                底层机制与权重
              </span>
            </div>
            <p className="text-xs text-slate-500">
              解读谷歌商店的搜索排名、推荐推流与截图识别机制
            </p>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center space-x-1.5 border-t border-slate-100 pt-3 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveSection('weights')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer flex items-center space-x-1.5 ${
              activeSection === 'weights' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. 字段权重金字塔</span>
          </button>
          <button
            onClick={() => setActiveSection('retrieval')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer flex items-center space-x-1.5 ${
              activeSection === 'retrieval' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>2. 推荐推流与实体图谱</span>
          </button>
          <button
            onClick={() => setActiveSection('tiers')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer flex items-center space-x-1.5 ${
              activeSection === 'tiers' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>3. 分层词库与密度</span>
          </button>
          <button
            onClick={() => setActiveSection('multimodal')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer flex items-center space-x-1.5 ${
              activeSection === 'multimodal' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>4. 截图识别</span>
          </button>
          <button
            onClick={() => setActiveSection('reviews')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer flex items-center space-x-1.5 ${
              activeSection === 'reviews' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>5. 评论与包名终身权重</span>
          </button>
          <button
            onClick={() => setActiveSection('behavior')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer flex items-center space-x-1.5 ${
              activeSection === 'behavior' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>6. 下游转化与留存惩罚</span>
          </button>
        </div>
      </div>

      {/* Section 1: Field Weights Hierarchy */}
      {activeSection === 'weights' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">各字段权重金字塔</h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                权重 1.0 ~ 5.0
              </span>
            </div>

            <div className="space-y-3">
              
              {/* Level 1: App Title & Package Name */}
              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded-md">
                      权重 5.0
                    </span>
                    <h4 className="font-bold text-sm text-rose-950">应用标题 与 包名</h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-700">严格限制 30 字符</span>
                </div>
                <p className="text-xs text-rose-900 leading-relaxed">
                  <strong>算法职能</strong>：决定核心搜索排名的第一基准，标题与包名的权重最高。必须包含核心词，但严禁附加 “Free / Best / #1” 等违规促销词。
                </p>
              </div>

              {/* Level 2: Short Description */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-md">
                      权重 4.5
                    </span>
                    <h4 className="font-bold text-sm text-purple-950">简短说明</h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-700">严格限制 80 字符</span>
                </div>
                <p className="text-xs text-purple-900 leading-relaxed">
                  <strong>算法职能</strong>：在搜索结果页和详情页第一屏直接完整可见。既贡献关键搜索权重，更是<strong>撬动安装转化率的第一杠杆</strong>。采用“核心价值+核心词+行动号召”结构，提供 3 组变体。
                </p>
              </div>

              {/* Level 3: Long Description */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-md">
                      权重 4.0
                    </span>
                    <h4 className="font-bold text-sm text-blue-950">完整说明</h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-700">上限 4,000 字符</span>
                </div>
                <p className="text-xs text-blue-900 leading-relaxed">
                  <strong>算法职能</strong>：语义向量建库的核心。折叠前首屏（前 2~3 行 / 约 167 字符）权重最高，需落核心词与 <code>&lt;b&gt;</code> 标签；正文按 5 段式结构铺设主要词与长尾词，密度严格控制在 <strong>2.0% ~ 3.0%</strong>。
                </p>
              </div>

              {/* Level 4: What's New & Developer Replies */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-amber-600 text-white text-[10px] font-bold rounded-md">
                      权重 3.5
                    </span>
                    <h4 className="font-bold text-sm text-amber-950">更新日志 与 开发者回复</h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-700">7~14天短期提权 / 实时索引</span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  <strong>算法职能</strong>：每次更新提审时，更新说明享有 7~14 天的短期搜索脉冲；后台回复用户评论时，回复词汇会被实时加入长尾索引库。
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Section 2: Deep Retrieval & Knowledge Graph */}
      {activeSection === 'retrieval' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-indigo-700">
              <Network className="w-4 h-4" />
              <h3 className="text-sm font-bold">推荐推流模型</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              谷歌商店的推荐流量（如“类似应用”、“为您推荐”）采用双塔深度学习模型：
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
              <li><strong>用户塔</strong>：分析用户的历史下载、品类偏好、留存率。</li>
              <li><strong>应用塔</strong>：基于应用元数据、共现动词、实体标签计算<strong>高维语义向量</strong>。</li>
              <li><strong>匹配机制</strong>：只有当文案自然融入了品类核心动词与实体词，两塔的相似度才会触发，从而进入头部品类推流池。</li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-purple-700">
              <Lightbulb className="w-4 h-4" />
              <h3 className="text-sm font-bold">游戏实体图谱</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              谷歌将全球游戏映射在庞大的知识图谱中：
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
              <li><strong>实体共现</strong>：例如益智消除类包含 <code>board</code>, <code>grid</code>, <code>booster</code>, <code>combo</code> 等核心实体。</li>
              <li><strong>挂钩大厂推流池</strong>：文案包含这些标准实体词时，谷歌会自动将你的游戏与同类头部产品归入同一实体簇，直接展示在竞品底部的“类似应用”列表。</li>
            </ul>
          </div>
        </div>
      )}

      {/* Section 3: 3-Tier Keyword Architecture */}
      {activeSection === 'tiers' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">分层词库与黄金密度（2.0% ~ 3.0%）</h3>
            </div>
            <span className="text-xs font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              核心标准
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
              <span className="font-bold text-blue-900 text-xs flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span>核心词（1–3 个）</span>
              </span>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                决定主排名的生命线。必须同时出现在：<strong>标题 + 短描述 + 长描述首屏</strong>。
              </p>
            </div>

            <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2">
              <span className="font-bold text-purple-900 text-xs flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                <span>主要玩法词（5–8 个）</span>
              </span>
              <p className="text-[11px] text-purple-800 leading-relaxed">
                核心机制与模式词。自然铺设在长描述的<strong>核心玩法机制段落</strong>，每条配 1 个同族表情分隔。
              </p>
            </div>

            <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl space-y-2">
              <span className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-600" />
                <span>长尾场景词（10–20 个）</span>
              </span>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                人群、场景与差异化词（如 offline casual puzzle for adults）。铺设在特色与差异化段落。
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>密度反堆砌红线</span>
            </div>
            <p className="text-[11px] text-red-800 leading-relaxed">
              核心词全文自然出现 <strong>3–5 次</strong>，密度保持在 <strong>2.0% ~ 3.0%</strong> 为最适。若超过 <strong>3.5%</strong> 或机械罗列，会触发 Google 算法的反堆砌惩罚，导致排名暴跌！
            </p>
          </div>
        </div>
      )}

      {/* Section 4: Multimodal OCR & Cloud Vision */}
      {activeSection === 'multimodal' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-cyan-700 border-b border-slate-100 pb-3">
            <Eye className="w-4 h-4" />
            <h3 className="text-sm font-bold text-slate-900">谷歌截图识别</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 leading-relaxed">
            <div className="p-4 bg-cyan-50/50 border border-cyan-200 rounded-xl space-y-2">
              <h4 className="font-bold text-cyan-900 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                <span>截图文字与文案一致性</span>
              </h4>
              <p>
                谷歌不仅抓取文本，还会对上传的商店截图和宣传大图做文字识别。
              </p>
              <p className="font-medium text-cyan-950">
                如果截图上的大字标语（例如 <code>OFFLINE PUZZLE</code>, <code>MATCH & BLAST</code>）与短描述/长描述的核心词<strong>高度一致</strong>，算法判定信息置信度极高，会给予额外的相关性提权。
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>视觉防虚假宣传</span>
              </h4>
              <p>
                图像识别能自动识别截图中的实体元素（如方块、纸牌、角色模型）。
              </p>
              <p className="text-slate-600">
                若文本宣称休闲消除，但截图包含违规、欺诈或不相关的美术元素，系统会降低品类匹配置信度甚至阻断推流。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Reviews & Package Name */}
      {activeSection === 'reviews' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-indigo-700">
              <MessageSquare className="w-4 h-4" />
              <h3 className="text-sm font-bold">用户评论与开发者回复索引</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              谷歌会对用户评论进行情感分析与高频词提取，更重要的是：
            </p>
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1.5">
              <span className="font-bold block">实战技巧：</span>
              <p>开发者在后台回复用户好评或差评时，<strong>回复文案中的长尾词会被谷歌实时索引</strong>！在回复中自然带入核心玩法词，可低成本扩大长尾词库覆盖。</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-rose-700">
              <Smartphone className="w-4 h-4" />
              <h3 className="text-sm font-bold">包名（终身强权重）</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              应用的 Android 包名（如 <code>com.company.blockpuzzle.blast</code>）：
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
              <li>包名在 Google Play 算法中拥有<strong>与标题并列的终身权重</strong>。</li>
              <li>包名一旦上线即终身不可更改，在立项规划阶段将核心词融入包名是极其关键的一步。</li>
            </ul>
          </div>
        </div>
      )}

      {/* Section 6: Downstream Conversion & Uninstall Penalty */}
      {activeSection === 'behavior' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-rose-700 border-b border-slate-100 pb-3">
            <BarChart3 className="w-4 h-4" />
            <h3 className="text-sm font-bold text-slate-900">下游转化与次日卸载惩罚</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
              <h4 className="font-bold text-emerald-950 flex items-center space-x-1.5">
                <Flame className="w-4 h-4 text-emerald-600" />
                <span>关键词转化率</span>
              </h4>
              <p className="leading-relaxed text-emerald-900">
                谷歌算法不仅看匹配度，更看<strong>搜索点击率与安装转化率</strong>。若某个词展现量很大但点击率过低，算法会在 72 小时内迅速将该词排名降权。因此，短描述必须是极具吸引力的“高转化诱饵”。
              </p>
            </div>

            <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2">
              <h4 className="font-bold text-rose-950 flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>次日 / 7 日卸载惩罚</span>
              </h4>
              <p className="leading-relaxed text-rose-900">
                谷歌拥有安卓系统的底层监控权限。若用户下载后在 24 小时内迅速卸载，算法会判定为<strong>“虚假宣传与玩法不符”</strong>，直接降权。这就是为什么必须严格坚持<strong>真实玩法、零虚构</strong>。
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
