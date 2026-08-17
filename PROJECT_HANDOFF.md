# Shelly 素材库 2.0：项目备忘与续作说明（合并版）

> 目的：这是后续继续维护本项目时的**第一阅读文件**。优先以这里记录的现状、约束和已踩问题为准，不需要回看聊天上下文。
>
> 本文件由两份历史交接文档合并而成，并追加了 2.0.47–2.0.50 的修复记录。继续本项目时，先读本文件，再读对应实现文件；不要只根据聊天截图猜测逻辑。

---

## 0. 交付位置与打包约定（重要）

### 当前 Git 仓库结构（本会话已重整）

- 仓库：`LydiaXuan/Workflow`，开发分支：`claude/product-scrape-duplicate-images-otvqjw`。
- **仓库根目录本身就是可加载的扩展**（`manifest.json` 在最外层），便于用户在 GitHub 点 **Code → Download ZIP** 后解压即用：解压得到的文件夹直接就是 Chrome/Edge 扩展。
- 因此仓库中**不再保留**打包好的 `Shelly素材库-2.0.zip`，也**不再保留**旧的嵌套副本文件夹 `Shelly素材库-2.0/`——GitHub 下载时会自行打包，仓库内再放 zip 只会让下载包变大、造成混淆。
- 仓库根目录只应有扩展文件：`manifest.json`、`background.js`、`content.js`、`popup.*`、`dashboard/`、`icons/`、以及本 `PROJECT_HANDOFF.md`。

### 用户本地（Windows）历史工作目录约定（供参考）

- 历史项目根目录：`...\outputs\Shelly素材库-2.0`
- 历史固定交付包：`...\outputs\Shelly素材库-2.0.zip`（覆盖式，不带版本号）
- 历史项目根目录曾包含一个嵌套旧副本 `Shelly素材库-2.0\Shelly素材库-2.0`；在用户本地工作流里，涉及扩展逻辑时根目录与嵌套副本都要同步更新。**注意：这条只适用于用户本地目录；本 Git 仓库已取消嵌套副本，只维护根目录一份。**

### 版本号约定

- 每次重新打包/升级，必须同步提高 `manifest.json` 的 `version`，方便用户确认加载的是新版本。
- 当前 `manifest.json` 版本：**2.0.50**。当前插件名为 `Shelly素材库`。

---

## 1. 项目目标与界面约束

这是一个浏览器素材采集插件加内置看板。用户已经大量调过看板视觉与交互，后续功能修复**不应随意改变已有界面布局、颜色、按钮位置和交互风格**。

看板主要包含：

1. `灵感发现`：通用网页单图素材。
2. `Icon`：应用 Icon 或其他图标素材。
3. `商店图`：以“一个应用的一组截图”为一行的集合展示。
4. `概览`：统计、标签热度、来源分布、近期收集的灵感发现素材。

已确定的设计/功能偏好：

- 顶部栏固定，滚动内容时不随页面上划。
- 当前采集人暂时固定为 `张璇`，后续接登录/绑定系统后再改为当前登录用户；不要擅自恢复多人选择。
- 每一类素材有独立标签库；标签可以筛选、编辑、新建；不同页面的标签不应混用。
- 图片支持放大浏览；大图查看时可用键盘左右方向键切换上一张/下一张。
- 删除素材、删除笔记需要二次确认；笔记最终应只允许删除自己的记录。
- 图片的下载图标统一是“向下箭头 + 横线”的形式。
- 收藏心形只在图片右上角悬停出现，不放在顶部筛选区。

---

## 2. 代码模块职责

### 扩展采集端

| 文件 | 职责 |
| --- | --- |
| `background.js` | 唯一数据源、写入队列、白名单、采集保存、跨批次去重、商店图套图分组、看板编辑同步、商店图像素级视觉去重。|
| `content.js` | 注入网页的悬浮 `+` 单图采集按钮、商店图“采集商店图”按钮、页面图片/截图/Icon 识别。|
| `popup.js` | 插件弹窗：切换灵感/Icon/商店图采集模式，触发采集、显示白名单和打开内置看板。|
| `popup.html` / `popup.css` | 插件弹窗 UI。|
| `manifest.json` | MV3 配置、`<all_urls>` 内容脚本和 host 权限。|

### 看板端

| 文件 | 职责 |
| --- | --- |
| `dashboard/index.html` | 当前看板结构与样式。不要用早期独立的 `outputs/index.html` 替代插件内置看板。|
| `dashboard/dashboard.js` | 看板渲染、筛选、标签、笔记、收藏、删除、分组商店图展示、查看大图。|
| `dashboard/bridge.js` | 插件存储和看板 `localStorage` 的桥接。扩展存储是唯一事实源。|

---

## 3. 数据存储和同步链路（非常重要）

### Chrome 扩展存储键

`background.js` 中定义：

- `assetLibraryAssets`：面板读取的扁平资产快照。
- `assetLibraryCapturedRecords`：灵感发现和 Icon 的主记录。
- `assetLibraryStoreCollections`：商店图的主集合记录。一套图是一个 collection，collection 内有多张 asset。
- `assetLibraryWhitelist`：用户自行添加的白名单；默认白名单会合并，不应被移除。

默认白名单：`pinterest.com`、`huaban.com`、`play.google.com`、`apps.apple.com`。

### 数据流

1. `content.js` 或 `popup.js` 发 `SAVE_CAPTURE`。
2. `background.js` 的 `queueCapture()` 串行执行 `saveCapture()`，避免多次写入互相覆盖。
3. `background.js` 写入三个主存储键，同时更新 `assetLibraryAssets` 快照。
4. `dashboard/bridge.js` 监听 `assetLibraryAssets`，写入本页 `localStorage` 后刷新看板。
5. 看板编辑（标签、笔记、收藏、删除）经 `window.__assetLibraryPersist()` 发送 `SYNC_DASHBOARD_ASSETS` 回到 `background.js`。

### 重要结论

- **采集不应该依赖看板页面处于打开状态。** 看板关闭也必须可写入 `chrome.storage.local`；下次打开看板应读取全部历史数据。
- 同一扩展 ID 下“重新加载扩展”通常保留 `chrome.storage.local`；卸载扩展、切换扩展 ID 或用户主动清空扩展数据会导致数据不可见。升级前建议使用看板导出功能备份。
- `dashboard/index.html` 的 `localStorage` 只是缓存/桥接层，不是可靠主库。不要修到只更新 `localStorage`，否则会出现“页面看起来更新、重开后丢失”的问题。
- 单独用文件方式打开旧 `index.html` 与打开 `chrome-extension://.../dashboard/index.html` 不共享扩展存储；用户之前已遇到“采集成功但另一个看板看不到”的困惑。

---

## 4. 各类采集的预期逻辑

### 灵感发现

- 目标：普通网页图片、Pinterest、花瓣等来源的单图采集。
- 入口：图片悬浮时左下角的 `+`；右键菜单也可采集当前图片；插件弹窗的“素材”模式也可扫描页面。
- 不应跳转商店。
- 重复规则：同类型、同一图片标准化 URL 不重复；相同图可以和 Icon/商店图作为不同类型存在。

### Icon

- Google Play、App Store 的应用 Icon 应自动判定为 `icon`，进入 Icon 界面，而不是灵感发现。
- Google Play 的方形单图快采应走 `icon_records`/Icon 类型，而不是普通单图逻辑。
- 目标小图应尽可能请求/保存到约 512 尺寸，避免只收藏缩略图。
- Google Play 的游戏页、分类页、聚类页（如 `/store/games`、`/store/apps/collection/...`）中出现的应用 Icon 也需要可采集；卡片中的推广/活动图不应被误当 Icon。
- Icon 页面也要支持放大查看。

### 商店图

- 入口 1：页面截图区域旁的“采集商店图”按钮，采集一整套。
- 入口 2：左下角 `+` 仍保留，用于用户只采集单张图片；不能因为有整套采集而移除。
- 应覆盖 Google Play 和 App Store。
- **数量上限：Google Play 最多 8 张；iOS / App Store 及其他商店最多 10 张。** Google Play 可以正常采集 5、6、7 或 8 张，不要求固定数量；去重前会保留额外候选图，避免去重后不足，最终仍严格截断为最多 8 张。
- 页面里可有手机、平板、横竖屏等多个尺寸/版本；同一实际截图应只保留一张，以较清晰的版本为优先。
- 商店图看板展示：一套图为一行，倒序（最新在上）；列是序号、采集日期、图片轨道、操作。图片最多直接显示若干张，超出可横向滚动。
- 每套图操作包含：跳转商店、下载、标签、笔记、删除。跳转商店必须能打开该应用的详情页。

---

## 5. 商店图去重现状（当前防线）

按数据流顺序，商店图会经过多层去重：

1. `content.js::storeUnique()`：URL 标准化（Google 图片按 `=` 前的 Base ID）后同 key 只留一个，取分辨率评分较高者。
2. `content.js::googlePlayStoreImages()`：Google Play 专用路径。只读取所选画廊内 `img[data-screenshot-index]`，按 `screenshotIndex` 每个序号保留首个节点，序号排序后输出，并把 `screenshotIndex` 传入采集记录。
3. `content.js::googlePlayScreenshotGallery()`：从多个 `.aoJE7e.qwPPwf[role="list"]` 中选出“序号从 0 开始且连续最长”的真实画廊，避免把轮播克隆和设备变体混进来。
4. `popup.js`：弹窗转交前按标准 URL 和 `screenshotIndex` 再去重。
5. `background.js::dedupeStoreCaptureItems()`：后台最终去重。先按 `screenshotIndex` 和标准 URL（Base ID）去重，再做**像素级视觉去重**，最后按上限截断（Google 8 / iOS 10）。
6. `background.js::cleanupStoreCollectionsForSource()`：新采集前清洗该来源已有集合中的重复项。
7. `background.js::findMatchingStoreCollection()`：同来源集合，仅当较小集合有 **≥ 80% 重合**才判为同一套并补图/判重；单张重合不再合并两套不同的截图。
8. `queueStorageOperation()`：所有保存与看板同步串行，减少并发写覆盖。

### 商店图视觉去重实现（当前关键逻辑）

- `background.js::googleStoreImageFingerprint()`：向 Google 图片 CDN 请求 **`=w320` 小图**（不是几 MB 的 `=s0` 原图）计算指纹；`fetchImageBitmap()` 带最多 3 次重试；`storeFingerprintCache` 缓存成功结果，失败不缓存。
- 指纹包含：32×32 RGB 数组 + **dHash（17×16 灰度相邻差值哈希，256 位）**。
- `background.js::areNearlyIdenticalGoogleScreenshots()`：判定两张 Google 截图是否为同一帧的判据（**基于真实日志数据**）：
  - 朝向相同、宽高比差 ≤ 0.05；
  - **`dHash 汉明距离 ≤ 40` 且 `RGB 平均差 ≤ 20`**，两个信号同时满足才判为重复。
- 非 Google（App Store 等）走 `storeImageFingerprint()`（8×8 均值哈希，汉明 ≤ 5）。

---

## 6. 不能回退的已知用户要求

- 默认白名单必须内置 Pinterest、花瓣、Google Play、App Store；用户不希望每次插件升级重新手动加白。
- 内容脚本目前是 `matches: ["<all_urls>"]`，权限可由内部白名单逻辑控制；不要缩成只匹配几个站点，否则会再出现“Pinterest 没有采集按钮”。
- Google Play 的普通列表/集合页面也要允许 Icon 采集；不要只针对详情页。
- Google Play 的活动图需要能作为素材采集，但不要误作为 App Icon 或商店截图。
- 商店图的整套采集和单图 `+` 是两个独立入口，都必须保留。
- 更新插件不应清空历史内容；不要更改存储键名，也不要在安装/更新事件中清空 `chrome.storage.local`。
- 所有看板动作（删除、笔记、标签、收藏）需要同步回扩展存储，不能只改页面缓存。
- **商店图数量上限：Google Play 8 张、iOS 10 张，且不得用“按候选总数整除设备组”这种基于数量的裁剪；只能按同 Base ID / 同序号 / 视觉重复来删。**

---

## 7. 验证与发版清单

1. 对修改过的 JS 运行语法检查（`node --check`）。
2. 加载仓库根目录到浏览器开发者模式，执行“重新加载”，确认版本号已更新。
3. 测试：Pinterest 单图、花瓣单图、Google Play 列表 Icon、Google Play 详情 Icon、Google Play 商店图套图、App Store 商店图套图。
4. 每项至少连续采集 2–3 次，确认：无重复、无覆盖、重复采集有明确提示、看板刷新后仍存在；商店图编号为 01/02/03 而不是最后一套覆盖。
5. 测试看板关闭时采集与重开后显示。
6. 测试删除、笔记、收藏、标签后再刷新，看板历史没有回退。
7. 更新 `manifest.json` 版本号。
8. 提交并推送到开发分支。用户通过 GitHub Download ZIP 获取，解压根目录文件夹即为可加载扩展。

---

## 8. 常用代码定位

- 保存采集入口：`background.js::saveCapture()`
- 商店套图匹配：`background.js::findMatchingStoreCollection()`（≥80% 重合才合并）
- 商店 URL / Base ID 去重：`background.js::storeImageKey()`、`googleImageBaseId()`
- 商店最终去重：`background.js::dedupeStoreCaptureItems()`
- 商店视觉去重与判据：`background.js::googleStoreImageFingerprint()`、`dhashFromBitmap()`、`areNearlyIdenticalGoogleScreenshots()`、`storeImageFingerprint()`
- 商店截图 DOM 识别：`content.js::storeContainers()`、`googlePlayScreenshotGallery()`、`googlePlayStoreImages()`、`isLikelyStoreScreenshot()`
- Google Play Icon 判定：`content.js::isGooglePlayIconTarget()`（及相邻 `isAppIconTarget()`）
- 悬浮 `+` 位置适配：`content.js` 中 `positionHoverButton()` 及附近尺寸逻辑。
- 看板商店分组：`dashboard/dashboard.js::storeGroupKey()`、`groupStoreAssets()`
- 看板与扩展同步：`dashboard/bridge.js`

---

## 9. 修复历史（版本记录）

### 2.0.40 — Google Play Base ID 去重

- Google Play 商店图先以 `=` 前的 Base ID 去重，统一保存为 `=s0` 高清地址。

### 2.0.41 — Google Play 画廊结构识别

- 复现页：`https://play.google.com/store/apps/details?id=com.vnstart.ring.rotate.puzzle`。
- 不要用候选图片总数推断设备组（旧的 `trimGoogleDeviceClusters()` 会把 10 张误裁成 4 张）。
- 真实画廊是 `.aoJE7e.qwPPwf[role="list"]`，截图节点带 `img[data-screenshot-index]`；选“从 0 开始且连续序号最长”的那个列表。
- 该页当时有 19 个截图 DOM 节点、12 个唯一 Base ID，轮播在序号 12–18 处重复。按画廊顺序保留每个 Base ID 首次出现，再套 10 张上限。
- 集合匹配要求较小截图集 ≥ 80% 重合才扩充已有行；单张重合不再合并。

### 2.0.44 — Google Play 首尾重复（screenshotIndex 防重）

- 现象：一组 Google Play 商店图第 1 张与第 8 张相同（轮播克隆图在像素比对请求失败时仍被保存）。
- 在 `content.js` 按 `data-screenshot-index` 选每个真实序号首个节点，并将 `screenshotIndex` 传入采集记录。
- 在 `popup.js`/`background.js` 按该序号防重；后台把序号持久化到素材，补采/合并旧集合时继续拦截重复序号。
- 保留 URL、像素比较与数量上限作为额外防线；Google Play 不为凑满 8 张而补位。

### 2.0.45–2.0.46 — 看板刷新状态修复

- 修复自动刷新后内容仍是“商店图”、顶部却错误高亮“灵感发现”的问题。
- 在 `dashboard/dashboard.js::render()` 中按 `state.type` 同步顶部类型按钮选中态。

### 2.0.47 — 视觉去重抓取可靠性（本会话）

- 根因方向：轮播克隆图（视觉相同，但 Base ID 与 screenshotIndex 都不同）只能靠像素比对识别；而后台用 `fetch()` 抓 `=s0` 原图算指纹，一旦 CORS/网络/超时失败，`catch` 会**静默保留**克隆图。
- 修复：指纹改抓 Google CDN 的 `=w320` 小图（更快更稳）；`fetchImageBitmap()` 加最多 3 次重试；新增 `storeFingerprintCache` 缓存成功指纹（失败不缓存）。
- 同时把仓库整理为“根目录即扩展”，移除仓库内多余的 zip 与嵌套副本。

### 2.0.48 — 去掉脆弱的单像素上限（本会话）

- 原 `areNearlyIdenticalGoogleScreenshots()` 要求 `maxDifference <= 32`：克隆图经重编码后，任一高对比边缘像素差值超过 32 即被判为“不同”而漏判。
- 改为以平均差为主判据，去掉单像素上限；宽高比容差 0.01→0.03。

### 2.0.49 — dHash 双信号 + 诊断日志（本会话）

- 指纹新增 **dHash**（17×16 灰度相邻差值哈希，256 位），对重编码/缩放鲁棒、对不同关卡区分度高。
- 判据改为双信号；`fetch` 指纹失败改为 `console.warn` 输出（不再静默），每次比对 `console.info` 输出 dHash、avgDiff 与结论，便于在 Service Worker 控制台定位。

### 2.0.50 — 用真实日志数据校准阈值（本会话，当前版本）

- **真机日志证明后台抓取与比对均正常，问题纯粹是阈值过紧。**
- 实测数据分两簇，界限清晰：
  - **克隆图（应删）**：`dHash 7–32` / `avgDiff 1–14`；
  - **不同关卡（应留）**：`dHash ≥ 79` / `avgDiff ≥ 37`。
- 原阈值 `dHash≤12 或 avgDiff≤4` 落在克隆簇下方，`dHash=22/32、avgDiff=9~14` 的克隆图漏判。
- 改为 **`dHash ≤ 40 且 avgDiff ≤ 20`**（落在 32 与 79 之间的安全空档），且要求两信号同时满足，避免单一指标噪声误合并不同截图。
- 复现页仍是 `com.vnstart.ring.rotate.puzzle`。

---

## 10. 下一次继续时的建议

1. **优先看 Service Worker 控制台的 `[Shelly]` 日志**再动阈值——本项目已证明“先记录真实数据、再改阈值”远比盲调有效。日志格式：`[Shelly] Play screenshot compare dHash=.. avgDiff=.. -> DUPLICATE/keep`；抓取失败会打 `[Shelly] Play screenshot fingerprint failed ...`。
2. 若确认稳定，可把这些 `console.info/warn` 调试日志降级或移除，出干净正式版（记得升版本号）。
3. 若换一个应用又出现漏判/误删，先取该页日志，看漏网克隆图与最近“不同截图”的 dHash/avgDiff 落点，再在两簇空档内微调阈值；不要凭直觉改。
4. 若某天日志出现 `fingerprint failed`（抓取失败），说明后台 `fetch` 在该环境不可用，届时需要改为**内容脚本侧**（网页已加载像素，用 `crossOrigin` 重新加载后 canvas 取像素）计算指纹并随 item 传给后台的兜底方案——注意这需要把 `content.js` 的 `COLLECT_STORE` 采集链路改成异步。
5. 三类素材连续保存与看板同步的回归，按第 7 节清单跑。

---

## 11. 本文件维护规则

- 每次解决一个真实采集/存储问题，更新“当前防线”“修复历史”与“验证清单”中的结果。
- 每次出现新的数据丢失、覆盖、重复、站点识别失败，都在这里补充：最小复现网址/页面类型、观察到的结果（尽量附真实日志数值）、根因和修复版本。
- 需要继续本项目时，先读本文件，再读对应实现文件。
