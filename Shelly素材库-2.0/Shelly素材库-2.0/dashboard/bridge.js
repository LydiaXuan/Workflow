(() => {
  const WORKSPACE_KEY = "asset-library-workspace-v1";
  const ASSET_KEY = "assetLibraryAssets";
  let storedSignature = "";
  let storedAssets = [];
  let pendingSignature = "";
  let persistTimer;

  const normalize = assets => Array.isArray(assets) ? assets : [];
  const signature = assets => JSON.stringify(normalize(assets));

  function writeWorkspace(assets) {
    let existing = {};
    try {
      existing = JSON.parse(localStorage.getItem(WORKSPACE_KEY) || "{}") || {};
    } catch (_) {}
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify({
      ...existing,
      version: 1,
      savedAt: new Date().toISOString(),
      assets: normalize(assets)
    }));
  }

  // The extension store is the source of truth. The dashboard only sends
  // intentional edits back through this function; it never mirrors its cache
  // during startup.
  window.__assetLibraryPersist = assets => {
    const nextAssets = normalize(assets);
    const nextSignature = signature(nextAssets);
    if (nextSignature === storedSignature || nextSignature === pendingSignature) return;
    pendingSignature = nextSignature;
    window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => {
      chrome.runtime.sendMessage({
        type: "SYNC_DASHBOARD_ASSETS",
        payload: { assets: nextAssets, baseAssets: storedAssets }
      }, response => {
        if (chrome.runtime.lastError || !response?.ok) pendingSignature = "";
      });
    }, 180);
  };

  function startDashboard() {
    const script = document.createElement("script");
    script.src = "dashboard.js";
    document.body.append(script);
  }

  chrome.storage.local.get({ [ASSET_KEY]: [] }, result => {
    const assets = normalize(result[ASSET_KEY]);
    storedAssets = assets;
    storedSignature = signature(assets);
    writeWorkspace(assets);
    startDashboard();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[ASSET_KEY]) return;
    const assets = normalize(changes[ASSET_KEY].newValue);
    const nextSignature = signature(assets);
    storedAssets = assets;
    storedSignature = nextSignature;
    if (nextSignature === pendingSignature) {
      pendingSignature = "";
      return;
    }
    writeWorkspace(assets);
    window.location.reload();
  });
})();
