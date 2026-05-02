/* WebRadioStation - vanilla HTML/CSS/JS */

const LIST_URL = "rlist/radio.lst";
const LS_FAV_KEY = "webRadioStation:favorites:v1";
const LS_STREAM_PREF_KEY = "webRadioStation:streamIndexByStation:v1";
const LS_VOLUME_KEY = "webRadioStation:volume:v1";
const LS_BLOCKED_URLS_KEY = "webRadioStation:blockedUrls:v1";
const LS_UI_STATE_KEY = "webRadioStation:uiState:v1";
const LS_APP_BOOT_KEY = "webRadioStation:bootVersion";
const APP_BOOT_VERSION = "20260502-huawei-render-fix";
const LS_DIAGNOSTICS_KEY = "webRadioStation:diagnosticsEnabled:v1";
const LS_STATION_FONT_SIZE_KEY = "webRadioStation:stationFontSize:v1";
const ADMIN_SAVE_URL = "admin/save-radio.php";
const ICY_META_URL = "api/icy-metadata.php";
const STREAM_CHECK_ENABLED = true;
const APP_VERSION = "1.0.6";
const VERSION_JSON_URL = "https://dilousta58.github.io/RadioStation58/version.json";
const APK_DOWNLOAD_URL = "https://dilousta58.github.io/RadioStation58/WebRadio-release.apk";
let streamDiagnosticsEnabled = false;

const els = {
  menuBtn: document.getElementById("menuBtn"),
  mainMenu: document.getElementById("mainMenu"),
  settingsMenuBtn: document.getElementById("settingsMenuBtn"),
  settingsPanel: document.getElementById("settingsPanel"),
  settingsCloseBtn: document.getElementById("settingsCloseBtn"),
  stationFontSizeRange: document.getElementById("stationFontSizeRange"),
  stationFontSizeValue: document.getElementById("stationFontSizeValue"),
  stationFontResetBtn: document.getElementById("stationFontResetBtn"),
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

  adminBtn: document.getElementById("adminBtn"),
  adminPanel: document.getElementById("adminPanel"),
  adminCloseBtn: document.getElementById("adminCloseBtn"),
  adminSaveBtn: document.getElementById("adminSaveBtn"),
  adminDownloadBtn: document.getElementById("adminDownloadBtn"),
  adminMarkingToggle: document.getElementById("adminMarkingToggle"),
  adminClearBlockedBtn: document.getElementById("adminClearBlockedBtn"),
  adminResult: document.getElementById("adminResult"),
};

/** @typedef {{ key: string, name: string, streams: string[], icon?: string }} Station */

/** @type {Station[]} */
let stations = [];
/** @type {string | null} */
let activeStationKey = null;
/** @type {"all" | "fav"} */
let viewMode = "all";

/** @type {Map<string, "timeout" | "unsupported">} */
const stationIssue = new Map();

let lastPlaybackRequestAt = 0;
let autoSkipWindowMs = 15_000;
let autoSkipCount = 0;
let autoSkipResetAt = 0;
const AUTO_SKIP_MAX_PER_MIN = 12;

let uiSaveTimer = 0;

let selectionToken = 0;
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
}

function setPlayerError(text) {
  els.playerError.textContent = text;
}

function popupMessage(text) {
  setTimeout(() => {
    try {
      window.alert(text);
    } catch {
      setPlayerError(text);
    }
  }, 0);
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

function showAndroidUpdatePrompt(apkUrl) {
  document.querySelector(".update-notice")?.remove();
  const box = document.createElement("div");
  box.className = "update-notice";
  box.innerHTML = `
    <div class="update-box" role="dialog" aria-modal="true" aria-label="Update verfügbar">
      <h3>update verfügbar!</h3>
      <p>runterladen ?</p>
      <div class="update-actions">
        <button id="updateYesBtn" type="button">Ja</button>
        <button id="updateNoBtn" class="secondary" type="button">Nein</button>
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
    setUpdateStatus("update verfügbar!", true);
    showAndroidUpdatePrompt(apkUrl);
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

function runtimeLabel(ms, stationKey = activeStationKey) {
  const stationName = stations.find((s) => s.key === stationKey)?.name || "";
  const time = formatDuration(ms);
  return stationName ? `${time} - ${stationName}` : time;
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
  const text = runtimeLabel(Date.now() - recordingStartedAt, recordingStationKey);
  if (els.quickTime) els.quickTime.textContent = text;
}

function updatePlaybackStationTime() {
  if (!playbackStartedAt || recording) return;
  updateMainRuntime();
}

function updateMainRuntime() {
  if (!els.quickTime) return;
  if (recording) {
    els.quickTime.textContent = runtimeLabel(Date.now() - recordingStartedAt, recordingStationKey);
    els.quickTime.classList.add("is-recording");
  } else if (playbackStartedAt) {
    els.quickTime.textContent = runtimeLabel(Date.now() - playbackStartedAt, playbackStationKey);
    els.quickTime.classList.remove("is-recording");
  } else {
    els.quickTime.textContent = "00:00:00";
    els.quickTime.classList.remove("is-recording");
  }
}

function updateRecordButtonState() {
  const canRecord = Boolean(activeStationKey);
  const playerRunning = Boolean(els.audio?.src && !els.audio.paused && !els.audio.ended);
  if (els.compactRecordBtn) {
    const enabled = canRecord && (playerRunning || recording);
    els.compactRecordBtn.disabled = !enabled;
    els.compactRecordBtn.classList.toggle("is-record-ready", canRecord && playerRunning && !recording);
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
    return;
  }

  els.nowTitle.textContent = st.name;
  if (els.footerNow) els.footerNow.textContent = st.name;
  els.favToggleBtn.disabled = false;
  els.favToggleBtn.textContent = favs.has(st.key) ? "★ Favori" : "☆ Favori";

  els.streamSelect.disabled = st.streams.length <= 1;
  const blocked = getBlockedUrlsSet();
  const hasAnyUnblocked = st.streams.some((u) => !blocked.has(u));

  els.streamSelect.innerHTML = st.streams
    .map((url, idx) => {
      const isBlocked = hasAnyUnblocked && blocked.has(url);
      const label = `Yayın ${idx + 1}${/m3u8/i.test(url) ? " (HLS)" : ""}${isBlocked ? " (engelli)" : ""}`;
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
  setNowMeta("—");

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
      const badge = `<span class="badge">${s.streams.length} Yayın</span>`;
      const sub = s.streams.length > 1 ? `${s.streams.length} yayın mevcut` : abbreviateUrl(s.streams[0]);
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

function scrollActiveIntoView(behavior = "smooth") {
  const el = els.stationList.querySelector?.(".item.is-active");
  if (!el) return;
  try {
    el.scrollIntoView({ block: "nearest", behavior });
  } catch {
    el.scrollIntoView();
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
  scrollActiveIntoView(restore ? "auto" : "smooth");
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
  setStatus("Kanal listesi yükleniyor...");
  setPlayerError("—");

  const url = bustCache ? `${LIST_URL}?t=${Date.now()}` : LIST_URL;
  let text = "";
  try {
    if (location.protocol === "file:") {
      text = await loadTextAsset(LIST_URL);
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
  setStatus(`Kanal listesi yüklendi.`);
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
  }
  selectionToken++;
  activeStationKey = key;
  applyActiveToPlayer();
  renderList();
  scrollActiveIntoView();
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
  setAudioSourceForActiveStation();
  const urlForThisPlay = getActiveStreamUrl();

  setPlayerState("Bağlanıyor...");
  setPlayerError("—");
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

function pause() {
  if (recording) stopRecording();
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

function applyStationFontSize(value) {
  const size = clampStationFontSize(value);
  document.documentElement.style.setProperty("--station-font-size", `${size}px`);
  if (els.stationFontSizeRange) els.stationFontSizeRange.value = String(size);
  if (els.stationFontSizeValue) els.stationFontSizeValue.textContent = `${size}px`;
  return size;
}

function loadStationFontSize() {
  const size = applyStationFontSize(localStorage.getItem(LS_STATION_FONT_SIZE_KEY) || 14);
  localStorage.setItem(LS_STATION_FONT_SIZE_KEY, String(size));
}

function setStationFontSize(value) {
  const size = applyStationFontSize(value);
  localStorage.setItem(LS_STATION_FONT_SIZE_KEY, String(size));
}

function setSettingsOpen(open) {
  els.settingsPanel?.classList.toggle("is-hidden", !open);
  if (open) setMenuOpen(false);
}

function setMenuOpen(open) {
  els.mainMenu?.classList.toggle("is-hidden", !open);
  els.menuBtn?.setAttribute("aria-expanded", String(Boolean(open)));
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
  els.settingsMenuBtn?.addEventListener("click", () => setSettingsOpen(true));
  els.settingsCloseBtn?.addEventListener("click", () => setSettingsOpen(false));
  els.settingsPanel?.addEventListener("click", (event) => {
    if (event.target === els.settingsPanel) setSettingsOpen(false);
  });
  els.stationFontSizeRange?.addEventListener("input", () => setStationFontSize(els.stationFontSizeRange.value));
  els.stationFontResetBtn?.addEventListener("click", () => setStationFontSize(14));
  els.reloadBtn.addEventListener("click", () => loadStations({ bustCache: true }));
  els.playerToggleBtn?.addEventListener("click", () => {
    setPlayerCollapsed(!els.playerPanel?.classList.contains("is-collapsed"));
  });
  window.addEventListener("resize", scheduleListHeightUpdate, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(scheduleListHeightUpdate, 250));
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
  els.pauseBtn.addEventListener("click", () => pause());
  els.stopBtn.addEventListener("click", () => stop());
  els.prevBtn.addEventListener("click", () => prevStation({ initiatedByUser: true }));
  els.nextBtn.addEventListener("click", () => nextStation({ initiatedByUser: true }));
  els.randomBtn.addEventListener("click", () => randomStation({ initiatedByUser: true }));
  els.compactPlayBtn?.addEventListener("click", () => play({ initiatedByUser: true }));
  els.compactPauseBtn?.addEventListener("click", () => pause());
  els.compactPrevBtn?.addEventListener("click", () => prevStation({ initiatedByUser: true }));
  els.compactNextBtn?.addEventListener("click", () => nextStation({ initiatedByUser: true }));
  els.compactRandomBtn?.addEventListener("click", () => randomStation({ initiatedByUser: true }));
  els.compactRecordBtn?.addEventListener("click", () => toggleRecording());
  els.streamSelect.addEventListener("change", () => {
    if (recording) stopRecording();
    stopPlaybackTimer();
    selectionToken++;
    setAudioSourceForActiveStation();
    if (!els.audio.paused) play({ initiatedByUser: true });
  });
  els.volumeRange.addEventListener("input", () => setVolume(els.volumeRange.value));

  els.audio.addEventListener("playing", () => {
    setPlayerState("Çalıyor");
    notifyNativePlayback(true);
    updateRecordButtonState();
    if (!playbackStartedAt || playbackStationKey !== activeStationKey) {
      startPlaybackTimer();
    }
  });
  els.audio.addEventListener("pause", () => {
    setPlayerState("Duraklatıldı");
    setPlayOkToggle(false);
    notifyNativePlayback(false);
    updateRecordButtonState();
    stopNowPlayingPoll();
    if (!recording) stopPlaybackTimer();
  });
  els.audio.addEventListener("waiting", () => setPlayerState("Tamponlanıyor..."));
  els.audio.addEventListener("stalled", () => setPlayerState("Veri bekleniyor..."));
  els.audio.addEventListener("ended", () => {
    setPlayerState("Bitti");
    setPlayOkToggle(false);
    notifyNativePlayback(false);
    updateRecordButtonState();
    stopPlaybackTimer();
  });
  els.audio.addEventListener("error", () => {
    const tokenAtError = selectionToken;
    const mediaError = els.audio.error;
    setPlayerState("Hata");
    setPlayOkToggle(false);
    notifyNativePlayback(false);
    updateRecordButtonState();
    setPlayerError(mediaError ? `MediaError ${mediaError.code}` : "Bilinmeyen hata");
    stopNowPlayingPoll();
    stopPlaybackTimer();

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
    if (document.visibilityState === "hidden") saveUiStateNow();
  });
}

async function init() {
  wireEvents();
  resetUiStateForNewBuild();
  loadVolume();
  loadStationFontSize();
  streamDiagnosticsEnabled = localStorage.getItem(LS_DIAGNOSTICS_KEY) === "1";
  const ui = getUiState();
  setPlayerCollapsed(true, { persist: false });
  els.searchInput.value = "";
  setViewMode("all", { restore: true });
  await loadStations();

  if (typeof ui.activeStationKey === "string" && stations.some((s) => s.key === ui.activeStationKey)) {
    activeStationKey = ui.activeStationKey;
    applyActiveToPlayer({ skipCheck: true });
    renderList();
  }

  const desiredScroll = viewMode === "fav" ? Number(ui.scrollFav || 0) : Number(ui.scrollAll || 0);
  scheduleListHeightUpdate();
  els.stationList.scrollTop = Number.isFinite(desiredScroll) ? desiredScroll : 0;
  scrollActiveIntoView("auto");

  void checkCurrentStream({ fastOnly: true });
  setAdminVisible(false);
  setAdminOpen(false);
  void checkAndroidUpdateVersion();
  scheduleUiSave();
}

init();
