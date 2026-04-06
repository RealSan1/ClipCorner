let selecting = false;
let videoUrlRaw = "";
let overlayOpacityPct = 85;
let onlyShowVideoOnHover = true;
let lastHighlighted = null;
let highlightBoxEl = null;
let selectionVeilEl = null;

function loadSettings() {
  chrome.storage.local.get(["videoUrl", "overlayOpacity", "onlyShowVideoOnHover"], (data) => {
    if (data.videoUrl) {
      videoUrlRaw = data.videoUrl;
    }
    if (typeof data.overlayOpacity === "number" && !Number.isNaN(data.overlayOpacity)) {
      overlayOpacityPct = clampOpacityPct(data.overlayOpacity);
    }
    if (typeof data.onlyShowVideoOnHover === "boolean") {
      onlyShowVideoOnHover = data.onlyShowVideoOnHover;
    }
  });
}

loadSettings();

function clampOpacityPct(n) {
  const x = Math.round(Number(n));
  if (Number.isNaN(x)) return 85;
  return Math.min(100, Math.max(0, x));
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.videoUrl?.newValue != null) {
    videoUrlRaw = changes.videoUrl.newValue;
  }
  if (changes.overlayOpacity?.newValue != null) {
    overlayOpacityPct = clampOpacityPct(changes.overlayOpacity.newValue);
    applyOpacityToAllOverlays();
  }
  if (changes.onlyShowVideoOnHover?.newValue != null) {
    onlyShowVideoOnHover = changes.onlyShowVideoOnHover.newValue;
    syncAllOverlayIframeVisibility();
  }
});

function applyOpacityToAllOverlays() {
  const alpha = overlayOpacityPct / 100;
  document.querySelectorAll("iframe[data-yt-iframe]").forEach((iframe) => {
    iframe.style.opacity = String(alpha);
  });
}

function syncAllOverlayIframeVisibility() {
  document.querySelectorAll("[data-yt-overlay-root]").forEach((root) => {
    const iframe = root.querySelector("iframe[data-yt-iframe]");
    if (!iframe) return;
    iframe.style.display = onlyShowVideoOnHover ? "none" : "block";
  });
}

function toYouTubeEmbedUrl(input) {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withScheme);
    const host = u.hostname.replace(/^www\./i, "");
    let videoId = null;

    if (host === "youtu.be") {
      videoId = u.pathname.split("/").filter(Boolean)[0] || null;
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname.startsWith("/embed/")) {
        videoId = u.pathname.split("/").filter(Boolean)[1] || null;
      } else if (u.pathname.startsWith("/shorts/")) {
        videoId = u.pathname.split("/").filter(Boolean)[1] || null;
      } else if (u.pathname.startsWith("/live/")) {
        videoId = u.pathname.split("/").filter(Boolean)[1] || null;
      } else if (u.pathname.startsWith("/watch")) {
        videoId = u.searchParams.get("v");
      }
    }

    if (videoId && /^[\w-]{11}$/.test(videoId)) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function buildEmbedSrc(embedBase) {
  const u = new URL(embedBase);
  u.searchParams.set("autoplay", "1");
  u.searchParams.set("mute", "1");
  u.searchParams.set("playsinline", "1");
  return u.toString();
}

const CAPTURE = true;

function getSelectionVeil() {
  if (selectionVeilEl) return selectionVeilEl;
  selectionVeilEl = document.createElement("div");
  selectionVeilEl.setAttribute("data-yt-selection-veil", "1");
  selectionVeilEl.style.cssText = [
    "position:fixed",
    "inset:0",
    "margin:0",
    "padding:0",
    "z-index:2147483646",
    "cursor:crosshair",
    "background:transparent",
    "pointer-events:auto",
  ].join(";");
  return selectionVeilEl;
}

function removeSelectionVeil() {
  if (selectionVeilEl) {
    selectionVeilEl.remove();
    selectionVeilEl = null;
  }
}

/** veil 아래 실제 요소(링크/이미지 등). 잠깐 veil만 pointer-events 끔 */
function elementBelowSelectionVeil(clientX, clientY) {
  const veil = selectionVeilEl;
  if (!veil) return document.elementFromPoint(clientX, clientY);
  veil.style.pointerEvents = "none";
  let el = document.elementFromPoint(clientX, clientY);
  veil.style.pointerEvents = "auto";
  return el;
}

window.enableSelectionMode = function () {
  if (selecting) return;
  selecting = true;
  lastHighlighted = null;

  const veil = getSelectionVeil();
  document.documentElement.appendChild(veil);

  veil.addEventListener("mousemove", handleVeilMouseMove, CAPTURE);
  veil.addEventListener("click", handleVeilClick, CAPTURE);
  veil.addEventListener("pointerdown", blockEventOnVeil, CAPTURE);
  veil.addEventListener("mousedown", blockEventOnVeil, CAPTURE);
  veil.addEventListener("mouseup", blockEventOnVeil, CAPTURE);
  veil.addEventListener("dragstart", blockDragOnVeil, CAPTURE);

  window.addEventListener("scroll", handleSelectionScrollResize, true);
  window.addEventListener("resize", handleSelectionScrollResize, true);
  document.addEventListener("keydown", handleEsc, CAPTURE);
};

function blockEventOnVeil(e) {
  if (!selecting) return;
  if (!isPrimaryLeftButton(e)) return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation?.();
}

function blockDragOnVeil(e) {
  if (!selecting) return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation?.();
}

function disableSelectionMode() {
  selecting = false;
  clearHighlight();

  if (selectionVeilEl) {
    selectionVeilEl.removeEventListener("mousemove", handleVeilMouseMove, CAPTURE);
    selectionVeilEl.removeEventListener("click", handleVeilClick, CAPTURE);
    selectionVeilEl.removeEventListener("pointerdown", blockEventOnVeil, CAPTURE);
    selectionVeilEl.removeEventListener("mousedown", blockEventOnVeil, CAPTURE);
    selectionVeilEl.removeEventListener("mouseup", blockEventOnVeil, CAPTURE);
    selectionVeilEl.removeEventListener("dragstart", blockDragOnVeil, CAPTURE);
  }
  removeSelectionVeil();

  window.removeEventListener("scroll", handleSelectionScrollResize, true);
  window.removeEventListener("resize", handleSelectionScrollResize, true);
  document.removeEventListener("keydown", handleEsc, CAPTURE);
}

function handleSelectionScrollResize() {
  if (!selecting || !lastHighlighted) return;
  if (!document.contains(lastHighlighted)) {
    clearHighlight();
    return;
  }
  positionHighlightBox(lastHighlighted);
}

function isPrimaryLeftButton(e) {
  const t = e.type;
  if (t === "mouseup" || t === "mousedown") {
    return e.button === 0;
  }
  if (t === "pointerup" || t === "pointerdown") {
    if (e.pointerType === "touch") return e.isPrimary !== false;
    return e.button === 0;
  }
  return e.button === 0;
}

/** 원본 안의 <a>/<img>가 포인터를 못 받게 해 오버레이 후에도 링크로 안 넘어가게 */
function ensureOriginalContentNoPointer() {
  if (document.getElementById("yt-overlay-pe-none")) return;
  const st = document.createElement("style");
  st.id = "yt-overlay-pe-none";
  st.textContent = [
    "[data-yt-original],[data-yt-original] * {",
    "  pointer-events: none !important;",
    "  -webkit-user-drag: none !important;",
    "}",
  ].join("");
  (document.head || document.documentElement).appendChild(st);
}

function getSelectionHighlightBox() {
  if (highlightBoxEl) return highlightBoxEl;
  highlightBoxEl = document.createElement("div");
  highlightBoxEl.setAttribute("data-yt-selection-highlight", "1");
  highlightBoxEl.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "width:0",
    "height:0",
    "box-sizing:border-box",
    "border:3px solid #e00",
    "pointer-events:none",
    "z-index:2147483647",
    "display:none",
    "margin:0",
    "box-shadow:0 0 0 1px rgba(255,255,255,0.35)",
  ].join(";");
  document.documentElement.appendChild(highlightBoxEl);
  return highlightBoxEl;
}

function positionHighlightBox(el) {
  const box = getSelectionHighlightBox();
  if (!el || el === document.documentElement || el === document.body) {
    box.style.display = "none";
    return;
  }
  const r = el.getBoundingClientRect();
  box.style.display = "block";
  box.style.left = `${r.left}px`;
  box.style.top = `${r.top}px`;
  box.style.width = `${r.width}px`;
  box.style.height = `${r.height}px`;
}

function clearHighlight() {
  lastHighlighted = null;
  if (highlightBoxEl) highlightBoxEl.style.display = "none";
}

function handleVeilMouseMove(e) {
  if (!selecting) return;
  const el = elementBelowSelectionVeil(e.clientX, e.clientY);
  if (!el || el === document.documentElement || el === document.body) {
    clearHighlight();
    return;
  }
  if (el.closest?.("[data-yt-selection-highlight]") || el.closest?.("[data-yt-selection-veil]")) {
    return;
  }
  if (el === lastHighlighted) {
    positionHighlightBox(el);
    return;
  }
  lastHighlighted = el;
  positionHighlightBox(el);
}

function handleEsc(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    disableSelectionMode();
  }
}

const CONTAINER_SELECTOR =
  "div,section,article,main,aside,header,footer,nav,li,form,figure,td,th,p,h1,h2,h3,h4,h5,h6";

function pointInElement(clientX, clientY, el) {
  if (!el?.getBoundingClientRect) return false;
  const r = el.getBoundingClientRect();
  return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
}

/** 작은 텍스트/아이콘만 잡힐 때 위로 올라가며 쓸만한 블록 요소를 고름 */
function expandToContainer(el) {
  const minArea = 8 * 8;
  let cur = el;
  for (let i = 0; i < 24 && cur && cur !== document.body && cur !== document.documentElement; i++) {
    try {
      if (cur.matches?.(CONTAINER_SELECTOR)) {
        const r = cur.getBoundingClientRect();
        const area = Math.max(0, r.width) * Math.max(0, r.height);
        if (area >= minArea) return cur;
      }
    } catch {
      /* e.g. invalid selector in old engines */
    }
    cur = cur.parentElement;
  }
  return el;
}

/** 빨간 테두리와 클릭 지점을 맞추고, div 등 컨테이너를 우선 */
function resolveSelectionTarget(clientX, clientY) {
  const top = elementBelowSelectionVeil(clientX, clientY);
  if (!top || top === document.documentElement || top === document.body) return null;

  if (
    lastHighlighted &&
    document.contains(lastHighlighted) &&
    pointInElement(clientX, clientY, lastHighlighted) &&
    lastHighlighted.contains(top)
  ) {
    return expandToContainer(lastHighlighted);
  }

  return expandToContainer(top);
}

function handleVeilClick(e) {
  if (!selecting) return;
  if (e.button !== 0) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation?.();

  if (!String(videoUrlRaw || "").trim()) {
    disableSelectionMode();
    return;
  }

  const embedBase = toYouTubeEmbedUrl(videoUrlRaw);
  if (!embedBase) {
    disableSelectionMode();
    return;
  }

  const target = resolveSelectionTarget(e.clientX, e.clientY);
  if (!target || target === document.documentElement || target === document.body) {
    disableSelectionMode();
    return;
  }

  if (target.closest("[data-yt-overlay-root]")) {
    disableSelectionMode();
    return;
  }

  clearHighlight();
  disableSelectionMode();
  applyYoutubeOverlay(target, embedBase);
}

function applyYoutubeOverlay(target, embedBase) {
  ensureOriginalContentNoPointer();

  const cs = window.getComputedStyle(target);
  if (cs.position === "static") {
    target.style.position = "relative";
  }

  const originalWrapper = document.createElement("div");
  originalWrapper.setAttribute("data-yt-original", "");
  while (target.firstChild) {
    originalWrapper.appendChild(target.firstChild);
  }
  target.appendChild(originalWrapper);

  const alpha = overlayOpacityPct / 100;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("data-yt-iframe", "");
  iframe.src = buildEmbedSrc(embedBase);
  iframe.title = "YouTube";
  iframe.style.cssText = [
    "position:absolute",
    "inset:0",
    "width:100%",
    "height:100%",
    "border:none",
    "z-index:2147483646",
    "display:none",
    "background:transparent",
    `opacity:${alpha}`,
    "pointer-events:auto",
  ].join(";");

  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.setAttribute("allowfullscreen", "");

  target.setAttribute("data-yt-overlay-root", "");
  target.appendChild(iframe);

  target.addEventListener("mouseenter", () => {
    if (onlyShowVideoOnHover) iframe.style.display = "block";
  });

  target.addEventListener("mouseleave", () => {
    if (onlyShowVideoOnHover) iframe.style.display = "none";
  });

  iframe.style.display = onlyShowVideoOnHover ? "none" : "block";
}
