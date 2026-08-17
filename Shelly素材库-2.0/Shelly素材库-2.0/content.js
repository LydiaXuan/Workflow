(() => {
  if (window.__assetLibraryCollectorLoaded) return;
  window.__assetLibraryCollectorLoaded = true;

  const MIN_SIZE = 40;
  const MAX_IOS_STORE_IMAGES = 10;
  const MAX_GOOGLE_PLAY_STORE_IMAGES = 8;
  const HOVER_MIN_SIZE = 48;
  const COLLECTOR_OWNER = "张璇";
  const DEFAULT_WHITELIST = ["pinterest.com", "huaban.com", "play.google.com", "apps.apple.com"];
  let hoverHost = null;
  let hoverButton = null;
  let hoverTarget = null;
  let hoverEnabled = false;
  let pointerFrame = null;
  let lastPointer = { x: 0, y: 0 };
  let storeHost = null;
  let storeButton = null;
  let storeAnchor = null;
  let storeObserver = null;
  let captureNoticeHost = null;
  let captureNoticeTimer = null;

  const valid = url => /^https?:|^blob:|^data:image\//.test(String(url || ""));
  const absolute = url => {
    try {
      const parsed = new URL(url, location.href);
      return valid(parsed.href) ? parsed.href : "";
    } catch {
      return "";
    }
  };

  function imageFromElement(element) {
    if (!element) return "";
    const source = element.currentSrc || element.src || element.getAttribute("data-src") || element.getAttribute("data-lazy-src") || element.getAttribute("data-pin-media") || "";
    return absolute(source);
  }

  function bestImageFromElement(element) {
    if (!element) return "";
    const candidates = [];
    for (const attribute of ["srcset", "data-srcset", "data-lazy-srcset"]) {
      const value = element.getAttribute(attribute) || "";
      for (const entry of value.split(",")) {
        const [url, descriptor = ""] = entry.trim().split(/\s+/);
        const width = Number(descriptor.match(/^(\d+)w$/)?.[1] || 0);
        const density = Number(descriptor.match(/^(\d+(?:\.\d+)?)x$/)?.[1] || 0);
        if (url) candidates.push({ url, score: width || density * 1000 });
      }
    }
    for (const attribute of ["data-original", "data-src", "data-lazy-src", "data-full", "data-full-src", "data-image-url"]) {
      const url = element.getAttribute(attribute);
      if (url) candidates.push({ url, score: 0 });
    }
    candidates.push({ url: element.currentSrc || element.src || element.getAttribute("src") || "", score: 0 });
    candidates.sort((first, second) => second.score - first.score);
    return candidates.map(candidate => absolute(candidate.url)).find(Boolean) || "";
  }

  function backgroundImage(element) {
    const value = getComputedStyle(element).backgroundImage || "";
    const match = value.match(/url\(["']?(.*?)["']?\)/);
    return match ? absolute(match[1]) : "";
  }

  function isLargeEnough(element) {
    const rect = element.getBoundingClientRect();
    return rect.width >= MIN_SIZE && rect.height >= MIN_SIZE;
  }

  function unique(items, limit = 40) {
    const seen = new Set();
    return items.filter(item => {
      if (!item.image || seen.has(item.image)) return false;
      seen.add(item.image);
      return true;
    }).slice(0, limit);
  }

  function upscaleGooglePlayIconUrl(url) {
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.includes("googleusercontent.com")) return url;
      return parsed.href.replace(/=s\d+([^/?#]*)$/, "=s512$1");
    } catch {
      return url;
    }
  }

  function genericImages(type) {
    const imageUrl = image => {
      const url = imageFromElement(image);
      return type === "icon" && location.hostname === "play.google.com" ? upscaleGooglePlayIconUrl(url) : url;
    };
    const images = [...document.images]
      .filter(image => image.naturalWidth >= MIN_SIZE && image.naturalHeight >= MIN_SIZE && isLargeEnough(image))
      .map((image, index) => ({
        type,
        image: imageUrl(image),
        name: image.alt || image.title || `${document.title || "Web asset"} ${index + 1}`,
        title: image.alt || image.title || document.title || "Web asset",
        sourceUrl: location.href,
        tags: []
      }));
    const backgrounds = [...document.querySelectorAll("[style*='background'], [class]")]
      .filter(isLargeEnough)
      .map((element, index) => ({
        type,
        image: backgroundImage(element),
        name: `${document.title || "Web asset"} background ${index + 1}`,
        title: document.title || "Web asset",
        sourceUrl: location.href,
        tags: []
      }));
    return unique([...images, ...backgrounds]);
  }

  function storeImageKey(url) {
    try {
      const parsed = new URL(url);
      parsed.hash = "";
      const googleBaseId = googleImageBaseId(parsed.href);
      if (googleBaseId) return googleBaseId;
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

  function maxResGooglePlayImageUrl(url) {
    const baseId = googleImageBaseId(url);
    return baseId ? `${baseId}=s0` : url;
  }

  function storeUnique(items) {
    const bestByKey = new Map();
    for (const item of items) {
      const key = storeImageKey(item.image);
      if (!item.image) continue;
      const previous = bestByKey.get(key);
      if (!previous || storeImageScore(item.image) > storeImageScore(previous.image)) bestByKey.set(key, item);
    }
    // Keep extra Play candidates only until the worker can compare their
    // pixels. The stored collection is capped there at eight screenshots.
    const unique = [...bestByKey.values()];
    return location.hostname === "play.google.com"
      ? unique.slice(0, MAX_GOOGLE_PLAY_STORE_IMAGES * 3)
      : unique.slice(0, MAX_IOS_STORE_IMAGES);
  }

  function storeImageScore(url) {
    const dimensions = String(url || "").match(/(?:w|width=)(\d{2,5})[^\d]+(?:h|height=)(\d{2,5})|\b(\d{2,5})x(\d{2,5})\b/i);
    if (!dimensions) return String(url || "").length;
    const width = Number(dimensions[1] || dimensions[3] || 0);
    const height = Number(dimensions[2] || dimensions[4] || 0);
    return width * height || String(url || "").length;
  }

  function productInfo() {
    const normalizeProductUrl = url => {
      const normalized = absolute(url);
      if (!normalized) return location.href;
      try {
        const parsed = new URL(normalized);
        if (parsed.hostname === "play.google.com") parsed.searchParams.set("hl", "en_US");
        return parsed.href;
      } catch {
        return normalized;
      }
    };
    if (location.hostname === "play.google.com") {
      const name = document.querySelector('span.AfwdI[itemprop="name"], div.Fd93Bb.ynrBgc.xwcR9d')?.textContent?.trim();
      const productUrl = document.querySelector('meta[name="twitter:url"]')?.content || location.href;
      return { name: (name || document.title || "Store image").slice(0, 80), productUrl: normalizeProductUrl(productUrl) };
    }
    const detailLinks = [...document.querySelectorAll("a[href]")];
    const appLink = detailLinks.find(link => /apps\.apple\.com\/.*\/app\/id|play\.google\.com\/store\/apps\/details|\/googleplay-app\//.test(link.href));
    const name = document.querySelector("[data-v-2c46ea82].ellip.font-600, .ellip.font-600[data-v-2c46ea82], h1")?.textContent?.trim();
    const meta = document.querySelector("meta[property='og:title'], meta[name='twitter:title']")?.content;
    return { name: (name || meta || document.title || "Store image").trim().slice(0, 80), productUrl: normalizeProductUrl(appLink?.href || location.href) };
  }

  function storeContainers() {
    if (location.hostname === "play.google.com") {
      const gallery = googlePlayScreenshotGallery();
      if (gallery) return [gallery];
    }
    const selectors = [
      'div[jscontroller="RQJprf"].Atcj9b',
      'we-screenshot-viewer',
      'we-screenshot',
      '.screen-list',
      '[class*="screen-list"]',
      '[class*="screenshot"]',
      '[class*="screen-shot"]',
      '[data-testid*="screenshot"]',
      '[data-test*="screenshot"]',
      '[aria-label*="screenshot" i]'
    ];
    const containers = [...new Set(document.querySelectorAll(selectors.join(",")))];
    // A gallery often matches both its outer list and each nested screenshot.
    // Read only the outermost containers so one screenshot does not enter twice.
    if (containers.length) return containers.filter(container => !containers.some(other => other !== container && other.contains(container)));

    // Google Play periodically changes the gallery markup. Its screenshot URLs
    // stay stable, so use the visible large gallery images as a fallback.
    if (location.hostname === "play.google.com") {
      return [...document.images].filter(image => isLikelyStoreScreenshot(image));
    }
    return [];
  }

  function googlePlayScreenshotGallery() {
    const galleries = [...document.querySelectorAll('.aoJE7e.qwPPwf[role="list"]')]
      .map((container, order) => {
        const images = [...container.querySelectorAll('img[data-screenshot-index]')];
        const indexes = images.map(image => Number(image.dataset.screenshotIndex));
        const startsAtZero = indexes[0] === 0;
        let consecutive = 0;
        while (indexes[consecutive] === consecutive) consecutive += 1;
        return { container, order, images, startsAtZero, consecutive };
      })
      .filter(gallery => gallery.images.length);
    if (!galleries.length) return null;

    // The Play Store's real gallery is the list whose screenshot indexes begin
    // at zero and continue longest. Do not treat each .Atcj9b image wrapper as
    // a gallery: doing so mixes carousel clones and device variants together.
    galleries.sort((first, second) => (
      Number(second.startsAtZero) - Number(first.startsAtZero)
      || second.consecutive - first.consecutive
      || second.images.length - first.images.length
      || first.order - second.order
    ));
    return galleries[0].container;
  }

  function isLikelyStoreScreenshot(element) {
    if (location.hostname === "play.google.com" && isGooglePlayEventOfferElement(element)) return false;
    const source = bestImageFromElement(element);
    if (!source) return false;
    const rect = element.getBoundingClientRect();
    const width = element.naturalWidth || element.width || rect.width;
    const height = element.naturalHeight || element.height || rect.height;
    if (width < 120 || height < 120 || rect.width < 80 || rect.height < 80) return false;
    const ratio = width / height;
    const urlLooksLikeScreenshot = /screenshot|screen.?shot|w\d+-h\d+|=rw|=w\d+/i.test(source);
    // Main app icons are normally square and small; this keeps the gallery
    // fallback from saving the app logo together with the screenshots.
    const likelyIcon = Math.abs(ratio - 1) < 0.12 && Math.max(width, height) < 360;
    return urlLooksLikeScreenshot && !likelyIcon;
  }

  function storeImageElements(container) {
    if (container instanceof HTMLImageElement || container instanceof HTMLSourceElement) return [container];
    // A <picture> commonly exposes the same screenshot through both <source>
    // and <img>. Prefer the rendered img so responsive variants cannot enter
    // the same collection twice.
    const images = [...container.querySelectorAll("img")];
    if (images.length) return images;
    return [...container.querySelectorAll("source")];
  }

  function storeImages() {
    if (location.hostname === "play.google.com") return googlePlayStoreImages();
    const containers = storeContainers();
    if (!containers.length) return [];
    const product = productInfo();
    const results = [];
    for (const container of containers) {
      for (const image of storeImageElements(container)) {
        if (image.tagName === "IMG" && !isLikelyStoreScreenshot(image) && !isLargeEnough(image)) continue;
        const source = maxResGooglePlayImageUrl(bestImageFromElement(image));
        if (!source) continue;
        results.push({
          type: "store", image: source, name: product.name, title: image.alt || product.name,
          productName: product.name, productUrl: product.productUrl, sourceUrl: product.productUrl,
          tags: ["Store"], sortOrder: results.length
        });
      }
      if (container instanceof HTMLImageElement || container instanceof HTMLSourceElement) continue;
      for (const element of [container, ...container.querySelectorAll("*")]) {
        const source = backgroundImage(element);
        if (!source || !isLargeEnough(element)) continue;
        results.push({
          type: "store", image: source, name: product.name, title: product.name,
          productName: product.name, productUrl: product.productUrl, sourceUrl: product.productUrl,
          tags: ["Store"], sortOrder: results.length
        });
      }
    }
    return storeUnique(results.filter(item => {
      if (location.hostname !== "play.google.com") return true;
      return /screenshot|screen.?shot|googleusercontent\.com|play-lh\.googleusercontent/i.test(item.image);
    }));
  }

  function googlePlayStoreImages() {
    const gallery = googlePlayScreenshotGallery();
    if (!gallery) return [];
    const product = productInfo();
    const imagesByIndex = new Map();
    for (const image of gallery.querySelectorAll('img[data-screenshot-index]')) {
      const screenshotIndex = Number(image.dataset.screenshotIndex);
      if (!Number.isInteger(screenshotIndex) || screenshotIndex < 0 || imagesByIndex.has(screenshotIndex)) continue;
      imagesByIndex.set(screenshotIndex, image);
    }
    const results = [...imagesByIndex.entries()]
      .sort(([first], [second]) => first - second)
      .map(([screenshotIndex, image]) => {
      const source = maxResGooglePlayImageUrl(bestImageFromElement(image));
      if (!source) return null;
      return {
        type: "store", image: source, name: product.name, title: image.alt || product.name,
        productName: product.name, productUrl: product.productUrl, sourceUrl: product.productUrl,
        tags: ["Store"], screenshotIndex, sortOrder: screenshotIndex
      };
    }).filter(Boolean);
    return storeUnique(results);
  }

  async function refreshHoverPermission() {
    const { assetLibraryWhitelist: whitelist = [] } = await chrome.storage.local.get({ assetLibraryWhitelist: [] });
    const host = location.hostname.replace(/^www\./, "");
    hoverEnabled = [...new Set([...DEFAULT_WHITELIST, ...whitelist])]
      .some(entry => host === entry || host.endsWith(`.${entry}`));
    if (!hoverEnabled) {
      hideHoverButton();
      hideStoreButton();
      return;
    }
    refreshStoreButton();
  }

  function ensureStoreButton() {
    if (storeHost) return;
    storeHost = document.createElement("div");
    storeHost.id = "__asset_library_store_capture_host__";
    Object.assign(storeHost.style, {
      all: "initial",
      position: "fixed",
      zIndex: "2147483647",
      display: "none",
      pointerEvents: "auto"
    });
    const shadow = storeHost.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      button {
        all: initial;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 32px;
        padding: 0 11px;
        border: 1px solid #d3ff6a;
        border-radius: 16px;
        background: #17211b;
        color: #f7fff0;
        box-shadow: 0 5px 16px rgba(14, 21, 17, .34);
        cursor: pointer;
        font: 700 12px/1 "Microsoft YaHei", Arial, sans-serif;
        white-space: nowrap;
        transition: transform 140ms ease, background 140ms ease, color 140ms ease;
      }
      button::before { content: "▣"; color: #d3ff6a; font-size: 15px; line-height: 1; }
      button:hover, button:focus-visible { background: #d3ff6a; color: #17211b; transform: translateY(-1px); }
      button:hover::before, button:focus-visible::before { color: #17211b; }
      button:disabled { cursor: wait; opacity: .8; }
    `;
    storeButton = document.createElement("button");
    storeButton.type = "button";
    storeButton.textContent = "采集商店图";
    storeButton.title = "采集这一组商店截图";
    storeButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      saveStoreImages();
    });
    shadow.append(style, storeButton);
    document.documentElement.appendChild(storeHost);
  }

  function refreshStoreButton() {
    if (!hoverEnabled) return;
    storeAnchor = storeContainers().find(container => {
      const rect = container.getBoundingClientRect();
      return rect.width >= MIN_SIZE && rect.height >= MIN_SIZE;
    }) || null;
    if (!storeAnchor) {
      hideStoreButton();
      return;
    }
    ensureStoreButton();
    positionStoreButton();
    storeHost.style.display = "block";
  }

  function positionStoreButton() {
    if (!storeAnchor || !storeHost) return;
    const rect = storeAnchor.getBoundingClientRect();
    const width = storeHost.getBoundingClientRect().width || 104;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width - 8));
    const top = Math.max(8, Math.min(window.innerHeight - 40, rect.top + 8));
    storeHost.style.left = `${left}px`;
    storeHost.style.top = `${top}px`;
  }

  function hideStoreButton() {
    if (storeHost) storeHost.style.display = "none";
    storeAnchor = null;
  }

  function isStoreScreenshotElement(element) {
    return Boolean(element && storeContainers().some(container => container === element || container.contains(element)));
  }

  function isAppStorePage() {
    const host = location.hostname.replace(/^www\./, "");
    return host === "play.google.com" || host === "apps.apple.com";
  }

  function isAppIconTarget(target) {
    if (!isAppStorePage() || !target?.element || isStoreScreenshotElement(target.element)) return false;
    const element = target.element;
    const host = location.hostname.replace(/^www\./, "");
    if (host === "play.google.com" && isGooglePlayIconTarget(target)) return true;
    if (host === "apps.apple.com" && isAppStoreIconTarget(target)) return true;
    const rect = target.element.getBoundingClientRect();
    const width = target.element.naturalWidth || rect.width;
    const height = target.element.naturalHeight || rect.height;
    if (!width || !height) return false;
    const ratio = width / height;
    const title = document.querySelector("h1");
    const titleRect = title?.getBoundingClientRect();
    const nearTitle = titleRect && Math.abs(rect.top - titleRect.top) < 260 && rect.left < titleRect.right + 280;
    return ratio >= .82 && ratio <= 1.22 && Boolean(nearTitle);
  }

  function isAppStoreIconTarget(target) {
    const element = target?.element;
    if (!element) return false;
    const appCard = element.closest(".we-artwork--ios-app-icon, [class*='app-icon'], [data-test*='app-icon'], .we-lockup, a[href*='/app/']");
    if (!appCard) return false;
    const rect = element.getBoundingClientRect();
    const width = element.naturalWidth || rect.width;
    const height = element.naturalHeight || rect.height;
    if (width < MIN_SIZE || height < MIN_SIZE || rect.width < 28 || rect.height < 28) return false;
    const ratio = width / height;
    return ratio >= 0.72 && ratio <= 1.38 && Math.max(rect.width, rect.height) <= 300;
  }

  function productInfoForTarget(target) {
    const link = target?.element?.closest?.("a[href*='/store/apps/details'], a[href*='/app/']");
    if (!link?.href) return productInfo();
    const card = link.closest(".xSyT2c, .T75of, .we-lockup, [data-item-id], [data-docid], [data-package-name]") || link;
    const text = card.querySelector("[itemprop='name'], .DdYX5, .ubGTjb, .we-lockup__title, h2, h3")?.textContent?.trim();
    const imageAlt = target.element?.alt?.trim();
    return {
      name: (text || imageAlt || document.title || "App icon").slice(0, 80),
      productUrl: link.href
    };
  }

  async function saveStoreImages() {
    if (!storeButton) return;
    const items = storeImages();
    if (!items.length) {
      storeButton.textContent = "未找到截图";
      window.setTimeout(() => { if (storeButton) storeButton.textContent = "采集商店图"; }, 1200);
      return;
    }
    storeButton.disabled = true;
    storeButton.textContent = "采集中...";
    try {
      const owner = COLLECTOR_OWNER;
      const product = productInfo();
      const result = await sendCaptureWithRetry({
        type: "SAVE_CAPTURE",
        payload: {
          type: "store",
          owner,
          sourceUrl: product.productUrl,
          items
        }
      });
      if (!result?.ok) {
        storeButton.textContent = result?.error || "采集失败";
      } else if (result.added) {
        storeButton.textContent = `已采集 ${result.added} 张`;
      } else {
        storeButton.textContent = "这组商店图已采集";
      }
    } catch {
      storeButton.textContent = "采集失败，请重试";
    }
    window.setTimeout(() => {
      if (!storeButton) return;
      storeButton.disabled = false;
      storeButton.textContent = "采集商店图";
    }, 1500);
  }

  async function sendCaptureWithRetry(message) {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await chrome.runtime.sendMessage(message);
        if (result?.ok || result?.error) return result;
        lastError = new Error("保存服务没有返回结果");
      } catch (error) {
        if (/Extension context invalidated/i.test(String(error?.message || error))) {
          throw new Error("插件已更新，请刷新当前页面后再采集");
        }
        lastError = error;
      }
      if (attempt === 0) await new Promise(resolve => window.setTimeout(resolve, 180));
    }
    throw lastError || new Error("保存服务暂时不可用");
  }

  function ensureHoverButton() {
    if (hoverHost) return;
    hoverHost = document.createElement("div");
    hoverHost.id = "__asset_library_capture_host__";
    Object.assign(hoverHost.style, {
      all: "initial",
      position: "fixed",
      zIndex: "2147483647",
      display: "none",
      width: "30px",
      height: "30px",
      pointerEvents: "auto"
    });
    hoverHost.style.setProperty("--capture-size", "30px", "important");

    const shadow = hoverHost.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      button {
        all: initial;
        box-sizing: border-box;
        display: grid;
        place-items: center;
        width: var(--capture-size, 30px);
        height: var(--capture-size, 30px);
        border: 0;
        border-radius: 50%;
        background: #17211b;
        color: #fff;
        box-shadow: 0 3px 12px rgba(14, 21, 17, .32);
        cursor: pointer;
        font: 700 calc(var(--capture-size, 30px) * .56)/1 Arial, sans-serif;
        transition: transform 140ms ease, background 140ms ease;
      }
      button:hover, button:focus-visible {
        background: #d3ff6a;
        color: #17211b;
        transform: scale(1.06);
      }
    `;
    hoverButton = document.createElement("button");
    hoverButton.type = "button";
    hoverButton.textContent = "+";
    hoverButton.title = "Collect this image";
    hoverButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if (hoverTarget) saveHoverTarget(hoverTarget);
    });
    shadow.append(style, hoverButton);
    document.documentElement.appendChild(hoverHost);
  }

  function updateHoverTarget(x, y) {
    if (!hoverEnabled) return;
    const target = findTargetAtPoint(x, y);
    if (!target) {
      if (!hoverHost?.matches(":hover")) hideHoverButton();
      return;
    }
    hoverTarget = target;
    ensureHoverButton();
    positionHoverButton();
    hoverHost.style.display = "block";
  }

  function findTargetAtPoint(x, y) {
    const element = document.elementFromPoint(x, y);
    if (hoverHost?.contains(element)) return hoverTarget;
    const pinterestImage = pinterestImageAtPoint(x, y);
    if (pinterestImage) return pinterestImage;
    const direct = element?.closest?.("img");
    if (usableImage(direct)) {
      const target = { element: direct, image: imageFromElement(direct) };
      if (canCaptureTarget(target)) return target;
    }

    const image = [...document.images]
      .filter(candidate => {
        const rect = candidate.getBoundingClientRect();
        return usableImage(candidate)
          && canCaptureTarget({ element: candidate, image: imageFromElement(candidate) })
          && rect.left <= x && rect.right >= x && rect.top <= y && rect.bottom >= y;
      })
      .sort((first, second) => imageArea(second) - imageArea(first))[0];
    if (image) return { element: image, image: imageFromElement(image) };

    if (element?.closest?.("button, a, input, textarea, select, [role='button']")) return null;
    let current = element;
    for (let depth = 0; current && current !== document.body && depth < 6; depth += 1, current = current.parentElement) {
      const rect = current.getBoundingClientRect?.();
      const image = backgroundImage(current);
      const target = { element: current, image };
      if (image && rect && canCaptureTarget(target) && rect.width >= HOVER_MIN_SIZE && rect.height >= HOVER_MIN_SIZE && rect.left <= x && rect.right >= x && rect.top <= y && rect.bottom >= y) {
        return target;
      }
    }
    return null;
  }

  function canCaptureTarget(target) {
    if (!target?.element || !target.image) return false;
    if (location.hostname !== "play.google.com") return true;
    // Store screenshots and app icons keep their original capture routes.
    // Event and offer cards are also useful inspiration, but are saved as a
    // single inspiration image rather than being mixed into app screenshots.
    return isStoreScreenshotElement(target.element)
      || isGooglePlayIconTarget(target)
      || isGooglePlayEventOfferTarget(target);
  }

  function isGooglePlayEventOfferTarget(target) {
    return isGooglePlayEventOfferElement(target?.element);
  }

  function isGooglePlayEventOfferElement(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const width = element.naturalWidth || rect.width;
    const height = element.naturalHeight || rect.height;
    if (width < 100 || height < 100 || rect.width < 80 || rect.height < 80) return false;

    const directLabel = `${element.alt || ""} ${element.title || ""}`;
    if (/\b(events?\s*(?:&|and)\s*offers?|event|offers?)\b/i.test(directLabel)) return true;

    // Google Play changes its card markup often. The section/card copy is the
    // stable signal for Events & offers, including time-limited update cards.
    for (let current = element.parentElement, depth = 0; current && current !== document.body && depth < 8; depth += 1, current = current.parentElement) {
      const label = `${current.getAttribute("aria-label") || ""} ${current.getAttribute("data-testid") || ""} ${current.innerText || ""}`.slice(0, 700);
      if (/\b(events?\s*(?:&|and)\s*offers?|event|offers?|update available|available in\s+\d+)\b/i.test(label)) return true;
    }
    return false;
  }

  function isGooglePlayIconTarget(target) {
    const element = target?.element;
    if (!element) return false;
    // Google Play uses different markup for home, games, search, and curated
    // collection pages. The stable signal across them is an app detail link or
    // app record wrapper. Keep the size guard so promotional banners do not
    // become icons merely because they use Google-hosted images.
    const appCard = element.closest(".xSyT2c, .T75of, [class*='app-icon'], [data-item-id], [data-docid], [data-package-name], a[href*='/store/apps/details']");
    if (!appCard) return false;
    const rect = element.getBoundingClientRect();
    const width = element.naturalWidth || rect.width;
    const height = element.naturalHeight || rect.height;
    if (width < MIN_SIZE || height < MIN_SIZE || rect.width < 28 || rect.height < 28) return false;
    const ratio = width / height;
    return ratio >= 0.72 && ratio <= 1.38 && Math.max(rect.width, rect.height) <= 300;
  }

  function pinterestImageAtPoint(x, y) {
    const host = location.hostname.replace(/^www\./, "");
    if (!host.endsWith("pinterest.com")) return null;
    const image = [...document.querySelectorAll("img[src], img[srcset], img[data-src], img[data-pin-media]")]
      .filter(candidate => {
        const rect = candidate.getBoundingClientRect();
        return rect.width >= HOVER_MIN_SIZE && rect.height >= HOVER_MIN_SIZE && rect.left <= x && rect.right >= x && rect.top <= y && rect.bottom >= y && Boolean(bestImageFromElement(candidate));
      })
      .sort((first, second) => imageArea(first) - imageArea(second))[0];
    return image ? { element: image, image: bestImageFromElement(image) } : null;
  }

  function usableImage(image) {
    return Boolean(image && image.isConnected && imageFromElement(image) && image.naturalWidth >= HOVER_MIN_SIZE && image.naturalHeight >= HOVER_MIN_SIZE);
  }

  function imageArea(image) {
    const rect = image.getBoundingClientRect();
    return rect.width * rect.height;
  }

  function positionHoverButton() {
    if (!hoverTarget || !hoverHost) return;
    const rect = hoverTarget.element.getBoundingClientRect();
    const smallestSide = Math.min(rect.width, rect.height);
    const size = Math.round(Math.max(18, Math.min(30, smallestSide * .28)));
    const isSmallImage = smallestSide < 140;
    // Match the reference collector: large images sit 4px from the lower-left
    // corner, while small images let the button extend slightly beyond it.
    const left = isSmallImage ? rect.left - size * .24 : rect.left + 4;
    const top = isSmallImage ? rect.bottom - size * .76 : rect.bottom - size - 4;
    const boundedLeft = Math.max(6, Math.min(window.innerWidth - size - 6, left));
    const boundedTop = Math.max(6, Math.min(window.innerHeight - size - 6, top));
    hoverHost.style.setProperty("--capture-size", `${size}px`, "important");
    hoverHost.style.width = `${size}px`;
    hoverHost.style.height = `${size}px`;
    hoverHost.style.left = `${boundedLeft}px`;
    hoverHost.style.top = `${boundedTop}px`;
  }

  async function saveHoverTarget(target) {
    if (!target?.image || !hoverButton) return;
    hoverButton.disabled = true;
    hoverButton.textContent = "...";
    try {
      const owner = COLLECTOR_OWNER;
      const isIcon = isAppIconTarget(target);
      const product = isIcon ? productInfoForTarget(target) : null;
      const image = isIcon && location.hostname === "play.google.com" ? upscaleGooglePlayIconUrl(target.image) : target.image;
      const type = isIcon ? "icon" : "inspiration";
      const result = await sendCaptureWithRetry({
        type: "SAVE_CAPTURE",
        payload: {
          type,
          owner,
          sourceUrl: product?.productUrl || location.href,
          items: [{
            type,
            image,
            name: product?.name || target.element.alt || target.element.title || document.title || "Web asset",
            title: product?.name || target.element.alt || target.element.title || document.title || "Web asset",
            sourceUrl: product?.productUrl || location.href,
            sourceTitle: document.title,
            tags: []
          }]
        }
      });
      if (!result?.ok) {
        hoverButton.textContent = "!";
        showCaptureNotice(result?.error || "采集失败，请刷新页面后重试", true);
      } else if (result.added) {
        hoverButton.textContent = "OK";
        showCaptureNotice(`已采集 ${result.added} 张，已同步到看板`);
      } else {
        hoverButton.textContent = "-";
        showCaptureNotice("这张图已经采集过了");
      }
    } catch (error) {
      hoverButton.textContent = "!";
      showCaptureNotice(`采集失败：${error?.message || "请刷新页面后重试"}`, true);
    }
    window.setTimeout(() => {
      if (!hoverButton) return;
      hoverButton.disabled = false;
      hoverButton.textContent = "+";
    }, 1000);
  }

  function hideHoverButton() {
    if (hoverHost) hoverHost.style.display = "none";
    hoverTarget = null;
  }

  function showCaptureNotice(message, isError = false) {
    if (!captureNoticeHost) {
      captureNoticeHost = document.createElement("div");
      captureNoticeHost.id = "__asset_library_capture_notice__";
      Object.assign(captureNoticeHost.style, {
        all: "initial",
        position: "fixed",
        zIndex: "2147483647",
        left: "50%",
        bottom: "20px",
        transform: "translateX(-50%)",
        pointerEvents: "none"
      });
      const shadow = captureNoticeHost.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = `
        :host { all: initial; }
        div { box-sizing:border-box; max-width:min(420px,calc(100vw - 28px)); padding:10px 14px; border:1px solid #c8df9c; border-radius:8px; background:#17211b; color:#f4faed; box-shadow:0 10px 25px rgba(8,18,11,.28); font:700 13px/1.35 "Microsoft YaHei",Arial,sans-serif; }
        div.error { border-color:#efb1a9; background:#3a211f; color:#fff1ef; }
      `;
      const notice = document.createElement("div");
      shadow.append(style, notice);
      captureNoticeHost._notice = notice;
      document.documentElement.appendChild(captureNoticeHost);
    }
    captureNoticeHost._notice.textContent = message;
    captureNoticeHost._notice.className = isError ? "error" : "";
    captureNoticeHost.style.display = "block";
    window.clearTimeout(captureNoticeTimer);
    captureNoticeTimer = window.setTimeout(() => {
      if (captureNoticeHost) captureNoticeHost.style.display = "none";
    }, isError ? 3600 : 2200);
  }

  document.addEventListener("pointermove", event => {
    if (hoverHost?.contains(event.target)) return;
    lastPointer = { x: event.clientX, y: event.clientY };
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = null;
      updateHoverTarget(lastPointer.x, lastPointer.y);
    });
  }, true);
  window.addEventListener("scroll", () => {
    if (hoverTarget && hoverHost?.style.display === "block") positionHoverButton();
    if (storeAnchor && storeHost?.style.display === "block") positionStoreButton();
  }, { passive: true });
  window.addEventListener("resize", () => {
    if (storeAnchor && storeHost?.style.display === "block") positionStoreButton();
  }, { passive: true });
  window.addEventListener("blur", hideHoverButton);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.assetLibraryWhitelist) refreshHoverPermission();
  });
  refreshHoverPermission();
  storeObserver = new MutationObserver(() => {
    if (!hoverEnabled) return;
    window.clearTimeout(storeObserver._timer);
    storeObserver._timer = window.setTimeout(refreshStoreButton, 180);
  });
  storeObserver.observe(document.documentElement, { childList: true, subtree: true });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "COLLECT_ASSETS") {
      const type = message.assetType === "icon" ? "icon" : "inspiration";
      sendResponse({ ok: true, items: genericImages(type), sourceUrl: location.href, title: document.title });
      return;
    }
    if (message?.type === "COLLECT_STORE") {
      const product = productInfo();
      sendResponse({ ok: true, items: storeImages(), sourceUrl: product.productUrl, productName: product.name, title: document.title });
    }
  });
})();
