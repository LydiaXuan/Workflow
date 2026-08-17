const ASSET_KEY = "assetLibraryAssets";
const NORMAL_RECORDS_KEY = "assetLibraryCapturedRecords";
const STORE_COLLECTIONS_KEY = "assetLibraryStoreCollections";
const WHITELIST_KEY = "assetLibraryWhitelist";
const COLLECTOR_OWNER = "张璇";
const DEFAULT_WHITELIST = ["pinterest.com", "huaban.com", "play.google.com", "apps.apple.com"];
const MAX_GOOGLE_PLAY_STORE_IMAGES = 8;
const MAX_IOS_STORE_IMAGES = 10;
let storageQueue = Promise.resolve();
let lastStoreCollectionOrder = 0;

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaultWhitelist();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "asset-library-save-image",
      title: "采集到采集库",
      contexts: ["image"]
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "asset-library-save-image" || !info.srcUrl || !tab?.url) return;
  if (!(await isWhitelisted(tab.url))) return;
  const asset = makeAsset({
    type: "inspiration",
    name: fileName(info.srcUrl),
    image: info.srcUrl,
    sourceUrl: tab.url,
    sourceTitle: tab.title || "",
    owner: COLLECTOR_OWNER
  });
  await queueCapture({
    type: "inspiration",
    sourceUrl: tab.url,
    items: [asset]
  }, tab.url);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_STATE") {
    getState().then(sendResponse);
    return true;
  }
  if (message?.type === "ADD_CURRENT_SITE") {
    addWhitelist(message.url || sender.tab?.url || "").then(sendResponse);
    return true;
  }
  if (message?.type === "SAVE_CAPTURE") {
    queueCapture(message.payload, sender.tab?.url || "").then(sendResponse).catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "SYNC_DASHBOARD_ASSETS") {
    queueDashboardSync(message.payload).then(sendResponse).catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "OPEN_DASHBOARD") {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/index.html") });
  }
});

async function getState() {
  const result = await chrome.storage.local.get({ [ASSET_KEY]: [], [NORMAL_RECORDS_KEY]: [], [STORE_COLLECTIONS_KEY]: [], [WHITELIST_KEY]: [] });
  const whitelist = mergeWhitelist(result[WHITELIST_KEY]);
  const assets = Array.isArray(result[ASSET_KEY]) ? result[ASSET_KEY] : [];
  const normalRecords = normalizeNormalRecords(result[NORMAL_RECORDS_KEY], assets);
  const collections = normalizeStoreCollections(result[STORE_COLLECTIONS_KEY], assets);
  return { ok: true, assets: composeAssets(normalRecords, collections), whitelist };
}

async function addWhitelist(url) {
  const host = hostname(url);
  if (!host) return { ok: false, error: "无法识别当前网站" };
  const { whitelist = [] } = await chrome.storage.local.get({ [WHITELIST_KEY]: [] });
  const next = mergeWhitelist([host, ...whitelist]);
  await chrome.storage.local.set({ [WHITELIST_KEY]: next });
  return { ok: true, whitelist: next };
}

async function isWhitelisted(url) {
  const { whitelist = [] } = await chrome.storage.local.get({ [WHITELIST_KEY]: [] });
  const host = hostname(url);
  return mergeWhitelist(whitelist).some(entry => host === entry || host.endsWith(`.${entry}`));
}

async function ensureDefaultWhitelist() {
  const { whitelist = [] } = await chrome.storage.local.get({ [WHITELIST_KEY]: [] });
  const next = mergeWhitelist(whitelist);
  if (next.length !== whitelist.length || next.some(entry => !whitelist.includes(entry))) {
    await chrome.storage.local.set({ [WHITELIST_KEY]: next });
  }
}

function mergeWhitelist(whitelist) {
  return [...new Set([...DEFAULT_WHITELIST, ...(Array.isArray(whitelist) ? whitelist : [])])];
}

function queueStorageOperation(operation) {
  const task = storageQueue.then(operation);
  storageQueue = task.catch(() => {});
  return task;
}

function queueCapture(payload, pageUrl) {
  return queueStorageOperation(() => saveCapture(payload, pageUrl));
}

function queueDashboardSync(payload) {
  return queueStorageOperation(() => syncDashboardAssets(payload));
}

async function saveCapture(payload, pageUrl) {
  if (!payload) return { ok: false, error: "采集内容无效，请刷新页面后重试" };
  const sourceUrl = String(payload.sourceUrl || pageUrl || "");
  const allowed = await isWhitelisted(pageUrl) || await isWhitelisted(sourceUrl);
  if (!allowed) return { ok: false, error: "当前网站未获得采集权限" };
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const type = payload.type || "inspiration";
  // Content scripts cannot always read Google-hosted pixels because of page
  // CORS rules. Do this in the extension worker so both capture entry points
  // remove phone/tablet copies by their actual picture, not just their URL.
  const items = type === "store" ? await dedupeStoreCaptureItems(rawItems) : rawItems;
  if (!items.length) return { ok: false, error: "未识别到可采集的图片" };
  const stored = await chrome.storage.local.get({ [ASSET_KEY]: [], [NORMAL_RECORDS_KEY]: [], [STORE_COLLECTIONS_KEY]: [] });
  const assets = Array.isArray(stored[ASSET_KEY]) ? stored[ASSET_KEY] : [];
  const normalRecords = normalizeNormalRecords(stored[NORMAL_RECORDS_KEY], assets);
  const storeCollections = normalizeStoreCollections(stored[STORE_COLLECTIONS_KEY], assets);
  const cleanedStoreCollections = type === "store"
    ? await cleanupStoreCollectionsForSource(storeCollections, sourceUrl)
    : false;
  const storeMatch = type === "store" ? findMatchingStoreCollection(items, storeCollections, sourceUrl) : null;
  if (storeMatch?.status === "duplicate") {
    if (cleanedStoreCollections) {
      const nextAssets = composeAssets(normalRecords, storeCollections);
      await chrome.storage.local.set({ [ASSET_KEY]: nextAssets, [NORMAL_RECORDS_KEY]: normalRecords, [STORE_COLLECTIONS_KEY]: storeCollections });
    }
    return { ok: true, added: 0, message: "这组商店图已采集" };
  }
  const collectionId = type === "store" ? (storeMatch?.collection.id || createStoreCollectionId(payload.collectionId, storeCollections)) : "";
  const collectionSavedAt = type === "store" ? (storeMatch?.collection.savedAt || new Date().toISOString()) : "";
  const collectionOrder = type === "store" ? (storeMatch?.collection.order || nextStoreCollectionOrder(storeCollections)) : 0;
  // De-duplicate inside a material type only. The same image may legitimately
  // be saved as inspiration first and later as an app icon.
  const keyFor = type === "store" ? storeImageKey : imageKey;
  const currentAssets = composeAssets(normalRecords, storeCollections);
  const existing = type === "store"
    ? new Set((storeMatch?.collection?.assets || []).map(asset => keyFor(asset.image)).filter(Boolean))
    : new Set(currentAssets.filter(asset => asset?.type === type).map(asset => keyFor(asset.image)).filter(Boolean));
  const existingGoogleScreenshotIndexes = type === "store"
    ? new Set((storeMatch?.collection?.assets || [])
      .filter(isGooglePlayStoreScreenshot)
      .map(asset => Number(asset.screenshotIndex))
      .filter(index => Number.isInteger(index) && index >= 0))
    : new Set();
  const additions = [];
  for (const [index, item] of items.entries()) {
    const asset = makeAsset({
      ...item,
      sourceUrl: item.sourceUrl || payload.sourceUrl || pageUrl,
      owner: COLLECTOR_OWNER,
      type,
      collectionId,
      collectionSavedAt,
      collectionOrder,
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index
    }, index);
    const key = keyFor(asset.image);
    if (!key || existing.has(key)) continue;
    const screenshotIndex = Number(asset.screenshotIndex);
    const isIndexedGoogleScreenshot = isGooglePlayStoreScreenshot(asset) && Number.isInteger(screenshotIndex) && screenshotIndex >= 0;
    if (isIndexedGoogleScreenshot && existingGoogleScreenshotIndexes.has(screenshotIndex)) continue;
    existing.add(key);
    if (isIndexedGoogleScreenshot) existingGoogleScreenshotIndexes.add(screenshotIndex);
    additions.push(asset);
  }
  if (!additions.length) {
    const message = type === "store" ? "这组商店图已采集" : type === "icon" ? "这个 Icon 已采集" : "这张图片已采集";
    return { ok: true, added: 0, message };
  }
  let nextAssets;
  if (type === "store") {
    if (storeMatch?.status === "complete") {
      storeMatch.collection.assets.push(...additions);
    } else {
      storeCollections.push({
        id: collectionId,
        savedAt: collectionSavedAt,
        order: collectionOrder,
        assets: additions
      });
    }
    nextAssets = composeAssets(normalRecords, storeCollections);
  } else {
    normalRecords.unshift(...additions);
    nextAssets = composeAssets(normalRecords, storeCollections);
  }
  try {
    await chrome.storage.local.set({ [ASSET_KEY]: nextAssets, [NORMAL_RECORDS_KEY]: normalRecords, [STORE_COLLECTIONS_KEY]: storeCollections });
    const verified = await chrome.storage.local.get({ [ASSET_KEY]: [] });
    const savedAssets = Array.isArray(verified[ASSET_KEY]) ? verified[ASSET_KEY] : [];
    if (!savedAssets.some(asset => additions.some(addition => addition.id === asset.id))) {
      return { ok: false, error: "素材未能写入本地存储，请重新加载扩展后再试" };
    }
    return { ok: true, added: additions.length, total: nextAssets.length };
  } catch (error) {
    return { ok: false, error: `保存失败：${error?.message || "本地存储不可用"}` };
  }
}

function createStoreCollectionId(requestedId, collections) {
  const requested = String(requestedId || "").trim();
  const known = new Set(collections.map(collection => String(collection?.id || "")).filter(Boolean));
  if (requested && !known.has(requested)) return requested;
  let id = "";
  do {
    id = `store-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  } while (known.has(id));
  return id;
}

function storeSourceKey(url) {
  const source = String(url || "").trim();
  if (!source) return "";
  try {
    const parsed = new URL(source);
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    // Google can add locale and tracking parameters to the detail-page URL.
    // The application package is the stable identity for a Play Store listing.
    if (parsed.hostname === "play.google.com" && parsed.pathname === "/store/apps/details") {
      const appId = parsed.searchParams.get("id");
      if (appId) return `play:${appId}`;
    }
    ["hl", "gl", "referrer", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(key => parsed.searchParams.delete(key));
    return parsed.href;
  } catch {
    return source;
  }
}

function findMatchingStoreCollection(items, collections, sourceUrl) {
  const candidateKeys = new Set((Array.isArray(items) ? items : []).map(item => storeImageKey(item?.image)).filter(Boolean));
  if (!candidateKeys.size) return null;
  const candidateSource = storeSourceKey(sourceUrl || items?.[0]?.sourceUrl || items?.[0]?.productUrl);
  if (!candidateSource) return null;
  for (const collection of (Array.isArray(collections) ? collections : [])) {
    const collectionAssets = Array.isArray(collection?.assets) ? collection.assets : [];
    const collectionSource = storeSourceKey(collectionAssets[0]?.sourceUrl || collectionAssets[0]?.productUrl);
    if (collectionSource !== candidateSource) continue;
    const storedKeys = new Set(collectionAssets.map(asset => storeImageKey(asset?.image)).filter(Boolean));
    const sharedCount = [...candidateKeys].filter(key => storedKeys.has(key)).length;
    if (sharedCount === candidateKeys.size) return { status: "duplicate", collection };
    // A retry can expose more of the same screenshot row than the first
    // capture did. Only complete that row when its smaller side substantially
    // overlaps; one shared image must not merge two distinct screenshot sets.
    const smallerSetSize = Math.min(candidateKeys.size, storedKeys.size);
    if (smallerSetSize && sharedCount / smallerSetSize >= .8) return { status: "complete", collection };
  }
  return null;
}

async function cleanupStoreCollectionsForSource(collections, sourceUrl) {
  const source = storeSourceKey(sourceUrl);
  if (!source) return false;
  let changed = false;
  for (const collection of (Array.isArray(collections) ? collections : [])) {
    const assets = Array.isArray(collection?.assets) ? collection.assets : [];
    if (storeSourceKey(assets[0]?.sourceUrl || assets[0]?.productUrl) !== source) continue;
    const unique = await dedupeStoreCaptureItems(assets);
    if (unique.length === assets.length) continue;
    collection.assets = unique.map((asset, index) => ({ ...asset, sortOrder: index }));
    changed = true;
  }
  return changed;
}

function nextStoreCollectionOrder(collections) {
  const latestStoredOrder = Math.max(0, ...(collections || []).map(collection => collectionTime(collection)));
  const next = Math.max(Date.now(), latestStoredOrder + 1, lastStoreCollectionOrder + 1);
  lastStoreCollectionOrder = next;
  return next;
}

async function syncDashboardAssets(payload) {
  const incoming = Array.isArray(payload?.assets) ? payload.assets : null;
  if (!incoming) return { ok: false, error: "看板数据无效" };

  const base = Array.isArray(payload?.baseAssets) ? payload.baseAssets : [];
  const stored = await chrome.storage.local.get({ [ASSET_KEY]: [], [NORMAL_RECORDS_KEY]: [], [STORE_COLLECTIONS_KEY]: [] });
  const current = Array.isArray(stored[ASSET_KEY]) ? stored[ASSET_KEY] : [];
  let normalRecords = normalizeNormalRecords(stored[NORMAL_RECORDS_KEY], current);
  let storeCollections = normalizeStoreCollections(stored[STORE_COLLECTIONS_KEY], current);
  const baseNonStore = base.filter(asset => asset?.type !== "store");
  const incomingNonStore = incoming.filter(asset => asset?.type !== "store");
  const baseById = new Map(baseNonStore.filter(asset => asset?.id).map(asset => [asset.id, asset]));
  const incomingById = new Map(incomingNonStore.filter(asset => asset?.id).map(asset => [asset.id, asset]));
  const deletedIds = new Set([...baseById.keys()].filter(id => !incomingById.has(id)));

  // Inspiration and icon records are also kept independently. A dashboard
  // may still hold an old snapshot while new captures arrive, so only apply
  // deliberate edits/deletions from the dashboard and retain newer records.
  const storedById = new Map(normalRecords.filter(asset => asset?.id).map(asset => [asset.id, asset]));
  normalRecords = normalRecords
    .filter(asset => !deletedIds.has(asset.id))
    .map(asset => {
      const baseline = baseById.get(asset.id);
      const update = incomingById.get(asset.id);
      if (!baseline || !update || JSON.stringify(update) === JSON.stringify(baseline)) return asset;
      return { ...asset, ...update, id: asset.id, type: asset.type };
    });
  const knownNormalIds = new Set(normalRecords.map(asset => asset.id));
  const dashboardOnlyNormalAssets = incomingNonStore.filter(asset => asset?.id && !baseById.has(asset.id) && !storedById.has(asset.id) && !knownNormalIds.has(asset.id));
  if (dashboardOnlyNormalAssets.length) normalRecords.push(...dashboardOnlyNormalAssets);

  // Store collections are kept separately so a stale dashboard snapshot can
  // never replace previously captured screenshot sets.
  const baseStoreById = new Map(base.filter(asset => asset?.type === "store" && asset?.id).map(asset => [asset.id, asset]));
  const incomingStoreById = new Map(incoming.filter(asset => asset?.type === "store" && asset?.id).map(asset => [asset.id, asset]));
  const retainedCollections = [];
  for (const collection of storeCollections) {
    const wasVisible = collection.assets.every(asset => baseStoreById.has(asset.id));
    const wasDeleted = wasVisible && collection.assets.every(asset => !incomingStoreById.has(asset.id));
    if (wasDeleted) continue;
    retainedCollections.push({
      ...collection,
      assets: collection.assets.map(asset => {
        const baseline = baseStoreById.get(asset.id);
        const update = incomingStoreById.get(asset.id);
        if (!baseline || !update || JSON.stringify(update) === JSON.stringify(baseline)) return asset;
        return {
          ...asset,
          ...update,
          type: "store",
          collectionId: collection.id,
          collectionSavedAt: collection.savedAt,
          collectionOrder: collection.order
        };
      })
    });
  }
  storeCollections = retainedCollections;
  const knownStoreIds = new Set(flattenStoreCollections(storeCollections).map(asset => asset.id));
  const dashboardOnlyStoreAssets = incoming.filter(asset => asset?.type === "store" && asset?.id && !baseStoreById.has(asset.id) && !knownStoreIds.has(asset.id));
  if (dashboardOnlyStoreAssets.length) {
    storeCollections.push(...normalizeStoreCollections([], dashboardOnlyStoreAssets));
  }
  const nextAssets = composeAssets(normalRecords, storeCollections);
  await chrome.storage.local.set({ [ASSET_KEY]: nextAssets, [NORMAL_RECORDS_KEY]: normalRecords, [STORE_COLLECTIONS_KEY]: storeCollections });
  return { ok: true, total: nextAssets.length };
}

function storeCollectionKey(asset) {
  if (asset?.collectionId) return String(asset.collectionId);
  const saved = new Date(asset?.collectionSavedAt || asset?.savedAt || 0).getTime();
  const bucket = Number.isFinite(saved) ? Math.floor(saved / 5000) : 0;
  return `legacy:${asset?.sourceUrl || asset?.id || "store"}:${bucket}`;
}

function collectionTime(collection) {
  const order = Number(collection?.order);
  if (Number.isFinite(order) && order > 0) return order;
  const saved = new Date(collection?.savedAt || 0).getTime();
  return Number.isFinite(saved) ? saved : 0;
}

function normalizeStoreCollections(rawCollections, assets) {
  const collections = new Map();
  const attach = (collection, item, index) => {
    if (!item?.id) return;
    const id = String(collection.id || collection.collectionId || storeCollectionKey(item));
    const savedAt = collection.savedAt || collection.collectionSavedAt || item.collectionSavedAt || item.savedAt || new Date().toISOString();
    const order = Number(collection.order || collection.collectionOrder || item.collectionOrder) || new Date(savedAt).getTime() || Date.now();
    const group = collections.get(id) || { id, savedAt, order, assets: [] };
    if (!collections.has(id)) collections.set(id, group);
    if (group.assets.some(asset => asset.id === item.id)) return;
    group.assets.push({
      ...item,
      type: "store",
      collectionId: id,
      collectionSavedAt: savedAt,
      collectionOrder: order,
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index
    });
  };
  if (Array.isArray(rawCollections)) {
    rawCollections.forEach((collection, collectionIndex) => {
      const source = Array.isArray(collection?.assets) ? collection.assets : [];
      source.forEach((item, index) => attach({ ...collection, order: collection?.order || collectionIndex }, item, index));
    });
  }
  const knownIds = new Set([...collections.values()].flatMap(collection => collection.assets.map(asset => asset.id)));
  const legacyGroups = new Map();
  (Array.isArray(assets) ? assets : []).filter(asset => asset?.type === "store" && asset?.id && !knownIds.has(asset.id)).forEach(asset => {
    const id = storeCollectionKey(asset);
    const group = legacyGroups.get(id) || { id, savedAt: asset.collectionSavedAt || asset.savedAt, order: Number(asset.collectionOrder) || new Date(asset.collectionSavedAt || asset.savedAt || 0).getTime(), assets: [] };
    legacyGroups.set(id, group);
    group.assets.push(asset);
  });
  legacyGroups.forEach(group => group.assets.forEach((asset, index) => attach(group, asset, index)));
  return [...collections.values()].map(collection => ({
    ...collection,
    order: collectionTime(collection),
    assets: [...collection.assets].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
  })).sort((a, b) => collectionTime(b) - collectionTime(a));
}

function normalizeNormalRecords(rawRecords, assets) {
  const byId = new Map();
  const add = asset => {
    if (!asset?.id || asset.type === "store" || byId.has(asset.id)) return;
    byId.set(asset.id, asset);
  };
  (Array.isArray(rawRecords) ? rawRecords : []).forEach(add);
  // Migrate captures saved before normal records had their own storage key.
  (Array.isArray(assets) ? assets : []).filter(asset => asset?.type !== "store").forEach(add);
  return [...byId.values()]
    .sort((a, b) => new Date(b?.savedAt || 0) - new Date(a?.savedAt || 0))
    .slice(0, 1200);
}

function flattenStoreCollections(collections) {
  return (Array.isArray(collections) ? collections : []).flatMap(collection => Array.isArray(collection.assets) ? collection.assets : []);
}

function composeAssets(nonStoreAssets, storeCollections) {
  const stores = flattenStoreCollections(storeCollections);
  return [...stores, ...(Array.isArray(nonStoreAssets) ? nonStoreAssets : [])].slice(0, 1200);
}

function imageKey(url) {
  const source = String(url || "").trim();
  if (!source) return "";
  try {
    const parsed = new URL(source);
    parsed.hash = "";
    ["w", "h", "width", "height", "dpr", "quality", "format", "q", "fm", "fit", "resize", "auto", "ixlib"].forEach(key => parsed.searchParams.delete(key));
    if (parsed.hostname.includes("googleusercontent.com")) return parsed.href.replace(/=[^/?#]+$/, "");
    return parsed.href;
  } catch {
    return source;
  }
}

function storeImageKey(url) {
  const source = String(url || "").trim();
  if (!source) return "";
  try {
    const parsed = new URL(source);
    parsed.hash = "";
    const googleBaseId = googleImageBaseId(parsed.href);
    if (googleBaseId) return googleBaseId;
    ["w", "h", "width", "height", "dpr", "quality", "format", "q", "fm", "fit", "resize", "auto", "ixlib"].forEach(key => parsed.searchParams.delete(key));
    parsed.pathname = parsed.pathname
      .replace(/\/(?:\d{2,5})x(?:\d{2,5})(?=\/|$)/g, "/")
      .replace(/([_-])\d{2,5}x\d{2,5}(?=\.[a-z0-9]{2,5}$)/i, "");
    return parsed.href;
  } catch {
    return source;
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
  return baseId ? `${baseId}=s0` : String(url || "");
}

async function dedupeStoreCaptureItems(rawItems) {
  const bestByUrl = new Map();
  const googleScreenshotIndexes = new Set();
  for (const item of rawItems) {
    const screenshotIndex = Number(item?.screenshotIndex);
    if (isGooglePlayStoreScreenshot(item) && Number.isInteger(screenshotIndex) && screenshotIndex >= 0) {
      if (googleScreenshotIndexes.has(screenshotIndex)) continue;
      googleScreenshotIndexes.add(screenshotIndex);
    }
    const image = maxResGoogleImageUrl(item?.image);
    const key = storeImageKey(image);
    if (!key) continue;
    const previous = bestByUrl.get(key);
    const normalizedItem = { ...item, image, ...(Number.isInteger(screenshotIndex) && screenshotIndex >= 0 ? { screenshotIndex, sortOrder: screenshotIndex } : {}) };
    if (!previous || storeCaptureImageScore(image) > storeCaptureImageScore(previous.image)) bestByUrl.set(key, normalizedItem);
  }
  const candidates = [...bestByUrl.values()];
  const fingerprints = [];
  const unique = [];
  for (const item of candidates) {
    if (isGooglePlayStoreScreenshot(item)) {
      try {
        const fingerprint = await googleStoreImageFingerprint(item.image);
        const duplicate = fingerprints.find(existing =>
          existing.kind === "google"
          && areNearlyIdenticalGoogleScreenshots(existing.fingerprint, fingerprint)
        );
        if (duplicate) continue;
        fingerprints.push({ kind: "google", fingerprint, itemIndex: unique.length });
      } catch (_) {
        // Google may temporarily reject a source image. URL de-duplication
        // above remains available, and the image is kept rather than lost.
      }
    } else {
      try {
        const fingerprint = await storeImageFingerprint(item.image);
        const duplicate = fingerprints.find(existing =>
          existing.kind === "generic"
          && existing.fingerprint.orientation === fingerprint.orientation
          && hammingDistance(existing.fingerprint.bits, fingerprint.bits) <= 5
        );
        if (duplicate) {
          if (storeCaptureImageScore(item.image) > storeCaptureImageScore(unique[duplicate.itemIndex].image)) {
            unique[duplicate.itemIndex] = item;
            duplicate.fingerprint = fingerprint;
          }
          continue;
        }
        fingerprints.push({ kind: "generic", fingerprint, itemIndex: unique.length });
      } catch (_) {
        // If a host blocks pixel reads, the normalized URL fallback still keeps
        // responsive variants of the same image out of the capture.
      }
    }
    unique.push(item);
  }
  // Do not crop Google candidates before the strict pixel pass above. Play
  // often places different storage IDs for the same frame before later,
  // genuinely unique screenshots in its carousel. Apply its lower cap only
  // after the comparison, while App Store collections may retain ten images.
  const limit = rawItems.some(item => hostname(item?.sourceUrl || item?.productUrl || "") === "play.google.com")
    ? MAX_GOOGLE_PLAY_STORE_IMAGES
    : MAX_IOS_STORE_IMAGES;
  return unique.slice(0, limit);
}

// Fingerprints are cached by image identity so repeated captures and the
// cleanup pass never refetch the same screenshot. Only successful reads are
// cached; a transient failure is retried the next time the image is seen.
const storeFingerprintCache = new Map();

// Fingerprinting only needs a downscaled copy. Ask Google's image CDN for a
// small, fixed-width render instead of the multi-megabyte =s0 original: the
// fetch is far faster and far less likely to fail. A failed pixel read is
// exactly what previously let carousel clones (same picture, different Base ID
// and screenshot index) slip through as duplicate store screenshots.
function googleFingerprintUrl(url) {
  const baseId = googleImageBaseId(url);
  return baseId ? `${baseId}=w320` : String(url || "");
}

async function fetchImageBitmap(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) throw new Error(`image unavailable (${response.status})`);
      return await createImageBitmap(await response.blob());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("image unavailable");
}

async function googleStoreImageFingerprint(url) {
  const cacheKey = `google:${googleImageBaseId(url) || url}`;
  const cached = storeFingerprintCache.get(cacheKey);
  if (cached) return cached;
  const bitmap = await fetchImageBitmap(googleFingerprintUrl(url));
  try {
    const size = 32;
    const canvas = new OffscreenCanvas(size, size);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size).data;
    const rgb = new Uint8Array(size * size * 3);
    let offset = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      rgb[offset++] = pixels[index];
      rgb[offset++] = pixels[index + 1];
      rgb[offset++] = pixels[index + 2];
    }
    const fingerprint = {
      width: bitmap.width,
      height: bitmap.height,
      orientation: bitmap.width >= bitmap.height ? "landscape" : "portrait",
      rgb
    };
    storeFingerprintCache.set(cacheKey, fingerprint);
    return fingerprint;
  } finally {
    bitmap.close?.();
  }
}

function areNearlyIdenticalGoogleScreenshots(first, second) {
  if (first.orientation !== second.orientation) return false;
  const firstRatio = first.width / first.height;
  const secondRatio = second.width / second.height;
  if (Math.abs(firstRatio - secondRatio) > .03) return false;
  let totalDifference = 0;
  let stronglyDifferentPixels = 0;
  for (let index = 0; index < first.rgb.length; index += 1) {
    const difference = Math.abs(first.rgb[index] - second.rgb[index]);
    totalDifference += difference;
    if (difference > 60) stronglyDifferentPixels += 1;
  }
  const averageDifference = totalDifference / first.rgb.length;
  const stronglyDifferentRatio = stronglyDifferentPixels / first.rgb.length;
  // A carousel clone is the SAME screenshot, just re-encoded from a different
  // storage id: its average difference is nearly zero and only a few edge
  // pixels shift under JPEG recompression. Judge identity by that average
  // instead of a single-pixel maximum, which a lone recompressed edge could
  // trip and so let the clone survive (the reported "1st = 8th" duplicate).
  // Distinct game levels differ across most of the frame, so their average
  // and their share of strongly different pixels both stay far higher.
  return averageDifference <= 4 && stronglyDifferentRatio <= .02;
}

function isGooglePlayStoreScreenshot(item) {
  return hostname(item?.sourceUrl || item?.productUrl || "") === "play.google.com"
    && Boolean(googleImageBaseId(item?.image));
}

function storeCaptureImageScore(url) {
  const match = String(url || "").match(/(?:w|width=)(\d{2,5})[^\d]+(?:h|height=)(\d{2,5})|\b(\d{2,5})x(\d{2,5})\b/i);
  if (!match) return String(url || "").length;
  const width = Number(match[1] || match[3] || 0);
  const height = Number(match[2] || match[4] || 0);
  return width * height || String(url || "").length;
}

async function storeImageFingerprint(url) {
  const cacheKey = `generic:${storeImageKey(url) || url}`;
  const cached = storeFingerprintCache.get(cacheKey);
  if (cached) return cached;
  const bitmap = await fetchImageBitmap(url);
  try {
    const canvas = new OffscreenCanvas(8, 8);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, 8, 8);
    const pixels = context.getImageData(0, 0, 8, 8).data;
    const values = [];
    for (let index = 0; index < pixels.length; index += 4) values.push(pixels[index] * .299 + pixels[index + 1] * .587 + pixels[index + 2] * .114);
    const average = values.reduce((total, value) => total + value, 0) / values.length;
    const fingerprint = {
      orientation: bitmap.width >= bitmap.height ? "landscape" : "portrait",
      bits: values.map(value => value >= average ? "1" : "0").join("")
    };
    storeFingerprintCache.set(cacheKey, fingerprint);
    return fingerprint;
  } finally {
    bitmap.close?.();
  }
}

function hammingDistance(first, second) {
  if (first.length !== second.length) return Infinity;
  let distance = 0;
  for (let index = 0; index < first.length; index += 1) if (first[index] !== second[index]) distance += 1;
  return distance;
}

function makeAsset(raw, index = 0) {
  const now = Date.now() - index;
  return {
    id: crypto.randomUUID(),
    type: ["inspiration", "icon", "store"].includes(raw.type) ? raw.type : "inspiration",
    name: String(raw.name || raw.productName || raw.title || "未命名素材"),
    title: String(raw.title || raw.name || raw.productName || "未命名素材"),
    image: String(raw.image || raw.url || ""),
    sourceUrl: String(raw.sourceUrl || raw.productUrl || ""),
    sourceTitle: String(raw.sourceTitle || ""),
    owner: COLLECTOR_OWNER,
    tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : [],
    favorite: false,
    notes: [],
    savedAt: new Date(now).toISOString(),
    collectionId: raw.collectionId || "",
    collectionSavedAt: raw.collectionSavedAt || "",
    collectionOrder: Number.isFinite(Number(raw.collectionOrder)) ? Number(raw.collectionOrder) : 0,
    ...(Number.isInteger(Number(raw.screenshotIndex)) && Number(raw.screenshotIndex) >= 0 ? { screenshotIndex: Number(raw.screenshotIndex) } : {}),
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : index
  };
}

function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function fileName(url) {
  try { return decodeURIComponent(new URL(url).pathname.split("/").pop() || "网页图片").replace(/\.[^.]+$/, ""); } catch { return "网页图片"; }
}
