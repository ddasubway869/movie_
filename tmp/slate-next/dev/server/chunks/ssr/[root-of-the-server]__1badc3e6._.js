module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/src/lib/constants.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AUTH_KEY",
    ()=>AUTH_KEY,
    "TMDB_API",
    ()=>TMDB_API,
    "TMDB_IMAGE_BASE",
    ()=>TMDB_IMAGE_BASE,
    "TORBOX_API",
    ()=>TORBOX_API,
    "TORBOX_SEARCH_API",
    ()=>TORBOX_SEARCH_API
]);
const TORBOX_API = "https://api.torbox.app";
const TORBOX_SEARCH_API = "https://search-api.torbox.app";
const TMDB_API = "https://api.themoviedb.org";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const AUTH_KEY = "torbox_api_key";
}),
"[project]/src/lib/utils.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "extractHashFromMagnet",
    ()=>extractHashFromMagnet,
    "formatBytes",
    ()=>formatBytes,
    "getYear",
    ()=>getYear,
    "isBrowserPlayable",
    ()=>isBrowserPlayable,
    "pickVideoFile",
    ()=>pickVideoFile,
    "ratingToPercent",
    ()=>ratingToPercent
]);
function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = [
        "B",
        "KB",
        "MB",
        "GB",
        "TB"
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
function extractHashFromMagnet(magnet) {
    const match = magnet.match(/btih:([a-fA-F0-9]{40})/i) || magnet.match(/btih:([a-zA-Z2-7]{32})/i);
    return match ? match[1].toLowerCase() : "";
}
const VIDEO_EXTENSIONS = [
    ".mp4",
    ".mkv",
    ".avi",
    ".webm",
    ".mov",
    ".m4v",
    ".wmv"
];
function pickVideoFile(files) {
    const videoFiles = files.filter((f)=>VIDEO_EXTENSIONS.some((ext)=>f.name.toLowerCase().endsWith(ext)));
    if (videoFiles.length === 0) return files.length > 0 ? files.reduce((a, b)=>a.size > b.size ? a : b) : null;
    return videoFiles.reduce((a, b)=>a.size > b.size ? a : b);
}
function isBrowserPlayable(filename) {
    const name = filename.toLowerCase();
    return name.endsWith(".mp4") || name.endsWith(".webm") || name.endsWith(".m4v");
}
function getYear(dateStr) {
    if (!dateStr) return "";
    return dateStr.split("-")[0] || "";
}
function ratingToPercent(rating) {
    return Math.round(rating * 10) + "%";
}
}),
"[project]/src/lib/torbox.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createStream",
    ()=>createStream,
    "createTorrent",
    ()=>createTorrent,
    "listTorrents",
    ()=>listTorrents,
    "requestDownload",
    ()=>requestDownload,
    "searchTorrents",
    ()=>searchTorrents,
    "startStreaming",
    ()=>startStreaming,
    "waitForReady",
    ()=>waitForReady
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-ssr] (ecmascript)");
;
async function torboxFetch(path, options) {
    const res = await fetch(`/api/torbox/${path}`, options);
    const data = await res.json();
    if (!res.ok || !data.success) {
        throw new Error(data.detail || "TorBox request failed");
    }
    return data;
}
async function createTorrent(magnet) {
    const form = new FormData();
    form.append("magnet", magnet);
    const res = await torboxFetch("torrents/createtorrent", {
        method: "POST",
        body: form
    });
    return res.data;
}
async function listTorrents(id) {
    const path = id ? `torrents/mylist?id=${id}` : "torrents/mylist";
    const res = await torboxFetch(path);
    if (!res.data) return [];
    return Array.isArray(res.data) ? res.data : [
        res.data
    ];
}
async function requestDownload(torrentId, fileId) {
    // "token" param is replaced server-side with the real API key from the DB
    const params = new URLSearchParams({
        token: "session",
        torrent_id: String(torrentId)
    });
    if (fileId !== undefined) params.set("file_id", String(fileId));
    const res = await torboxFetch(`torrents/requestdl?${params}`);
    return res.data;
}
async function createStream(torrentId, fileId) {
    const params = new URLSearchParams({
        id: String(torrentId),
        type: "torrent"
    });
    if (fileId !== undefined) params.set("file_id", String(fileId));
    const res = await torboxFetch(`stream/createstream?${params}`);
    return res.data.hls_url;
}
async function searchTorrents(tmdbId, mediaType, season, episode) {
    const params = new URLSearchParams({
        id: `tmdb:${tmdbId}`,
        type: mediaType
    });
    if (season !== undefined) params.set("season", String(season));
    if (episode !== undefined) params.set("episode", String(episode));
    const res = await fetch(`/api/search?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Search failed");
    return data.data?.torrents || data.data || [];
}
function sleep(ms) {
    return new Promise((resolve)=>setTimeout(resolve, ms));
}
async function waitForReady(torrentId, onProgress, maxWaitMs = 120000) {
    const start = Date.now();
    let lastProgress = -1;
    let stuckCount = 0;
    while(Date.now() - start < maxWaitMs){
        const torrents = await listTorrents(torrentId);
        const torrent = torrents[0];
        if (!torrent) throw new Error("Torrent not found");
        const state = torrent.download_state?.toLowerCase();
        if (state === "completed" || state === "cached" || state === "seeding" || state === "uploading" || state === "finished" || state === "ready" || state === "downloading" && torrent.progress >= 1) {
            return torrent;
        }
        if (torrent.progress === lastProgress && torrent.progress === 0) {
            stuckCount++;
            if (stuckCount >= 10) {
                throw new Error("Torrent is not downloading. Try a different source with more seeders.");
            }
        } else {
            stuckCount = 0;
        }
        lastProgress = torrent.progress;
        onProgress?.(torrent.progress, torrent.download_speed);
        await sleep(2000);
    }
    throw new Error("Timed out waiting for torrent");
}
async function startStreaming(magnet, onProgress) {
    const torrent = await createTorrent(magnet);
    const torrentId = torrent.torrent_id;
    const readyTorrent = await waitForReady(torrentId, onProgress);
    const file = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["pickVideoFile"])(readyTorrent.files || []);
    if (!file) throw new Error("No video file found");
    let url;
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isBrowserPlayable"])(file.name)) {
        url = await requestDownload(torrentId, file.id);
    } else {
        const hlsUrl = await createStream(torrentId, file.id);
        url = `/api/hls?url=${encodeURIComponent(hlsUrl)}`;
    }
    return {
        url,
        filename: file.name
    };
}
}),
"[project]/src/components/AuthProvider.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/constants.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$torbox$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/torbox.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])({
    apiKey: null,
    user: null,
    loading: true,
    login: async ()=>{},
    logout: ()=>{}
});
function AuthProvider({ children }) {
    const [apiKey, setApiKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const stored = localStorage.getItem(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AUTH_KEY"]);
        if (stored) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$torbox$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateApiKey"])(stored).then((u)=>{
                setApiKey(stored);
                setUser(u);
            }).catch(()=>{
                localStorage.removeItem(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AUTH_KEY"]);
            }).finally(()=>setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);
    const login = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (key)=>{
        const u = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$torbox$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateApiKey"])(key);
        localStorage.setItem(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AUTH_KEY"], key);
        setApiKey(key);
        setUser(u);
    }, []);
    const logout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        localStorage.removeItem(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AUTH_KEY"]);
        setApiKey(null);
        setUser(null);
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            apiKey,
            user,
            loading,
            login,
            logout
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/AuthProvider.tsx",
        lineNumber: 60,
        columnNumber: 5
    }, this);
}
function useAuth() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
}
}),
"[project]/src/components/ThemeProvider.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThemeProvider",
    ()=>ThemeProvider,
    "useTheme",
    ()=>useTheme
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
const ThemeContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])({
    theme: "dark",
    toggle: ()=>{}
});
function ThemeProvider({ children }) {
    const [theme, setTheme] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("light");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const stored = localStorage.getItem("slate_theme");
        const resolved = stored === "light" || stored === "dark" ? stored : "light";
        setTheme(resolved);
        if (resolved === "dark") {
            document.documentElement.setAttribute("data-theme", "dark");
        } else {
            document.documentElement.removeAttribute("data-theme");
        }
    }, []);
    const toggle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        setTheme((prev)=>{
            const next = prev === "dark" ? "light" : "dark";
            localStorage.setItem("slate_theme", next);
            if (next === "dark") {
                document.documentElement.setAttribute("data-theme", "dark");
            } else {
                document.documentElement.removeAttribute("data-theme");
            }
            return next;
        });
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ThemeContext.Provider, {
        value: {
            theme,
            toggle
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/ThemeProvider.tsx",
        lineNumber: 45,
        columnNumber: 5
    }, this);
}
function useTheme() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(ThemeContext);
}
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        if ("TURBOPACK compile-time truthy", 1) {
            if ("TURBOPACK compile-time truthy", 1) {
                module.exports = __turbopack_context__.r("[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)");
            } else //TURBOPACK unreachable
            ;
        } else //TURBOPACK unreachable
        ;
    }
} //# sourceMappingURL=module.compiled.js.map
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].ReactJsxDevRuntime; //# sourceMappingURL=react-jsx-dev-runtime.js.map
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].React; //# sourceMappingURL=react.js.map
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1badc3e6._.js.map