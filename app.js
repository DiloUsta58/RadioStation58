/* WebRadioStation - vanilla HTML/CSS/JS */

const RADIO_LIST_URL = "rlist/radio.lst";
const CITY_LIST_DIR = "ŞehirlerRadio";
const LS_FAV_KEY = "webRadioStation:favorites:v1";
const LS_STREAM_PREF_KEY = "webRadioStation:streamIndexByStation:v1";
const LS_VOLUME_KEY = "webRadioStation:volume:v1";
const LS_BLOCKED_URLS_KEY = "webRadioStation:blockedUrls:v1";
const LS_UI_STATE_KEY = "webRadioStation:uiState:v1";
const LS_CITY_KEY = "webRadioStation:cityList:v1";
const LS_APP_BOOT_KEY = "webRadioStation:bootVersion";
const APP_BOOT_VERSION = "20260502-huawei-render-fix";
const LS_DIAGNOSTICS_KEY = "webRadioStation:diagnosticsEnabled:v1";
const LS_STATION_FONT_SIZE_KEY = "webRadioStation:stationFontSize:v1";
const LS_TIME_FONT_SIZE_KEY = "webRadioStation:timeFontSize:v1";
const LS_AUTOSTART_KEY = "webRadioStation:autoStartOnLaunch:v1";
const LS_UPDATE_INTERVAL_MIN_KEY = "webRadioStation:updateIntervalMin:v1";
const ADMIN_SAVE_URL = "admin/save-radio.php";
const ICY_META_URL = "api/icy-metadata.php";
const STREAM_CHECK_ENABLED = true;
const APP_VERSION = "1.4.0";
const VERSION_JSON_URL = "https://dilousta58.github.io/RadioStation58/version.json";
const APK_DOWNLOAD_URL = "https://dilousta58.github.io/RadioStation58/WebRadio-release.apk";
let streamDiagnosticsEnabled = false;

const els = {
  menuBtn: document.getElementById("menuBtn"),
  mainMenu: document.getElementById("mainMenu"),
  settingsMenuBtn: document.getElementById("settingsMenuBtn"),
  carmodBtn: document.getElementById("carmodBtn"),
  brandTitle: document.getElementById("brandTitle"),
  brandSubtitle: document.getElementById("brandSubtitle"),
  settingsPanel: document.getElementById("settingsPanel"),
  settingsCloseBtn: document.getElementById("settingsCloseBtn"),
  stationFontSizeRange: document.getElementById("stationFontSizeRange"),
  stationFontSizeValue: document.getElementById("stationFontSizeValue"),
  timeFontSizeRange: document.getElementById("timeFontSizeRange"),
  timeFontSizeValue: document.getElementById("timeFontSizeValue"),
  autoStartToggle: document.getElementById("autoStartToggle"),
  updateIntervalSelect: document.getElementById("updateIntervalSelect"),
  fontResetBtn: document.getElementById("fontResetBtn"),
  reloadBtn: document.getElementById("reloadBtn"),
  playerPanel: document.getElementById("playerPanel"),
  playerToggleBtn: document.getElementById("playerToggleBtn"),
  tabAll: document.getElementById("tabAll"),
  tabFav: document.getElementById("tabFav"),
  searchInput: document.getElementById("searchInput"),
  statusText: document.getElementById("statusText"),
  countText: document.getElementById("countText"),
  stationList: document.getElementById("stationList"),
  nowTitle: document.getElementById("nowTitle"),
  nowLogo: document.getElementById("nowLogo"),
  nowMeta: document.getElementById("nowMeta"),
  nowStreamChip: document.getElementById("nowStreamChip"),
  favToggleBtn: document.getElementById("favToggleBtn"),
  playBtn: document.getElementById("playBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  stopBtn: document.getElementById("stopBtn"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  randomBtn: document.getElementById("randomBtn"),
  compactPlayBtn: document.getElementById("compactPlayBtn"),
  compactPauseBtn: document.getElementById("compactPauseBtn"),
  compactPrevBtn: document.getElementById("compactPrevBtn"),
  compactNextBtn: document.getElementById("compactNextBtn"),
  compactRandomBtn: document.getElementById("compactRandomBtn"),
  compactRecordBtn: document.getElementById("compactRecordBtn"),
  quickTime: document.getElementById("quickTime"),
  streamSelect: document.getElementById("streamSelect"),
  volumeRange: document.getElementById("volumeRange"),
  volumeText: document.getElementById("volumeText"),
  playerState: document.getElementById("playerState"),
  streamCheck: document.getElementById("streamCheck"),
  playerError: document.getElementById("playerError"),
  footerState: document.getElementById("footerState"),
  footerCount: document.getElementById("footerCount"),
  footerNow: document.getElementById("footerNow"),
  updateStatus: document.getElementById("updateStatus"),
  audio: document.getElementById("audio"),
  youtubeFrame: document.getElementById("youtubeFrame"),
  citySelect: document.getElementById("button"),
  youtubePopup: document.getElementById("youtubePopup"),
  youtubePopupFrame: document.getElementById("youtubePopupFrame"),
  youtubePopupClose: document.getElementById("youtubePopupClose"),

  carMode: document.getElementById("carMode"),
  carModeLogo: document.getElementById("carModeLogo"),
  carNowTitle: document.getElementById("carNowTitle"),
  carFooterStatus: document.getElementById("carFooterStatus"),
  carFooterCheck: document.getElementById("carFooterCheck"),
  carFooterError: document.getElementById("carFooterError"),
  carStationIcon: document.getElementById("carStationIcon"),
  carFavBtn: document.getElementById("carFavBtn"),
  carPrevBtn: document.getElementById("carPrevBtn"),
  carPlayBtn: document.getElementById("carPlayBtn"),
  carNextBtn: document.getElementById("carNextBtn"),
  carRandomBtn: document.getElementById("carRandomBtn"),
  carExitBtn: document.getElementById("carExitBtn"),

  adminBtn: document.getElementById("adminBtn"),
  adminPanel: document.getElementById("adminPanel"),
  adminCloseBtn: document.getElementById("adminCloseBtn"),
  adminSaveBtn: document.getElementById("adminSaveBtn"),
  adminDownloadBtn: document.getElementById("adminDownloadBtn"),
  adminMarkingToggle: document.getElementById("adminMarkingToggle"),
  adminClearBlockedBtn: document.getElementById("adminClearBlockedBtn"),
  adminResult: document.getElementById("adminResult"),
};

/** @typedef {{ key: string, name: string, streams: string[], icon?: string, group?: string, type?: "radio" | "tv" }} Station */

/** @type {Station[]} */
let stations = [];
/** @type {string | null} */
let activeStationKey = null;
/** @type {"all" | "fav"} */
let viewMode = "all";

/** @type {string} */
let activeListUrl = RADIO_LIST_URL;

/** @type {Map<string, "timeout" | "unsupported">} */
const stationIssue = new Map();

let lastPlaybackRequestAt = 0;
let autoSkipWindowMs = 15_000;
let autoSkipCount = 0;
let autoSkipResetAt = 0;
const AUTO_SKIP_MAX_PER_MIN = 12;

let uiSaveTimer = 0;

let selectionToken = 0;

let savedViewportContent = null;
let autoStartAttempted = false;
let quickTimeConnecting = false;
let connectionTimeoutTimer = 0;
let connectionTimeoutToken = 0;
let connectionTimeoutStationKey = null;
let manualPauseRequestedAt = 0;
const MANUAL_PAUSE_GRACE_MS = 1200;

let updatePollTimer = 0;

function getUpdateIntervalMin() {
  const raw = localStorage.getItem(LS_UPDATE_INTERVAL_MIN_KEY);
  const n = Number.parseInt(String(raw ?? "0"), 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function setUpdateIntervalMin(min) {
  const value = Math.max(0, Number.parseInt(String(min || 0), 10) || 0);
  localStorage.setItem(LS_UPDATE_INTERVAL_MIN_KEY, String(value));
  if (els.updateIntervalSelect) els.updateIntervalSelect.value = String(value);
  rescheduleUpdatePoll();
}

function isRadioPlaying() {
  if (!els.audio) return false;
  if (!els.audio.paused && els.audio.src) return true;
  return false;
}

function stopUpdatePoll() {
  if (updatePollTimer) {
    window.clearInterval(updatePollTimer);
    updatePollTimer = 0;
  }
}

function rescheduleUpdatePoll() {
  stopUpdatePoll();
  if (!isAndroidApp()) return;
  const min = getUpdateIntervalMin();
  if (!min) return;
  if (!isRadioPlaying()) return; // only while playing
  updatePollTimer = window.setInterval(() => void checkAndroidUpdateVersion(), min * 60_000);
}

function setCarModeZoomLocked(locked) {
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;

  if (locked) {
    if (savedViewportContent === null) savedViewportContent = meta.getAttribute("content") || "";
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
    );
    return;
  }

  if (savedViewportContent !== null) {
    meta.setAttribute("content", savedViewportContent);
    savedViewportContent = null;
  }
}
let skipIssuedForToken = -1;

let metaTimer = 0;
let metaAbortController = null;
let lastMetaTitle = "";
let listHeightTimer = 0;
let recording = false;
let recordingStationKey = null;
let recordingStartedAt = 0;
let recordingTimer = 0;
let recordingBlinkTimer = 0;
let recordingBlinkAlt = false;
let recordingAbortController = null;
let recordingReader = null;
let recordingChunks = [];
let playbackStartedAt = 0;
let playbackTimer = 0;
let playbackStationKey = null;

/**
 * Cache for quick stream checks so we don't probe the same URL repeatedly.
 * @type {Map<string, { status: "ok" | "error" | "timeout", checkedAt: number }>}
 */
const streamCheckCache = new Map();
const STREAM_CHECK_TTL_MS = 12 * 60 * 60 * 1000; // 12h

// Local placeholder (no domain-based icon fetching)
const ICON_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7aa2ff" stop-opacity="0.55"/>
        <stop offset="1" stop-color="#57e3a3" stop-opacity="0.45"/>
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#g)"/>
    <path d="M24 38c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="4" stroke-linecap="round"/>
    <path d="M18 38c0-7.7 6.3-14 14-14s14 6.3 14 14" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="4" stroke-linecap="round"/>
    <circle cx="32" cy="42" r="3.5" fill="rgba(255,255,255,0.9)"/>
  </svg>`
)}`;

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getFavoritesSet() {
  const raw = localStorage.getItem(LS_FAV_KEY);
  const arr = Array.isArray(safeJsonParse(raw, [])) ? safeJsonParse(raw, []) : [];
  return new Set(arr.filter((x) => typeof x === "string"));
}

function setFavoritesSet(set) {
  localStorage.setItem(LS_FAV_KEY, JSON.stringify([...set]));
}

function getBlockedUrlsSet() {
  if (!streamDiagnosticsEnabled) return new Set();
  const raw = localStorage.getItem(LS_BLOCKED_URLS_KEY);
  const arr = Array.isArray(safeJsonParse(raw, [])) ? safeJsonParse(raw, []) : [];
  return new Set(arr.filter((x) => typeof x === "string"));
}

function setBlockedUrlsSet(set) {
  if (!streamDiagnosticsEnabled) return;
  localStorage.setItem(LS_BLOCKED_URLS_KEY, JSON.stringify([...set]));
}

function rememberBlockedUrl(url) {
  if (!streamDiagnosticsEnabled) return;
  const set = getBlockedUrlsSet();
  if (!set.has(url)) {
    set.add(url);
    setBlockedUrlsSet(set);
  }
}

function getUiState() {
  const raw = localStorage.getItem(LS_UI_STATE_KEY);
  const obj = safeJsonParse(raw, null);
  return obj && typeof obj === "object" ? obj : {};
}

function resetUiStateForNewBuild() {
  if (localStorage.getItem(LS_APP_BOOT_KEY) === APP_BOOT_VERSION) return;
  localStorage.removeItem(LS_UI_STATE_KEY);
  localStorage.removeItem(LS_BLOCKED_URLS_KEY);
  localStorage.setItem(LS_APP_BOOT_KEY, APP_BOOT_VERSION);
}

function saveUiStateNow() {
  /** @type {any} */
  const prev = getUiState();
  const scrollAll = viewMode === "all" ? els.stationList.scrollTop : prev.scrollAll ?? 0;
  const scrollFav = viewMode === "fav" ? els.stationList.scrollTop : prev.scrollFav ?? 0;
  const state = {
    viewMode,
    search: els.searchInput.value ?? "",
    activeStationKey,
    playerCollapsed: els.playerPanel?.classList.contains("is-collapsed") ?? false,
    scrollAll,
    scrollFav,
    savedAt: Date.now(),
  };
  localStorage.setItem(LS_UI_STATE_KEY, JSON.stringify(state));
}

function setPlayerCollapsed(collapsed, { persist = true } = {}) {
  els.playerPanel?.classList.toggle("is-collapsed", collapsed);
  if (els.playerToggleBtn) {
    els.playerToggleBtn.textContent = collapsed ? "Aç ▼" : "Daralt ▲";
    els.playerToggleBtn.setAttribute("aria-expanded", String(!collapsed));
  }
  scheduleListHeightUpdate();
  if (persist) scheduleUiSave();
}

function updateStationListHeight() {
  if (!els.stationList) return;
  const rect = els.stationList.getBoundingClientRect();
  const footer = document.querySelector(".app-footer");
  const footerHeight = footer?.getBoundingClientRect().height ?? 0;
  const isStackedLayout = window.matchMedia("(max-width: 980px)").matches;
  const playerReserve = isStackedLayout ? (els.playerPanel?.getBoundingClientRect().height ?? 0) + 16 : 0;
  const bottomGap = 12;
  const available = window.innerHeight - rect.top - footerHeight - playerReserve - bottomGap;
  const height = Math.max(180, Math.floor(available));
  els.stationList.style.setProperty("--station-list-height", `${height}px`);
}

function scheduleListHeightUpdate() {
  if (listHeightTimer) cancelAnimationFrame(listHeightTimer);
  listHeightTimer = requestAnimationFrame(() => {
    listHeightTimer = 0;
    updateStationListHeight();
  });
}

function scheduleUiSave() {
  if (uiSaveTimer) clearTimeout(uiSaveTimer);
  uiSaveTimer = setTimeout(() => {
    uiSaveTimer = 0;
    saveUiStateNow();
  }, 250);
}

function findStationKeyForUrl(url) {
  if (!url) return null;
  const st = stations.find((s) => s.streams.includes(url));
  return st?.key ?? null;
}

function shouldAutoSkipNow() {
  const now = Date.now();
  if (now - lastPlaybackRequestAt > autoSkipWindowMs) return false;
  if (now > autoSkipResetAt) {
    autoSkipResetAt = now + 60_000;
    autoSkipCount = 0;
  }
  if (autoSkipCount >= AUTO_SKIP_MAX_PER_MIN) return false;
  autoSkipCount++;
  return true;
}

function markStreamBad(url, kind) {
  if (!streamDiagnosticsEnabled) return;
  if (!url) return;
  if (kind === "timeout") rememberBlockedUrl(url);
  if (kind === "unsupported") rememberBlockedUrl(url);
}

function autoSkipToNext(reason, tokenAtStart) {
  if (!shouldAutoSkipNow()) return;
  if (tokenAtStart !== selectionToken) return;
  if (skipIssuedForToken === tokenAtStart) return;
  skipIssuedForToken = tokenAtStart;
  setPlayerError(`Otomatik geçiş: ${reason}`);
  nextStation({ initiatedByUser: false });
}

function buildLstFromStations(list) {
  const stamp = new Date().toISOString();
  const lines = [
    `# WebRadyo dışa aktarım`,
    `# Oluşturuldu: ${stamp}`,
    `# Görünüm: ${viewMode}`,
    `# Arama: ${els.searchInput.value.trim()}`,
    ``,
  ];

  for (const st of list) {
    for (const url of st.streams) {
      if (st.icon && String(st.icon).trim()) lines.push(`${st.name} = ${url} | ${String(st.icon).trim()}`);
      else lines.push(`${st.name} = ${url}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function setAdminVisible(isVisible) {
  els.adminBtn.classList.toggle("is-visible", isVisible);
}

function setAdminOpen(isOpen) {
  els.adminPanel.classList.toggle("is-hidden", !isOpen);
  if (isOpen && els.adminMarkingToggle) {
    els.adminMarkingToggle.checked = Boolean(streamDiagnosticsEnabled);
  }
}

function setAdminResult(text, kind = "neutral") {
  els.adminResult.textContent = text;
  if (kind === "ok") els.adminResult.style.color = "rgba(87, 227, 163, 0.95)";
  else if (kind === "bad") els.adminResult.style.color = "rgba(255, 107, 107, 0.95)";
  else els.adminResult.style.color = "";
}

function setDiagnosticsEnabled(enabled) {
  streamDiagnosticsEnabled = Boolean(enabled);
  localStorage.setItem(LS_DIAGNOSTICS_KEY, streamDiagnosticsEnabled ? "1" : "0");
  if (!streamDiagnosticsEnabled) {
    stationIssue.clear();
    renderList();
  } else {
    renderList();
  }
}

function clearBlockedUrls() {
  localStorage.removeItem(LS_BLOCKED_URLS_KEY);
  stationIssue.clear();
}

async function adminSaveCurrentList() {
  const list = getFilteredStations();
  const content = buildLstFromStations(list);

  setAdminResult("Kaydediliyor...");
  try {
    const res = await fetch(ADMIN_SAVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setAdminResult(`Hata: ${data?.error || "HTTP " + res.status}`, "bad");
      return;
    }
    setAdminResult(`OK (${data.bytes} bytes)`, "ok");
  } catch (err) {
    setAdminResult(`Hata: ${String(err?.message || err)}`, "bad");
  }
}

function adminDownloadCurrentList() {
  const list = getFilteredStations();
  const content = buildLstFromStations(list);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "radio.lst";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  setAdminResult("İndirme başlatıldı.", "ok");
}

function getStreamPrefMap() {
  const raw = localStorage.getItem(LS_STREAM_PREF_KEY);
  const obj = safeJsonParse(raw, {});
  return obj && typeof obj === "object" ? obj : {};
}

function setStreamPref(stationKey, index) {
  const map = getStreamPrefMap();
  map[stationKey] = index;
  localStorage.setItem(LS_STREAM_PREF_KEY, JSON.stringify(map));
}

function getStreamPref(stationKey) {
  const map = getStreamPrefMap();
  const v = map[stationKey];
  return Number.isFinite(v) ? v : 0;
}

function normalizeUrl(raw) {
  const url = String(raw || "").trim();
  if (url.toLowerCase().startsWith("hhttps://")) return "https://" + url.slice("hhttps://".length);
  return url;
}

function getYoutubeVideoId(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] || "";
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v") || "";
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") return parts[1] || "";
    }
  } catch {
    return "";
  }
  return "";
}

function isYoutubeUrl(url) {
  return Boolean(getYoutubeVideoId(url));
}

function youtubeEmbedUrl(url, autoplay = true) {
  const id = getYoutubeVideoId(url);
  if (!id) return "";
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    playsinline: "1",
    enablejsapi: "1",
    origin: location.origin,
    rel: "0",
  });
  return `https://www.youtube.com/embed/${encodeURIComponent(id)}?${params.toString()}`;
}

function stopYoutubePlayer() {
  if (!els.youtubeFrame) return;
  els.youtubeFrame.src = "about:blank";
  els.youtubeFrame.classList.add("is-hidden");
}

function closeYoutubePopup() {
  if (!els.youtubePopup || !els.youtubePopupFrame) return;
  els.youtubePopupFrame.src = "about:blank";
  els.youtubePopup.classList.add("is-hidden");
}

function openYoutubePopup(url) {
  if (!els.youtubePopup || !els.youtubePopupFrame) return false;
  const embed = youtubeEmbedUrl(url, true);
  if (!embed) return false;
  els.youtubePopup.classList.remove("is-hidden");
  if (els.youtubePopupFrame.src !== embed) els.youtubePopupFrame.src = embed;
  return true;
}

function postYoutubeCommand(command) {
  if (!els.youtubeFrame?.contentWindow) return;
  const payload = JSON.stringify({ event: "command", func: command, args: [] });
  els.youtubeFrame.contentWindow.postMessage(payload, "https://www.youtube.com");
}

function isIOSBrowser() {
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isMobileBrowser() {
  return window.matchMedia?.("(pointer: coarse)")?.matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

function openYoutubeInNewTab(url) {
  try {
    const watchUrl = (() => {
      const id = getYoutubeVideoId(url);
      return id ? `https://www.youtube.com/watch?v=${encodeURIComponent(id)}` : url;
    })();
    window.open(watchUrl, "_blank", "noopener,noreferrer");
    popupMessage("YouTube: Yeni sekmede başlatıldı. Ses için lütfen oradan oynatın.");
    return true;
  } catch {
    return false;
  }
}

function startYoutubePlayer(url, { initiatedByUser } = { initiatedByUser: false }) {
  if (!els.youtubeFrame) return false;
  if (isAndroidApp() && initiatedByUser) {
    const id = getYoutubeVideoId(url);
    const watchUrl = id ? `https://www.youtube.com/watch?v=${encodeURIComponent(id)}&playsinline=1` : url;
    try {
      window.AndroidAudio?.openYoutubePopup?.(watchUrl);
      popupMessage("YouTube: Popup açıldı. Ses için oynatıcıya dokun.");
      return true;
    } catch {
      // fallback to iframe embed
    }
  }
  // Mobile browsers (especially iOS Safari) often block iframe audio autoplay.
  // Prefer opening YouTube in an in-app popup when initiated by user.
  if (!isAndroidApp() && initiatedByUser && (isIOSBrowser() || isMobileBrowser())) {
    return openYoutubePopup(url);
  }

  const embed = youtubeEmbedUrl(url, true);
  if (!embed) return false;
  els.audio.pause();
  els.audio.removeAttribute("src");
  els.audio.load();
  els.youtubeFrame.classList.remove("is-hidden");
  if (els.youtubeFrame.src !== embed) els.youtubeFrame.src = embed;
  return true;
}

function currentListUrl() {
  return activeListUrl;
}

function currentListLabel() {
  return "Kanal listesi";
}

function updateModeUi() {
  if (els.brandTitle) {
    els.brandTitle.textContent = "Radio Dinle - 58";
  }
  if (els.brandSubtitle) {
    const path = currentListUrl();
    els.brandSubtitle.innerHTML = `Web radyo • Favoriler • Kanal listesi <code>${escapeHtml(path)}</code>`;
  }
}

async function assetExists(url) {
  try {
    if (location.protocol === "file:") {
      await loadTextAsset(url);
      return true;
    }
    const head = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (head.ok) return true;
    // If the server clearly says "not found" (or other client error), don't retry with GET,
    // otherwise we'd produce duplicate 404 noise in the console.
    if (head.status >= 400 && head.status < 500) return false;
  } catch {
    // ignore
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

function cityListCandidates(cityKey) {
  const key = String(cityKey || "").trim();
  if (!key) return [];
  const enc = encodeURIComponent(key);
  const list = [`${CITY_LIST_DIR}/${enc}.lst`];
  // Common Windows filename accident: trailing space before extension (e.g. "bilecik .lst")
  // Only try this variant for local file-based runs where such filenames are more likely.
  if (location.protocol === "file:" || isAndroidApp()) {
    list.push(`${CITY_LIST_DIR}/${encodeURIComponent(key + " ")}.lst`);
  }
  return list;
}

async function resolveCityListUrl(cityKey) {
  const candidates = cityListCandidates(cityKey);
  for (const url of candidates) {
    if (await assetExists(url)) return url;
  }
  return null;
}

function setActiveListUrl(url) {
  activeListUrl = url || RADIO_LIST_URL;
  updateModeUi();
}

async function filterMissingCityOptions() {
  if (!els.citySelect) return;
  const options = Array.from(els.citySelect.querySelectorAll("option"));
  const checks = options.map(async (opt) => {
    const value = String(opt.getAttribute("value") || "").trim();
    if (!value) return { opt, ok: true };
    const url = await resolveCityListUrl(value);
    return { opt, ok: Boolean(url) };
  });
  const results = await Promise.all(checks);
  for (const { opt, ok } of results) {
    if (!ok) opt.remove();
  }
}

async function applyCitySelection(cityKey, { persist } = { persist: true }) {
  const key = String(cityKey || "").trim();
  if (!key) {
    if (persist) localStorage.removeItem(LS_CITY_KEY);
    setActiveListUrl(RADIO_LIST_URL);
    return;
  }
  const url = await resolveCityListUrl(key);
  if (!url) {
    if (persist) localStorage.removeItem(LS_CITY_KEY);
    setActiveListUrl(RADIO_LIST_URL);
    return;
  }
  if (persist) localStorage.setItem(LS_CITY_KEY, key);
  setActiveListUrl(url);
}

async function onCitySelectionChanged() {
  if (!els.citySelect) return;
  const raw = String(els.citySelect.value || "");
  const key = raw.trim();
  await applyCitySelection(key, { persist: true });
  if (key) {
    const resolved = await resolveCityListUrl(key);
    if (!resolved) {
      // Remove missing entry from the list as requested.
      const opt = els.citySelect.querySelector(`option[value="${CSS.escape(raw)}"]`);
      opt?.remove();
      els.citySelect.value = "";
      await applyCitySelection("", { persist: true });
    }
  }
  activeStationKey = null;
  selectionToken++;
  stationIssue.clear();
  streamCheckCache.clear();
  els.searchInput.value = "";
  viewMode = "all";
  setViewMode("all", { restore: true });
  await loadStations({ bustCache: true });
  scheduleListHeightUpdate();
}

function makeStationKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9äöüß ._-]+/gi, "")
    .slice(0, 120);
}

function parseLst(text) {
  const blocked = getBlockedUrlsSet();
  /** @type {Map<string, { name: string, streams: string[], icon?: string }>} */
  const map = new Map();

  const lines = String(text || "").split(/\r?\n/);
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) continue;
    if (line.startsWith("#") || line.startsWith("//")) continue;

    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const name = line.slice(0, eq).trim();
    const rhs = line.slice(eq + 1).trim();
    const parts = rhs.split("|").map((p) => p.trim()).filter(Boolean);

    let url = normalizeUrl(parts[0] || "");
    const icon = parts[1] ? parts[1].trim() : "";
    if (!name || !url) continue;

    const isHttp = /^https?:\/\//i.test(url);
    if (!isHttp) continue;
    if (blocked.has(url)) continue;

    const key = makeStationKey(name);
    if (!key) continue;

    const entry = map.get(key) ?? { name, streams: [] };
    if (!entry.streams.includes(url)) entry.streams.push(url);
    if (icon && !entry.icon) entry.icon = icon;
    map.set(key, entry);
  }

  /** @type {Station[]} */
  const out = [];
  for (const [key, value] of map.entries()) {
    out.push({ key, name: value.name, streams: value.streams, icon: value.icon });
  }
  out.sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return out;
}

function setStatus(text, isError = false) {
  els.statusText.textContent = text;
  els.statusText.style.color = isError ? "rgba(255, 107, 107, 0.95)" : "";
  if (els.footerState) {
    els.footerState.textContent = text || "—";
    els.footerState.style.color = isError ? "rgba(255, 107, 107, 0.95)" : "";
  }
}

function setCount(text) {
  els.countText.textContent = text;
  if (els.footerCount) {
    els.footerCount.textContent = text || "0 Kanal";
  }
}

function updateTabLabels() {
  const favs = getFavoritesSet();
  els.tabAll.textContent = `Tümü (${stations.length})`;
  els.tabFav.textContent = `Favoriler (${favs.size})`;
}

function setPlayerState(text) {
  els.playerState.textContent = text;
  if (els.carFooterStatus) {
    const raw = String(text || "—");
    const isPlaying = raw === "Çalıyor";
    els.carFooterStatus.textContent = isPlaying ? "Çalıyor ..." : raw;
    els.carFooterStatus.classList.toggle("is-ok", isPlaying);
  }
  if (els.footerNow) {
    const raw = String(text || "—");
    let label = "—";
    let color = "";
    if (raw === "Çalıyor") {
      label = "Çalıyor ...";
      color = "rgba(87, 227, 163, 0.95)";
    } else if (/^Bağlanıyor/i.test(raw)) {
      label = "Bağlantı kuruluyor ...";
      color = "rgba(255, 255, 255, 0.75)";
    } else if (/Tamponlanıyor|Veri bekleniyor/i.test(raw)) {
      label = raw;
      color = "rgba(208, 166, 59, 0.95)";
    } else if (/Hata/i.test(raw)) {
      label = "Bağlantı sorunu oluştu!";
      color = "rgba(255, 107, 107, 0.95)";
    } else if (/Duraklatıldı/i.test(raw)) {
      label = raw;
      color = "rgba(255, 255, 255, 0.75)";
    } else if (/Durduruldu|Bitti/i.test(raw)) {
      label = "—";
      color = "";
    }

    els.footerNow.textContent = label;
    els.footerNow.style.color = color;
  }
  updateCarModePlayPauseButton();
}

function showStationNameInStatus() {
  const st = getActiveStation();
  if (!st?.name) return;
  setStatus(st.name);
}

function setPlayerError(text) {
  els.playerError.textContent = text;
  const raw = String(text || "").trim();
  const carMsg = raw && raw !== "—" ? "Bağlantı sorunu oluştu!" : "—";
  if (els.carFooterError) els.carFooterError.textContent = carMsg;
}

function popupMessage(text) {
  const old = document.querySelector(".app-popup");
  old?.remove();

  const box = document.createElement("div");
  box.className = "app-popup";
  box.setAttribute("role", "status");
  box.setAttribute("aria-live", "polite");

  const message = document.createElement("div");
  message.className = "app-popup__text";
  message.textContent = text;

  const close = document.createElement("button");
  close.className = "app-popup__close";
  close.type = "button";
  close.setAttribute("aria-label", "Kapat");
  close.textContent = "×";
  close.addEventListener("click", () => box.remove());

  box.append(message, close);
  document.body.appendChild(box);

  window.setTimeout(() => box.classList.add("is-visible"), 20);
  window.setTimeout(() => {
    box.classList.remove("is-visible");
    window.setTimeout(() => box.remove(), 220);
  }, 4200);
}

function isAndroidApp() {
  return Boolean(window.AndroidAudio);
}

function recordingSavePathText(fileName = "") {
  const name = fileName ? `\nDosya: ${fileName}` : "";
  if (isAndroidApp()) return `Kayıt yolu: Downloads/WebRadyo${name}`;
  return `Kayıt yolu: Tarayıcı indirme klasörü\nWindows: C:\\Users\\sivas\\Downloads${name}`;
}

function compareVersions(a, b) {
  const left = String(a || "0").split(".").map((part) => parseInt(part, 10) || 0);
  const right = String(b || "0").split(".").map((part) => parseInt(part, 10) || 0);
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i++) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function setUpdateStatus(text = "", available = false) {
  if (!els.updateStatus) return;
  els.updateStatus.textContent = text;
  els.updateStatus.classList.toggle("is-hidden", !text);
  els.updateStatus.classList.toggle("is-update-available", available);
}

function showAndroidUpdatePrompt(apkUrl, serverVersion) {
  document.querySelector(".update-notice")?.remove();
  const box = document.createElement("div");
  box.className = "update-notice";
  const safeVersion = String(serverVersion || "").trim();
  const heading = safeVersion ? `Güncelleme mevcut v${safeVersion}!` : "Güncelleme mevcut!";
  box.innerHTML = `
    <div class="update-box" role="dialog" aria-modal="true" aria-label="Güncelleme mevcut">
      <h3>${heading}</h3>
      <p>İndirilsin mi?</p>
      <div class="update-actions">
        <button id="updateYesBtn" type="button">Evet</button>
        <button id="updateNoBtn" class="secondary" type="button">Hayır</button>
      </div>
    </div>
  `;
  document.body.appendChild(box);
  document.getElementById("updateNoBtn")?.addEventListener("click", () => box.remove());
  document.getElementById("updateYesBtn")?.addEventListener("click", () => {
    box.style.pointerEvents = "none";
    box.style.opacity = "0";
    box.style.visibility = "hidden";
    window.setTimeout(() => {
      box.remove();
      if (window.AndroidAudio?.downloadAndInstallApk) {
        window.AndroidAudio.downloadAndInstallApk(apkUrl);
        return;
      }
      window.location.href = apkUrl;
    }, 120);
  });
}

async function checkAndroidUpdateVersion() {
  if (!isAndroidApp()) return;
  setUpdateStatus("");
  try {
    const res = await fetch(VERSION_JSON_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("version.json nicht erreichbar");
    const data = await res.json();
    const serverVersion = data.version;
    if (!serverVersion) throw new Error("version fehlt");
    if (compareVersions(serverVersion, APP_VERSION) <= 0) return;

    const apkUrl = data.apkUrl || APK_DOWNLOAD_URL;
    setUpdateStatus(`Güncelleme mevcut v${serverVersion}`, true);
    showAndroidUpdatePrompt(apkUrl, serverVersion);
  } catch {
    setUpdateStatus("");
  }
}

let playOkFlip = false;
function setPlayOkToggle(isOn) {
  const on = Boolean(isOn);
  if (!on) playOkFlip = false;
  els.playBtn?.classList.toggle("is-okalt", on && playOkFlip);
  els.compactPlayBtn?.classList.toggle("is-okalt", on && playOkFlip);
}

function notifyNativePlayback(playing) {
  try {
    window.AndroidAudio?.setPlaying(Boolean(playing));
  } catch {
    // Android bridge is available only inside the APK WebView.
  }
}

function pad2(n) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function runtimeLabel(ms) {
  return formatDuration(ms);
}

function sanitizeFilePart(value) {
  return String(value || "WebRadyo")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "WebRadyo";
}

function inferRecordingExt(url) {
  const clean = String(url || "").split("?")[0].toLowerCase();
  if (/\.m3u8$/.test(clean)) return "m3u8";
  if (/\.(aac|m4a)$/.test(clean)) return "aac";
  if (/\.ogg$|\.oga$|\.opus$/.test(clean)) return "ogg";
  return "mp3";
}

function recordingFileName(st, ext) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+z$/i, "").replace("T", "_");
  return `WebRadyo_${sanitizeFilePart(st?.name)}_${stamp}.${ext}`;
}

function setRecordingUi(active, message = "") {
  recording = Boolean(active);
  els.compactRecordBtn?.classList.toggle("is-recording", recording);
  els.compactRecordBtn?.classList.toggle("is-recording-alt", false);
  updateRecordButtonState();
  if (els.compactRecordBtn) {
    els.compactRecordBtn.title = recording ? "Kaydı durdur" : "Kayıt başlat";
    els.compactRecordBtn.setAttribute("aria-label", recording ? "Kaydı durdur" : "Kayıt başlat");
  }
  els.quickTime?.classList.toggle("is-recording", recording);
  if (!recording) {
    recordingStationKey = null;
    updateMainRuntime();
    stopRecordingBlink();
    renderList();
  }
  if (message) setPlayerError(message);
}

function updateRecordingTime() {
  if (!recording) return;
  const text = runtimeLabel(Date.now() - recordingStartedAt);
  if (els.quickTime) els.quickTime.textContent = text;
}

function updatePlaybackStationTime() {
  if (!playbackStartedAt || recording) return;
  updateMainRuntime();
}

function updateMainRuntime() {
  if (!els.quickTime) return;
  if (recording) {
    els.quickTime.textContent = runtimeLabel(Date.now() - recordingStartedAt);
    els.quickTime.classList.add("is-recording");
  } else if (playbackStartedAt) {
    quickTimeConnecting = false;
    els.quickTime.textContent = runtimeLabel(Date.now() - playbackStartedAt);
    els.quickTime.classList.remove("is-recording");
    els.quickTime.classList.remove("is-connecting");
    els.quickTime.classList.remove("is-timeout");
  } else {
    if (!quickTimeConnecting) {
      const st = getActiveStation();
      els.quickTime.textContent = st?.name || "—";
    }
    els.quickTime.classList.remove("is-recording");
    if (!quickTimeConnecting) els.quickTime.classList.remove("is-connecting");
    if (!quickTimeConnecting) els.quickTime.classList.remove("is-timeout");
  }
}

function setQuickTimeConnectingText() {
  if (!els.quickTime || recording) return;
  quickTimeConnecting = true;
  els.quickTime.textContent = "Bağlantı kuruluyor ...";
  els.quickTime.classList.remove("is-recording");
  els.quickTime.classList.add("is-connecting");
  els.quickTime.classList.remove("is-timeout");
}

function setQuickTimeTimeoutText() {
  if (!els.quickTime || recording) return;
  quickTimeConnecting = true;
  els.quickTime.textContent = "Bağlantı kurulamıyor ...";
  els.quickTime.classList.remove("is-recording");
  els.quickTime.classList.remove("is-connecting");
  els.quickTime.classList.add("is-timeout");
}

function stopConnectionTimeout() {
  if (connectionTimeoutTimer) {
    window.clearTimeout(connectionTimeoutTimer);
    connectionTimeoutTimer = 0;
  }
  connectionTimeoutStationKey = null;
}

function startConnectionTimeout({ tokenAtStart }) {
  stopConnectionTimeout();
  connectionTimeoutToken = tokenAtStart;
  connectionTimeoutStationKey = activeStationKey;
  if (!connectionTimeoutStationKey) return;
  if (isYoutubeUrl(getActiveStreamUrl())) return;
  connectionTimeoutTimer = window.setTimeout(() => {
    if (selectionToken !== connectionTimeoutToken) return;
    if (activeStationKey !== connectionTimeoutStationKey) return;
    if (!els.audio || !els.audio.paused) return; // already playing
    setQuickTimeTimeoutText();
    setTimeout(() => {
      if (selectionToken !== connectionTimeoutToken) return;
      nextStation({ initiatedByUser: false });
      void play({ initiatedByUser: false });
    }, 400);
  }, 5000);
}

function updateRecordButtonState() {
  const canRecord = Boolean(activeStationKey);
  const playerRunning = Boolean(els.audio?.src && !els.audio.paused && !els.audio.ended);
  const isYoutube = isYoutubeUrl(getActiveStreamUrl());
  if (els.compactRecordBtn) {
    const enabled = canRecord && !isYoutube && (playerRunning || recording);
    els.compactRecordBtn.disabled = !enabled;
    els.compactRecordBtn.classList.toggle("is-record-ready", canRecord && !isYoutube && playerRunning && !recording);
  }
}

function startPlaybackTimer() {
  stopPlaybackTimer();
  playbackStartedAt = Date.now();
  playbackStationKey = activeStationKey;
  renderList();
  updatePlaybackStationTime();
  playbackTimer = window.setInterval(updatePlaybackStationTime, 1000);
}

function stopPlaybackTimer({ keepElapsed = false } = {}) {
  if (playbackTimer) {
    window.clearInterval(playbackTimer);
    playbackTimer = 0;
  }
  if (!keepElapsed) {
    playbackStartedAt = 0;
    playbackStationKey = null;
    updateMainRuntime();
  }
}

function startRecordingTimer() {
  stopRecordingTimer();
  updateRecordingTime();
  recordingTimer = window.setInterval(updateRecordingTime, 1000);
}

function stopRecordingTimer() {
  if (recordingTimer) {
    window.clearInterval(recordingTimer);
    recordingTimer = 0;
  }
}

function startRecordingBlink() {
  stopRecordingBlink();
  recordingBlinkAlt = false;
  recordingBlinkTimer = window.setInterval(() => {
    recordingBlinkAlt = !recordingBlinkAlt;
    els.compactRecordBtn?.classList.toggle("is-recording-alt", recordingBlinkAlt);
  }, 650);
}

function stopRecordingBlink() {
  if (recordingBlinkTimer) {
    window.clearInterval(recordingBlinkTimer);
    recordingBlinkTimer = 0;
  }
  recordingBlinkAlt = false;
  els.compactRecordBtn?.classList.toggle("is-recording-alt", false);
}

function setStreamCheck(text, kind = "neutral") {
  els.streamCheck.textContent = text;
  if (kind === "ok") els.streamCheck.style.color = "rgba(87, 227, 163, 0.95)";
  else if (kind === "bad") els.streamCheck.style.color = "rgba(255, 107, 107, 0.95)";
  else els.streamCheck.style.color = "";
  if (els.carFooterCheck) els.carFooterCheck.textContent = String(text || "—");
}

function abbreviateUrl(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname.length > 1 ? u.pathname : ""}`;
  } catch {
    return url;
  }
}

function stationIconSrc(station) {
  const icon = station?.icon;
  if (typeof icon === "string" && icon.trim()) return icon.trim();
  return ICON_PLACEHOLDER;
}

function setNowMeta(text) {
  els.nowMeta.textContent = text || "—";
}

async function fetchIcyMetadata(url) {
  if (metaAbortController) metaAbortController.abort();
  metaAbortController = new AbortController();

  const timeoutId = setTimeout(() => metaAbortController?.abort(), 6000);
  try {
    const res = await fetch(ICY_META_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: metaAbortController.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function refreshNowPlaying() {
  const url = getActiveStreamUrl();
  if (!url) {
    setNowMeta("—");
    return;
  }

  // ICY metadata generally only works for MP3/AAC streams; HLS won't expose it this way.
  if (/\.m3u8(\?|#|$)/i.test(url)) {
    setNowMeta("—");
    return;
  }

  const data = await fetchIcyMetadata(url);
  const title = (data && typeof data.streamTitle === "string") ? data.streamTitle.trim() : "";
  if (title && title !== lastMetaTitle) {
    lastMetaTitle = title;
    setNowMeta(title);
  } else if (!title && !lastMetaTitle) {
    setNowMeta("—");
  }
}

function stopNowPlayingPoll() {
  if (metaTimer) {
    clearInterval(metaTimer);
    metaTimer = 0;
  }
  if (metaAbortController) {
    metaAbortController.abort();
    metaAbortController = null;
  }
}

function startNowPlayingPoll() {
  stopNowPlayingPoll();
  lastMetaTitle = "";
  setNowMeta("—");
  void refreshNowPlaying();
  metaTimer = setInterval(() => void refreshNowPlaying(), 15000);
}

function getActiveStation() {
  if (!activeStationKey) return null;
  return stations.find((s) => s.key === activeStationKey) ?? null;
}

function getActiveStreamUrl() {
  const st = getActiveStation();
  if (!st) return null;
  const idx = Math.max(0, Math.min(st.streams.length - 1, Number.parseInt(els.streamSelect.value || "0", 10) || 0));
  return st.streams[idx] ?? null;
}

function findNextUnblockedIndex(station, startIdx) {
  if (!streamDiagnosticsEnabled) return startIdx;
  const blocked = getBlockedUrlsSet();
  if (station.streams.length === 0) return 0;

  const hasAnyUnblocked = station.streams.some((u) => !blocked.has(u));
  if (!hasAnyUnblocked) return startIdx;

  for (let offset = 0; offset < station.streams.length; offset++) {
    const idx = (startIdx + offset) % station.streams.length;
    if (!blocked.has(station.streams[idx])) return idx;
  }
  return startIdx;
}

async function probeStreamUrl(url, timeoutMs = 5000) {
  const now = Date.now();
  const cached = streamCheckCache.get(url);
  if (cached && now - cached.checkedAt < STREAM_CHECK_TTL_MS) return cached;

  /** @type {{ status: "ok" | "error" | "timeout", checkedAt: number }} */
  const result = await new Promise((resolve) => {
    const probe = new Audio();
    probe.preload = "metadata";
    probe.muted = true;

    let done = false;
    const finish = (status) => {
      if (done) return;
      done = true;
      try {
        probe.pause();
        probe.removeAttribute("src");
        probe.load();
      } catch {
        // ignore
      }
      resolve({ status, checkedAt: Date.now() });
    };

    const onOk = () => finish("ok");
    const onErr = () => finish("error");

    probe.addEventListener("loadedmetadata", onOk, { once: true });
    probe.addEventListener("canplay", onOk, { once: true });
    probe.addEventListener("error", onErr, { once: true });

    setTimeout(() => finish("timeout"), timeoutMs);
    probe.src = url;
    probe.load();
  });

  streamCheckCache.set(url, result);
  return result;
}

let checkToken = 0;
async function checkCurrentStream({ fastOnly } = { fastOnly: false }) {
  if (!STREAM_CHECK_ENABLED) {
    setStreamCheck("—", "neutral");
    return;
  }
  const tokenAtStart = selectionToken;
  const stationKeyAtStart = activeStationKey;
  const url = getActiveStreamUrl();
  if (!url) {
    setStreamCheck("—", "neutral");
    return;
  }
  if (isYoutubeUrl(url)) {
    setStreamCheck("YouTube", "neutral");
    return;
  }

  // Quick hint for HLS playlists: often not supported in Chrome/Firefox on Windows.
  if (/\.m3u8(\?|#|$)/i.test(url)) {
    setStreamCheck("HLS (tarayıcıya bağlı)", "neutral");
    if (fastOnly) return;
  } else {
    setStreamCheck("Kontrol ediliyor...", "neutral");
  }

  const token = ++checkToken;
  const res = await probeStreamUrl(url, 5000);
  if (token !== checkToken) return;

  const stationKeyForUrl = findStationKeyForUrl(url) ?? stationKeyAtStart;
  const isStillCurrentSelection = activeStationKey === stationKeyAtStart && getActiveStreamUrl() === url;

  if (res.status === "ok") {
    setStreamCheck("OK", "ok");
    if (streamDiagnosticsEnabled && stationKeyForUrl) stationIssue.delete(stationKeyForUrl);
    // Visual feedback without animation: alternate blue/yellow on each OK check while playing
    if (!els.audio.paused) {
      playOkFlip = !playOkFlip;
      setPlayOkToggle(true);
    } else {
      setPlayOkToggle(false);
    }
  } else if (res.status === "error") {
    setStreamCheck("Hata: desteklenen kaynak yok", "bad");
    if (streamDiagnosticsEnabled && stationKeyForUrl) stationIssue.set(stationKeyForUrl, "unsupported");
    if (streamDiagnosticsEnabled) rememberBlockedUrl(url);
    setPlayOkToggle(false);
  } else {
    setStreamCheck("Belirsiz (zaman aşımı)", "neutral");
    if (streamDiagnosticsEnabled && stationKeyForUrl) stationIssue.set(stationKeyForUrl, "timeout");
    if (streamDiagnosticsEnabled) rememberBlockedUrl(url);
    setPlayOkToggle(false);
  }

  if (streamDiagnosticsEnabled) renderList();
}

function applyActiveToPlayer({ skipCheck } = { skipCheck: false }) {
  const st = getActiveStation();
  const favs = getFavoritesSet();

  if (!st) {
    els.nowTitle.textContent = "—";
    els.nowStreamChip.textContent = "—";
    els.nowLogo.src = ICON_PLACEHOLDER;
    setNowMeta("—");
    if (els.footerNow) els.footerNow.textContent = "—";
    els.streamSelect.innerHTML = "";
    els.streamSelect.disabled = true;
    els.favToggleBtn.disabled = true;
    els.playBtn.disabled = true;
    els.pauseBtn.disabled = true;
    els.stopBtn.disabled = true;
    els.prevBtn.disabled = getFilteredStations().length === 0;
    els.nextBtn.disabled = getFilteredStations().length === 0;
    els.randomBtn.disabled = getFilteredStations().length === 0;
    if (els.compactPlayBtn) els.compactPlayBtn.disabled = true;
    if (els.compactPauseBtn) els.compactPauseBtn.disabled = true;
    if (els.compactPrevBtn) els.compactPrevBtn.disabled = getFilteredStations().length === 0;
    if (els.compactNextBtn) els.compactNextBtn.disabled = getFilteredStations().length === 0;
    if (els.compactRandomBtn) els.compactRandomBtn.disabled = getFilteredStations().length === 0;
    updateRecordButtonState();
    setStreamCheck("—", "neutral");
    updateCarModeNowPlaying();
    return;
  }

  els.nowTitle.textContent = st.name;
  // footerNow intentionally not set to station name (otherwise station name appears twice with statusText)
  els.favToggleBtn.disabled = false;
  els.favToggleBtn.textContent = favs.has(st.key) ? "★ Favori" : "☆ Favori";

  els.streamSelect.disabled = st.streams.length <= 1;
  const blocked = getBlockedUrlsSet();
  const hasAnyUnblocked = st.streams.some((u) => !blocked.has(u));

  els.streamSelect.innerHTML = st.streams
    .map((url, idx) => {
      const isBlocked = hasAnyUnblocked && blocked.has(url);
      const label = `Yayın ${idx + 1}${isYoutubeUrl(url) ? " (YouTube)" : ""}${/m3u8/i.test(url) ? " (HLS)" : ""}${isBlocked ? " (engelli)" : ""}`;
      return `<option value="${idx}" ${isBlocked ? "disabled" : ""}>${label}</option>`;
    })
    .join("");

  let pref = Math.max(0, Math.min(st.streams.length - 1, getStreamPref(st.key)));
  pref = findNextUnblockedIndex(st, pref);
  els.streamSelect.value = String(pref);
  setStreamPref(st.key, pref);

  els.nowStreamChip.textContent = abbreviateUrl(st.streams[pref]);
  els.nowStreamChip.title = st.streams[pref];
  els.nowLogo.src = stationIconSrc(st);
  setNowMeta(st.group || "—");
  updateCarModeNowPlaying();

  els.playBtn.disabled = false;
  els.pauseBtn.disabled = false;
  els.stopBtn.disabled = false;
  els.prevBtn.disabled = getFilteredStations().length === 0;
  els.nextBtn.disabled = getFilteredStations().length === 0;
  els.randomBtn.disabled = getFilteredStations().length === 0;
  if (els.compactPlayBtn) els.compactPlayBtn.disabled = false;
  if (els.compactPauseBtn) els.compactPauseBtn.disabled = false;
  if (els.compactPrevBtn) els.compactPrevBtn.disabled = getFilteredStations().length === 0;
  if (els.compactNextBtn) els.compactNextBtn.disabled = getFilteredStations().length === 0;
  if (els.compactRandomBtn) els.compactRandomBtn.disabled = getFilteredStations().length === 0;
  updateRecordButtonState();

  // Background check of the currently selected stream (does not autoplay).
  if (!skipCheck) void checkCurrentStream({ fastOnly: true });
}

function renderList() {
  const favs = getFavoritesSet();
  let list = getFilteredStations();

  if (stations.length > 0 && list.length === 0) {
    viewMode = "all";
    els.searchInput.value = "";
    list = stations.slice();
  }

  updateTabLabels();
  setCount(`${list.length} Kanal${viewMode === "fav" ? " (Favoriler)" : ""}`);

  if (list.length === 0) {
    els.stationList.innerHTML = `<div class="muted" style="padding: 10px 6px;">Kanal bulunamadı.</div>`;
    return;
  }

  els.stationList.innerHTML = list
    .map((s, idx) => {
      const isActive = s.key === activeStationKey;
      const isFav = favs.has(s.key);
      const issue = streamDiagnosticsEnabled ? stationIssue.get(s.key) : null;
      const isTimeout = issue === "timeout" || issue === "unsupported";
      const hasYoutube = s.streams.some((url) => isYoutubeUrl(url));
      const badge = `<span class="badge">${s.type === "tv" ? "TV" : (hasYoutube ? "YouTube" : `${s.streams.length} Yayın`)}</span>`;
      const sub = s.type === "tv" ? (s.group || "TV") : (hasYoutube ? "YouTube yayın" : (s.streams.length > 1 ? `${s.streams.length} yayın mevcut` : abbreviateUrl(s.streams[0])));
      return `
        <div class="item ${isActive ? "is-active" : ""} ${isTimeout ? "is-timeout" : ""}" role="listitem" data-key="${s.key}">
          <div class="item__main">
            <img class="logo" alt="" loading="lazy" src="${escapeHtml(stationIconSrc(s))}" />
            <div>
              <div class="item__title">${idx + 1}. ${escapeHtml(s.name)}</div>
              <div class="item__sub">${escapeHtml(sub)}</div>
            </div>
          </div>
          <div class="item__actions">
            <button class="starbtn ${isFav ? "is-fav" : ""}" type="button" data-action="fav" data-key="${s.key}" title="${isFav ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}" aria-label="${isFav ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}">
              ${isFav ? "★" : "☆"}
            </button>
            ${badge}
          </div>
        </div>
      `;
    })
    .join("");
}

function scrollActiveIntoView(behavior = "auto") {
  const list = els.stationList;
  if (!list) return;
  const el = list.querySelector?.(".item.is-active");
  if (!el) return;

  // Keep the active item as the top-most visible row (topIndex behavior),
  // and jump instead of animating for better performance.
  const listRect = list.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const padTop = Number.parseFloat(getComputedStyle(list).paddingTop || "0") || 0;
  let targetTop = list.scrollTop + (elRect.top - listRect.top) - padTop;
  const maxTop = Math.max(0, list.scrollHeight - list.clientHeight);
  targetTop = Math.max(0, Math.min(maxTop, targetTop));

  try {
    list.scrollTo({ top: targetTop, behavior });
  } catch {
    list.scrollTop = targetTop;
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setViewMode(mode, { restore } = { restore: false }) {
  viewMode = mode;
  const isAll = mode === "all";
  els.tabAll.classList.toggle("is-active", isAll);
  els.tabFav.classList.toggle("is-active", !isAll);
  els.tabAll.setAttribute("aria-selected", String(isAll));
  els.tabFav.setAttribute("aria-selected", String(!isAll));
  renderList();
  applyActiveToPlayer();

  // If we switch back to "All" after playing from favorites, ensure the active station is visible.
  if (viewMode === "all" && activeStationKey) {
    const visible = getFilteredStations().some((s) => s.key === activeStationKey);
    if (!visible && els.searchInput.value.trim()) {
      els.searchInput.value = "";
      renderList();
    }
  }
  scrollActiveIntoView("auto");
  scheduleUiSave();
}

function getFilteredStations() {
  const favs = getFavoritesSet();
  const q = els.searchInput.value.trim().toLowerCase();

  let list = stations;
  if (viewMode === "fav") list = list.filter((s) => favs.has(s.key));
  if (q) list = list.filter((s) => s.name.toLowerCase().includes(q));
  return list;
}

function loadTextAsset(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.overrideMimeType?.("text/plain; charset=utf-8");
    xhr.onload = () => {
      if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) {
        resolve(xhr.responseText || "");
      } else {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Kanal listesi okunamadı."));
    xhr.send();
  });
}

async function loadStations({ bustCache } = { bustCache: false }) {
  const listUrl = currentListUrl();
  setStatus(`${currentListLabel()} yükleniyor...`);
  setPlayerError("—");

  const url = bustCache ? `${listUrl}?t=${Date.now()}` : listUrl;
  let text = "";
  try {
    if (location.protocol === "file:") {
      text = await loadTextAsset(listUrl);
    } else {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      text = await res.text();
    }
  } catch (err) {
    setStatus(`Yükleme hatası: ${String(err?.message || err)}`, true);
    setCount("");
    stations = [];
    renderList();
    return;
  }

  stations = parseLst(text);
  setStatus(`${currentListLabel()} yüklendi.`);
  setCount(`${stations.length} Kanal`);
  updateTabLabels();

  if (stations.length > 0 && !activeStationKey) {
    activeStationKey = stations[0].key;
  } else if (activeStationKey && !stations.some((s) => s.key === activeStationKey)) {
    activeStationKey = stations[0]?.key ?? null;
  }

  applyActiveToPlayer();
  renderList();
}

function selectStation(key) {
  if (recording && key !== activeStationKey) {
    stopRecording();
  }
  if (key !== activeStationKey) {
    stopPlaybackTimer();
    stopYoutubePlayer();
  }
  selectionToken++;
  activeStationKey = key;
  applyActiveToPlayer();
  renderList();
  updateCarModeNowPlaying();
  scrollActiveIntoView("auto");
  setPlayerError("—");
  scheduleUiSave();
}

function setAudioSourceForActiveStation() {
  const st = getActiveStation();
  if (!st) return;

  let idx = Math.max(0, Math.min(st.streams.length - 1, Number.parseInt(els.streamSelect.value || "0", 10) || 0));
  idx = findNextUnblockedIndex(st, idx);
  els.streamSelect.value = String(idx);

  const url = st.streams[idx];
  setStreamPref(st.key, idx);

  els.nowStreamChip.textContent = abbreviateUrl(url);
  els.nowStreamChip.title = url;
  els.nowLogo.src = stationIconSrc(st);
  updateCarModeNowPlaying();

  if (isYoutubeUrl(url)) {
    els.audio.pause();
    els.audio.removeAttribute("src");
    els.audio.load();
    setStreamCheck("YouTube", "neutral");
    updateRecordButtonState();
    return;
  }

  stopYoutubePlayer();
  if (els.audio.src !== url) {
    els.audio.src = url;
    els.audio.load();
  }

  void checkCurrentStream();
}

async function play({ initiatedByUser } = { initiatedByUser: false }) {
  const tokenAtStart = selectionToken;
  const st = getActiveStation();
  if (!st) return;
  if (initiatedByUser) lastPlaybackRequestAt = Date.now();
  setStatus("Sender wechsel");
  setQuickTimeConnectingText();
  startConnectionTimeout({ tokenAtStart });
  setAudioSourceForActiveStation();
  const urlForThisPlay = getActiveStreamUrl();

  setPlayerState("Bağlanıyor...");
  setPlayerError("—");
  if (isYoutubeUrl(urlForThisPlay)) {
    if (startYoutubePlayer(urlForThisPlay, { initiatedByUser })) {
      setPlayerState("Çalıyor");
      setStreamCheck("YouTube", "neutral");
      setPlayOkToggle(false);
      notifyNativePlayback(true);
      updateRecordButtonState();
      startPlaybackTimer();
      showStationNameInStatus();
    } else {
      stopConnectionTimeout();
      setPlayerState("Durduruldu");
      setPlayerError("YouTube bağlantısı açılamadı.");
    }
    return;
  }

  try {
    await els.audio.play();
    setPlayerState("Çalıyor");
    setPlayOkToggle(false);
    notifyNativePlayback(true);
    updateRecordButtonState();
    startNowPlayingPoll();
    void checkCurrentStream();
  } catch (err) {
    setPlayerState("Durduruldu");
    setPlayOkToggle(false);
    notifyNativePlayback(false);
    updateRecordButtonState();
    const msg = String(err?.message || err);
    setPlayerError(msg);

    const url = urlForThisPlay ?? getActiveStreamUrl();
    if (/no supported source/i.test(msg) || /notsupportederror/i.test(msg)) {
      const keyForUrl = findStationKeyForUrl(url) ?? activeStationKey;
      if (streamDiagnosticsEnabled && keyForUrl) stationIssue.set(keyForUrl, "unsupported");
      markStreamBad(url, "unsupported");
      if (streamDiagnosticsEnabled) {
        if (activeStationKey === keyForUrl && getActiveStreamUrl() === url) applyActiveToPlayer({ skipCheck: true });
        renderList();
      }
    }
  }
}

function pause({ initiatedByUser = false } = {}) {
  if (recording) stopRecording();
  if (isYoutubeUrl(getActiveStreamUrl())) {
    postYoutubeCommand("pauseVideo");
    // Mobile fallback may be running in a new tab, so also hide the iframe.
    stopYoutubePlayer();
    closeYoutubePopup();
  }
  stopConnectionTimeout();
  if (initiatedByUser) manualPauseRequestedAt = Date.now();
  els.audio.pause();
  setPlayerState("Duraklatıldı");
  setPlayOkToggle(false);
  notifyNativePlayback(false);
  updateRecordButtonState();
  stopNowPlayingPoll();
  stopPlaybackTimer();
}

function stop() {
  if (recording) stopRecording();
  stopYoutubePlayer();
  closeYoutubePopup();
  stopConnectionTimeout();
  els.audio.pause();
  els.audio.removeAttribute("src");
  els.audio.load();
  setPlayerState("Durduruldu");
  setPlayOkToggle(false);
  notifyNativePlayback(false);
  updateRecordButtonState();
  setStreamCheck("—", "neutral");
  stopNowPlayingPoll();
  stopPlaybackTimer();
  setNowMeta("—");
}

async function startWebRecording(url, fileName) {
  recordingAbortController = new AbortController();
  recordingChunks = [];
  const response = await fetch(url, { cache: "no-store", signal: recordingAbortController.signal });
  if (!response.ok || !response.body) throw new Error(`Kayıt başlatılamadı: HTTP ${response.status}`);
  recordingReader = response.body.getReader();
  while (true) {
    const { done, value } = await recordingReader.read();
    if (done || !recording) break;
    if (value && value.length) recordingChunks.push(value);
  }
  recordingReader = null;
  if (!recordingChunks.length) {
    setPlayerError("Kayıt verisi alınamadı.");
    return;
  }
  const blob = new Blob(recordingChunks, { type: "audio/mpeg" });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  setPlayerError(`Kayıt indirildi: ${fileName}`);
  popupMessage(`Aufnahme gestoppt.\n${recordingSavePathText(fileName)}`);
}

async function startRecording() {
  const st = getActiveStation();
  const url = getActiveStreamUrl();
  if (!st || !url) return;
  const ext = inferRecordingExt(url);
  if (ext === "m3u8") {
    setPlayerError("HLS yayını doğrudan dosya olarak kaydedilmiyor.");
    return;
  }
  if (isYoutubeUrl(url)) {
    setPlayerError("YouTube yayınları kayıt için desteklenmiyor.");
    return;
  }

  if (els.audio.paused) {
    await play({ initiatedByUser: true });
  }

  const fileName = recordingFileName(st, ext);
  recordingStationKey = st.key;
  recordingStartedAt = Date.now();
  setRecordingUi(true, "Kayıt başladı.");
  popupMessage("Aufnahme gestartet.");
  startRecordingTimer();
  startRecordingBlink();
  renderList();

  try {
    if (window.AndroidAudio?.startRecording) {
      window.AndroidAudio.startRecording(url, st.name, fileName);
      return;
    }
  } catch (err) {
    setRecordingUi(false, String(err?.message || err));
    stopRecordingTimer();
    return;
  }

  startWebRecording(url, fileName).catch((err) => {
    if (!recording) return;
    stopRecordingTimer();
    setRecordingUi(false, String(err?.message || err));
  });
}

function stopRecording() {
  if (!recording) return;
  recording = false;
  try {
    if (window.AndroidAudio?.stopRecording) {
      window.AndroidAudio.stopRecording();
    } else {
      recordingReader?.cancel();
    }
  } catch (err) {
    setPlayerError(String(err?.message || err));
  }
  stopRecordingTimer();
  setRecordingUi(false, "Kayıt durduruldu.");
  renderList();
}

function toggleRecording() {
  if (recording) stopRecording();
  else void startRecording();
}

window.onAndroidRecordingStarted = function onAndroidRecordingStarted(fileName) {
  setRecordingUi(true, `Kayıt başladı: ${fileName || ""}`.trim());
};

window.onAndroidRecordingStopped = function onAndroidRecordingStopped(fileName) {
  stopRecordingTimer();
  setRecordingUi(false, `Kayıt kaydedildi: ${fileName || ""}`.trim());
  popupMessage(`Aufnahme gestoppt.\n${recordingSavePathText(fileName)}`);
  renderList();
};

window.onAndroidRecordingError = function onAndroidRecordingError(message) {
  stopRecordingTimer();
  setRecordingUi(false, message || "Kayıt hatası.");
  renderList();
};

function toggleFavorite() {
  const st = getActiveStation();
  if (!st) return;
  toggleFavoriteByKey(st.key);
}

function toggleFavoriteByKey(stationKey) {
  const favs = getFavoritesSet();
  if (favs.has(stationKey)) favs.delete(stationKey);
  else favs.add(stationKey);
  setFavoritesSet(favs);
  applyActiveToPlayer();
  renderList();
  updateTabLabels();
}

function nextStation({ initiatedByUser } = { initiatedByUser: true }) {
  const list = getFilteredStations();
  if (list.length === 0) return;

  let idx = list.findIndex((s) => s.key === activeStationKey);
  if (idx < 0) idx = 0;
  else idx = (idx + 1) % list.length;

  selectStation(list[idx].key);
  void play({ initiatedByUser });
}

function prevStation({ initiatedByUser } = { initiatedByUser: true }) {
  const list = getFilteredStations();
  if (list.length === 0) return;

  let idx = list.findIndex((s) => s.key === activeStationKey);
  if (idx < 0) idx = 0;
  else idx = (idx - 1 + list.length) % list.length;

  selectStation(list[idx].key);
  void play({ initiatedByUser });
}

function randomStation({ initiatedByUser } = { initiatedByUser: true }) {
  const list = getFilteredStations();
  if (list.length === 0) return;
  const idx = Math.floor(Math.random() * list.length);
  selectStation(list[idx].key);
  void play({ initiatedByUser });
}

function setVolume(v) {
  if (els.volumeRange?.disabled) return;
  const vol = Math.max(0, Math.min(1, Number(v)));
  const before = els.audio.volume;
  els.audio.volume = vol;
  // Some platforms (notably iOS Safari / some WebViews) don't allow programmatic volume changes.
  if (Math.abs(els.audio.volume - vol) > 0.001 && Math.abs(before - els.audio.volume) < 0.001) {
    els.volumeRange.disabled = true;
    els.volumeText.textContent = `Cihaz`;
    return;
  }
  els.volumeRange.value = String(vol);
  els.volumeText.textContent = `${Math.round(vol * 100)}%`;
  localStorage.setItem(LS_VOLUME_KEY, String(vol));
}

function loadVolume() {
  const raw = localStorage.getItem(LS_VOLUME_KEY);
  const v = raw == null ? 0.8 : Number(raw);
  els.volumeRange.disabled = false;
  setVolume(Number.isFinite(v) ? v : 0.8);
}

function clampStationFontSize(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 14;
  return Math.max(12, Math.min(22, Math.round(n)));
}

function clampTimeFontSize(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 21;
  return Math.max(18, Math.min(42, Math.round(n)));
}

function applyStationFontSize(value) {
  const size = clampStationFontSize(value);
  document.documentElement.style.setProperty("--station-font-size", `${size}px`);
  if (els.stationFontSizeRange) els.stationFontSizeRange.value = String(size);
  if (els.stationFontSizeValue) els.stationFontSizeValue.textContent = `${size}px`;
  return size;
}

function applyTimeFontSize(value) {
  const size = clampTimeFontSize(value);
  document.documentElement.style.setProperty("--time-font-size", `${size}px`);
  if (els.timeFontSizeRange) els.timeFontSizeRange.value = String(size);
  if (els.timeFontSizeValue) els.timeFontSizeValue.textContent = `${size}px`;
  return size;
}

function loadStationFontSize() {
  const size = applyStationFontSize(localStorage.getItem(LS_STATION_FONT_SIZE_KEY) || 14);
  localStorage.setItem(LS_STATION_FONT_SIZE_KEY, String(size));
}

function loadTimeFontSize() {
  const size = applyTimeFontSize(localStorage.getItem(LS_TIME_FONT_SIZE_KEY) || 21);
  localStorage.setItem(LS_TIME_FONT_SIZE_KEY, String(size));
}

function setStationFontSize(value) {
  const size = applyStationFontSize(value);
  localStorage.setItem(LS_STATION_FONT_SIZE_KEY, String(size));
}

function setTimeFontSize(value) {
  const size = applyTimeFontSize(value);
  localStorage.setItem(LS_TIME_FONT_SIZE_KEY, String(size));
}

function resetFontSettings() {
  setStationFontSize(14);
  setTimeFontSize(21);
}

function setSettingsOpen(open) {
  els.settingsPanel?.classList.toggle("is-hidden", !open);
  if (open) setMenuOpen(false);
}

function setMenuOpen(open) {
  els.mainMenu?.classList.toggle("is-hidden", !open);
  els.menuBtn?.setAttribute("aria-expanded", String(Boolean(open)));
}

function setCarMode(enabled) {
  document.body.classList.toggle("is-carmode", Boolean(enabled));
  els.carMode?.classList.toggle("is-hidden", !enabled);
  setCarModeZoomLocked(Boolean(enabled));
  if (enabled) {
    setMenuOpen(false);
    setSettingsOpen(false);
  }
  updateCarModeNowPlaying();
  if (enabled) {
    if (els.carFooterStatus) els.carFooterStatus.textContent = els.playerState?.textContent || "—";
    if (els.carFooterCheck) els.carFooterCheck.textContent = els.streamCheck?.textContent || "—";
    if (els.carFooterError) {
      const raw = String(els.playerError?.textContent || "").trim();
      els.carFooterError.textContent = raw && raw !== "—" ? "Bağlantı sorunu oluştu!" : "—";
    }
  }
  queueSyncCarModeIcons();
  if (!enabled) {
    requestAnimationFrame(() => scrollActiveIntoView("auto"));
  }
}

let carModeSyncQueued = false;
function queueSyncCarModeIcons() {
  if (carModeSyncQueued) return;
  carModeSyncQueued = true;
  requestAnimationFrame(() => {
    carModeSyncQueued = false;
    syncCarModeIcons();
  });
}

function syncCarModeIcons() {
  if (!els.carMode || els.carMode.classList.contains("is-hidden")) return;
  if (!els.carModeLogo || !els.carStationIcon) return;

  const rect = els.carModeLogo.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  els.carStationIcon.style.width = `${Math.round(rect.width)}px`;
  els.carStationIcon.style.height = `${Math.round(rect.height)}px`;
}

function updateCarModePlayPauseButton() {
  if (!els.carPlayBtn || !els.audio) return;
  const isPlaying = !els.audio.paused;
  els.carPlayBtn.classList.toggle("iconbtn--pause", isPlaying);
  els.carPlayBtn.classList.toggle("iconbtn--play", !isPlaying);
  els.carPlayBtn.setAttribute("aria-label", isPlaying ? "Duraklat" : "Başlat");
}

function maybeAutoStart() {
  if (autoStartAttempted) return;
  if (localStorage.getItem(LS_AUTOSTART_KEY) !== "1") return;
  if (!activeStationKey) return;
  if (!els.audio) return;
  if (!els.audio.paused) return;
  autoStartAttempted = true;
  setTimeout(() => void play({ initiatedByUser: false }), 0);
}

function updateCarModeNowPlaying() {
  if (!els.carMode || els.carMode.classList.contains("is-hidden")) return;
  const st = getActiveStation();
  const name = st?.name || "—";
  if (els.carNowTitle) els.carNowTitle.textContent = name;
  if (els.carStationIcon) {
    const src = st ? stationIconSrc(st) : "";
    if (src) {
      els.carStationIcon.src = src;
      els.carStationIcon.classList.remove("is-hidden");
    } else {
      els.carStationIcon.removeAttribute("src");
      els.carStationIcon.classList.add("is-hidden");
    }
  }
  queueSyncCarModeIcons();
  updateCarModePlayPauseButton();
  if (els.carFavBtn) {
    const favs = getFavoritesSet();
    const isFav = Boolean(activeStationKey && favs.has(activeStationKey));
    els.carFavBtn.textContent = isFav ? "★" : "☆";
    els.carFavBtn.disabled = !activeStationKey;
  }
}

function wireEvents() {
  els.menuBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    setMenuOpen(els.mainMenu?.classList.contains("is-hidden"));
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".menu-wrap")) setMenuOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenuOpen(false);
      setSettingsOpen(false);
    }
  });

  els.youtubePopupClose?.addEventListener("click", () => closeYoutubePopup());
  els.youtubePopup?.addEventListener("click", (event) => {
    if (event.target === els.youtubePopup) closeYoutubePopup();
  });
  els.settingsMenuBtn?.addEventListener("click", () => setSettingsOpen(true));
  els.carmodBtn?.addEventListener("click", () => {
    const enabled = !document.body.classList.contains("is-carmode");
    setCarMode(enabled);
  });
  els.settingsCloseBtn?.addEventListener("click", () => setSettingsOpen(false));
  els.settingsPanel?.addEventListener("click", (event) => {
    if (event.target === els.settingsPanel) setSettingsOpen(false);
  });
  els.stationFontSizeRange?.addEventListener("input", () => setStationFontSize(els.stationFontSizeRange.value));
  els.timeFontSizeRange?.addEventListener("input", () => setTimeFontSize(els.timeFontSizeRange.value));
  els.fontResetBtn?.addEventListener("click", resetFontSettings);
  els.autoStartToggle?.addEventListener("change", () => {
    localStorage.setItem(LS_AUTOSTART_KEY, els.autoStartToggle.checked ? "1" : "0");
  });
  els.updateIntervalSelect?.addEventListener("change", () => {
    setUpdateIntervalMin(els.updateIntervalSelect.value);
    // If user enables it while already playing, run once immediately.
    if (isAndroidApp() && isRadioPlaying() && getUpdateIntervalMin() > 0) void checkAndroidUpdateVersion();
  });
  els.reloadBtn.addEventListener("click", () => loadStations({ bustCache: true }));
  els.playerToggleBtn?.addEventListener("click", () => {
    setPlayerCollapsed(!els.playerPanel?.classList.contains("is-collapsed"));
  });
  window.addEventListener("resize", scheduleListHeightUpdate, { passive: true });
  window.addEventListener("resize", queueSyncCarModeIcons, { passive: true });
  window.addEventListener("orientationchange", () => {
    setTimeout(scheduleListHeightUpdate, 250);
    setTimeout(queueSyncCarModeIcons, 250);
  });
  els.tabAll.addEventListener("click", () => setViewMode("all"));
  els.tabFav.addEventListener("click", () => setViewMode("fav"));
  els.searchInput.addEventListener("input", () => {
    renderList();
    els.nextBtn.disabled = getFilteredStations().length === 0;
    els.randomBtn.disabled = getFilteredStations().length === 0;
    els.prevBtn.disabled = getFilteredStations().length === 0;
    scheduleUiSave();
  });

  els.stationList.addEventListener("scroll", () => scheduleUiSave(), { passive: true });

  els.stationList.addEventListener("click", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const favBtn = target.closest?.('[data-action="fav"]');
    if (favBtn) {
      const key = favBtn.getAttribute?.("data-key");
      if (key) toggleFavoriteByKey(key);
      return;
    }

    const item = target.closest?.(".item");
    const key = item?.getAttribute?.("data-key");
    if (key) {
      selectStation(key);
      void play({ initiatedByUser: true });
    }
  });

  els.favToggleBtn.addEventListener("click", () => toggleFavorite());
  els.playBtn.addEventListener("click", () => play({ initiatedByUser: true }));
  els.pauseBtn.addEventListener("click", () => pause({ initiatedByUser: true }));
  els.stopBtn.addEventListener("click", () => stop());
  els.prevBtn.addEventListener("click", () => prevStation({ initiatedByUser: true }));
  els.nextBtn.addEventListener("click", () => nextStation({ initiatedByUser: true }));
  els.randomBtn.addEventListener("click", () => randomStation({ initiatedByUser: true }));
  els.compactPlayBtn?.addEventListener("click", () => play({ initiatedByUser: true }));
  els.compactPauseBtn?.addEventListener("click", () => pause({ initiatedByUser: true }));
  els.compactPrevBtn?.addEventListener("click", () => prevStation({ initiatedByUser: true }));
  els.compactNextBtn?.addEventListener("click", () => nextStation({ initiatedByUser: true }));
  els.compactRandomBtn?.addEventListener("click", () => randomStation({ initiatedByUser: true }));
  els.compactRecordBtn?.addEventListener("click", () => toggleRecording());
  els.citySelect?.addEventListener("change", () => {
    void onCitySelectionChanged();
  });
  els.carExitBtn?.addEventListener("click", () => setCarMode(false));
  els.carPrevBtn?.addEventListener("click", () => prevStation({ initiatedByUser: true }));
  els.carNextBtn?.addEventListener("click", () => nextStation({ initiatedByUser: true }));
  els.carRandomBtn?.addEventListener("click", () => randomStation({ initiatedByUser: true }));
  els.carPlayBtn?.addEventListener("click", () => {
    if (!els.audio) return;
    if (els.audio.paused) {
      void play({ initiatedByUser: true });
    } else {
      pause({ initiatedByUser: true });
    }
  });
  els.carFavBtn?.addEventListener("click", () => {
    if (!activeStationKey) return;
    // Same behavior as main page favorite button.
    toggleFavoriteByKey(activeStationKey);
    updateCarModeNowPlaying();
  });
  els.streamSelect.addEventListener("change", () => {
    if (recording) stopRecording();
    stopPlaybackTimer();
    stopConnectionTimeout();
    selectionToken++;
    const wasPlaying = Boolean(!els.audio.paused);
    setAudioSourceForActiveStation();
    if (wasPlaying) play({ initiatedByUser: true });
  });
  els.volumeRange.addEventListener("input", () => setVolume(els.volumeRange.value));

  els.audio.addEventListener("playing", () => {
    stopConnectionTimeout();
    setPlayerState("Çalıyor");
    notifyNativePlayback(true);
    updateRecordButtonState();
    updateCarModeNowPlaying();
    showStationNameInStatus();
    rescheduleUpdatePoll();
    if (!playbackStartedAt || playbackStationKey !== activeStationKey) {
      startPlaybackTimer();
    }
  });
  els.audio.addEventListener("pause", () => {
    stopConnectionTimeout();
    setPlayerState("Duraklatıldı");
    setPlayOkToggle(false);
    notifyNativePlayback(false);
    updateRecordButtonState();
    updateCarModeNowPlaying();
    stopNowPlayingPoll();
    if (!recording) stopPlaybackTimer();
    rescheduleUpdatePoll();

    // Auto-skip when the stream pauses unexpectedly (common on broken streams).
    const recentlyManual = Date.now() - manualPauseRequestedAt < MANUAL_PAUSE_GRACE_MS;
    if (!recentlyManual && !recording) {
      setQuickTimeTimeoutText();
      setTimeout(() => {
        nextStation({ initiatedByUser: false });
        void play({ initiatedByUser: false });
      }, 350);
    }
  });
  els.audio.addEventListener("waiting", () => setPlayerState("Tamponlanıyor..."));
  els.audio.addEventListener("stalled", () => setPlayerState("Veri bekleniyor..."));
  els.audio.addEventListener("ended", () => {
    stopConnectionTimeout();
    setPlayerState("Bitti");
    setPlayOkToggle(false);
    notifyNativePlayback(false);
    updateRecordButtonState();
    stopPlaybackTimer();
    rescheduleUpdatePoll();
  });
  els.audio.addEventListener("error", () => {
    stopConnectionTimeout();
    const tokenAtError = selectionToken;
    const mediaError = els.audio.error;
    setPlayerState("Hata");
    setPlayOkToggle(false);
    notifyNativePlayback(false);
    updateRecordButtonState();
    setPlayerError(mediaError ? `MediaError ${mediaError.code}` : "Bilinmeyen hata");
    stopNowPlayingPoll();
    stopPlaybackTimer();
    rescheduleUpdatePoll();

    const failingUrl = els.audio.currentSrc || els.audio.src || getActiveStreamUrl();
    const keyForUrl = findStationKeyForUrl(failingUrl) ?? activeStationKey;
    if (streamDiagnosticsEnabled && keyForUrl) stationIssue.set(keyForUrl, "unsupported");
    markStreamBad(failingUrl, "unsupported");
    if (streamDiagnosticsEnabled) {
      if (activeStationKey === keyForUrl && getActiveStreamUrl() === failingUrl) applyActiveToPlayer({ skipCheck: true });
      renderList();
    }
  });

  // Admin panel
  els.adminBtn.addEventListener("click", () => setAdminOpen(els.adminPanel.classList.contains("is-hidden")));
  els.adminCloseBtn.addEventListener("click", () => setAdminOpen(false));
  els.adminSaveBtn.addEventListener("click", () => adminSaveCurrentList());
  els.adminDownloadBtn.addEventListener("click", () => adminDownloadCurrentList());
  els.adminMarkingToggle?.addEventListener("change", () => {
    setDiagnosticsEnabled(Boolean(els.adminMarkingToggle.checked));
    void loadStations({ bustCache: true });
    setAdminResult(streamDiagnosticsEnabled ? "İşaretleme aktif." : "İşaretleme kapalı.", "ok");
  });
  els.adminClearBlockedBtn?.addEventListener("click", () => {
    clearBlockedUrls();
    void loadStations({ bustCache: true });
    setAdminResult("Engel listesi temizlendi.", "ok");
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "F9") {
      e.preventDefault();
      setAdminVisible(true);
      setAdminOpen(!els.adminPanel.classList.contains("is-hidden"));
      setAdminResult("—");
    }
    if (e.key === "Escape") setAdminOpen(false);
  });

  window.addEventListener("pagehide", () => saveUiStateNow());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      saveUiStateNow();
      return;
    }
    if (document.visibilityState === "visible") maybeAutoStart();
  });
  window.addEventListener("pageshow", () => maybeAutoStart(), { passive: true });
}

async function init() {
  wireEvents();
  await filterMissingCityOptions();
  const savedCity = String(localStorage.getItem(LS_CITY_KEY) || "").trim();
  if (els.citySelect && savedCity) {
    const has = Array.from(els.citySelect.options).some((o) => String(o.value || "").trim() === savedCity);
    if (has) els.citySelect.value = savedCity;
  }
  await applyCitySelection(els.citySelect?.value || savedCity, { persist: false });
  updateModeUi();
  resetUiStateForNewBuild();
  loadVolume();
  loadStationFontSize();
  loadTimeFontSize();
  if (els.autoStartToggle) {
    els.autoStartToggle.checked = localStorage.getItem(LS_AUTOSTART_KEY) === "1";
  }
  if (els.updateIntervalSelect) {
    const min = getUpdateIntervalMin();
    els.updateIntervalSelect.value = String(min);
  }
  streamDiagnosticsEnabled = localStorage.getItem(LS_DIAGNOSTICS_KEY) === "1";
  const ui = getUiState();
  setPlayerCollapsed(true, { persist: false });
  els.searchInput.value = "";
  setViewMode("all", { restore: true });
  await loadStations();
  updateCarModeNowPlaying();

  if (typeof ui.activeStationKey === "string" && stations.some((s) => s.key === ui.activeStationKey)) {
    activeStationKey = ui.activeStationKey;
    applyActiveToPlayer({ skipCheck: true });
    renderList();
  }

  maybeAutoStart();

  const desiredScroll = viewMode === "fav" ? Number(ui.scrollFav || 0) : Number(ui.scrollAll || 0);
  scheduleListHeightUpdate();
  els.stationList.scrollTop = Number.isFinite(desiredScroll) ? desiredScroll : 0;
  scrollActiveIntoView("auto");

  void checkCurrentStream({ fastOnly: true });
  setAdminVisible(false);
  setAdminOpen(false);
  void checkAndroidUpdateVersion();
  rescheduleUpdatePoll();
  scheduleUiSave();
}

init();
