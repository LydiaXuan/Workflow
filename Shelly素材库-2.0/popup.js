const $ = selector => document.querySelector(selector);
let activeMode = "inspiration";
let activeTab = null;
let whitelist = [];
const modeMeta = {
  inspiration: ["通用素材采集", "扫描当前页面中的可用图片，最多保存 40 张。"],
  icon: ["Icon 采集", "扫描当前页面中的图标和图片，保存到 Icon 模块。"],
  store: ["商店图采集", "优先识别截图容器并自动去重：Google Play 最多 8 张，App Store 最多 10 张。"]
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  $("#siteHost").textContent = hostname(activeTab?.url) || "当前页面";
  await chrome.storage.local.set({ collectorOwner: "张璇" });
  document.querySelectorAll(".mode").forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));
  $("#allowSite").addEventListener("click", allowCurrentSite);
  $("#capture").addEventListener("click", capture);
  $("#openDashboard").addEventListener("click", () => chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" }));
  await refreshState();
}

function setMode(mode) {
  activeMode = mode;
  document.querySelectorAll(".mode").forEach(button => button.classList.toggle("active", button.dataset.mode === mode));
  $("#modeTitle").textContent = modeMeta[mode][0];
  $("#modeHint").textContent = modeMeta[mode][1];
}

async function refreshState() {
  const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  whitelist = state.whitelist || [];
  const current = hostname(activeTab?.url);
  const allowed = isAllowed(current);
  $("#siteStatus").textContent = allowed ? "已在白名单内，可以采集" : "请先将本站加入白名单";
  $("#allowSite").textContent = allowed ? "已允许" : "加入白名单";
  $("#allowSite").classList.toggle("is-allowed", allowed);
  $("#allowSite").disabled = allowed || !current;
  $("#capture").disabled = !allowed;
  $("#count").textContent = `${whitelist.length} 个站点`;
  $("#whitelistItems").replaceChildren(...whitelist.map(host => whitelistPill(host)));
}

function whitelistPill(host) {
  const pill = document.createElement("span"); pill.className = "host-pill"; pill.textContent = host;
  const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "×"; remove.title = `移除 ${host}`;
  remove.addEventListener("click", async () => { whitelist = whitelist.filter(item => item !== host); await chrome.storage.local.set({ assetLibraryWhitelist: whitelist }); await refreshState(); });
  pill.append(remove); return pill;
}

async function allowCurrentSite() {
  const result = await chrome.runtime.sendMessage({ type: "ADD_CURRENT_SITE", url: activeTab?.url });
  if (!result?.ok) return setStatus(result?.error || "无法加入白名单", true);
  await refreshState(); setStatus("已加入白名单");
}

async function capture() {
  const capture = $("#capture"); capture.disabled = true; setStatus("正在扫描当前页面...");
  try {
    const response = await chrome.tabs.sendMessage(activeTab.id, activeMode === "store" ? { type: "COLLECT_STORE" } : { type: "COLLECT_ASSETS", assetType: activeMode });
    if (!response?.ok) throw new Error("页面暂时无法响应采集请求");
    const items = activeMode === "store" ? await dedupeStoreImages(response.items || []) : (response.items || []);
    const result = await chrome.runtime.sendMessage({ type: "SAVE_CAPTURE", payload: { type: activeMode, owner: "张璇", sourceUrl: response.sourceUrl || activeTab.url, items } });
    if (!result?.ok) throw new Error(result?.error || "保存失败");
    setStatus(result.added ? `已采集 ${result.added} 条素材，已同步至看板` : (result.message || "没有新增素材"));
  } catch (error) { setStatus(error.message || "采集失败", true); }
  await refreshState();
}

function isAllowed(host) { return whitelist.some(entry => host === entry || host.endsWith(`.${entry}`)); }
function hostname(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } }
function setStatus(message, error = false) { const element = $("#status"); element.textContent = message; element.classList.toggle("error", error); }

async function dedupeStoreImages(items) {
  const urlSeen = new Set();
  const googleScreenshotIndexes = new Set();
  const hashes = [];
  const output = [];
  for (const item of items) {
    const image = maxResGoogleImageUrl(item.image);
    const key = normalizedStoreImageKey(image);
    if (!item.image || urlSeen.has(key)) continue;
    const screenshotIndex = Number(item.screenshotIndex);
    const isGoogleScreenshot = isGooglePlayStoreScreenshot(item, image);
    if (isGoogleScreenshot && Number.isInteger(screenshotIndex) && screenshotIndex >= 0) {
      if (googleScreenshotIndexes.has(screenshotIndex)) continue;
      googleScreenshotIndexes.add(screenshotIndex);
    }
    urlSeen.add(key);
    if (!isGoogleScreenshot) {
      try {
        const hash = await visualHash(image);
        if (hashes.some(existing => existing.orientation === hash.orientation && hammingDistance(existing.bits, hash.bits) <= 5)) continue;
        hashes.push(hash);
      } catch (_) {
        // URL de-duplication still protects the capture when an image host blocks reads.
      }
    }
    output.push({ ...item, image, ...(Number.isInteger(screenshotIndex) && screenshotIndex >= 0 ? { screenshotIndex, sortOrder: screenshotIndex } : {}) });
  }
  // The worker performs strict pixel comparison for Google Play and only then
  // limits a set to eight screenshots, so later unique frames are never lost.
  return hostname(activeTab?.url || "") === "play.google.com"
    ? output.slice(0, 24)
    : output.slice(0, 10);
}

function isGooglePlayStoreScreenshot(item, image) {
  return hostname(item?.sourceUrl || item?.productUrl || activeTab?.url || "") === "play.google.com"
    && Boolean(googleImageBaseId(image));
}

function normalizedStoreImageKey(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    const baseId = googleImageBaseId(parsed.href);
    if (baseId) return baseId;
    ["w", "h", "width", "height", "dpr", "quality", "format", "q", "fm", "fit", "resize", "auto", "ixlib"].forEach(key => parsed.searchParams.delete(key));
    parsed.pathname = parsed.pathname
      .replace(/\/(?:\d{2,5})x(?:\d{2,5})(?=\/|$)/g, "/")
      .replace(/([_-])\d{2,5}x\d{2,5}(?=\.[a-z0-9]{2,5}$)/i, "");
    return parsed.href;
  } catch {
    return url;
  }
}

function googleImageBaseId(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("googleusercontent.com")) return "";
    const separator = parsed.href.indexOf("=");
    return separator > 0 ? parsed.href.slice(0, separator) : parsed.href;
  } catch {
    return "";
  }
}

function maxResGoogleImageUrl(url) {
  const baseId = googleImageBaseId(url);
  return baseId ? `${baseId}=s0` : url;
}

async function visualHash(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("image unavailable");
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement("canvas");
  canvas.width = 8; canvas.height = 8;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0, 8, 8);
  bitmap.close?.();
  const pixels = context.getImageData(0, 0, 8, 8).data;
  const values = [];
  const orientation = bitmap.width >= bitmap.height ? "landscape" : "portrait";
  for (let index = 0; index < pixels.length; index += 4) values.push(pixels[index] * .299 + pixels[index + 1] * .587 + pixels[index + 2] * .114);
  const average = values.reduce((total, value) => total + value, 0) / values.length;
  return {
    orientation,
    bits: values.map(value => value >= average ? "1" : "0").join("")
  };
}

function hammingDistance(first, second) {
  if (first.length !== second.length) return Infinity;
  let distance = 0;
  for (let index = 0; index < first.length; index += 1) if (first[index] !== second[index]) distance += 1;
  return distance;
}
