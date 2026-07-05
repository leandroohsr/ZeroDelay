// ZeroDelay — keep YouTube live streams in real time
// Author: João Gustavo França <joao@solitus.com.br> (https://github.com/joaogfc)
//
// Live-match discovery — REAL data, no mocks. Queries YouTube's own results page
// for live football and parses the `ytInitialData` blob the page ships with, so
// every item is an actual live stream (real title, channel, thumbnail, watcher
// count) that the user can open — where ZeroDelay then keeps it near real time.
//
// The fetch is the extension's ONLY network call and runs solely when the user
// opens the popup (never in the background). It hits youtube.com — the origin the
// extension already operates on — with credentials omitted, so it carries no
// YouTube identity. Parsing is split from fetching (parse* functions are pure,
// DOM-free, unit-tested against a fixture); if YouTube ever changes the shape,
// the parser degrades to an empty list rather than throwing.

export const YT_LIVE_FILTER = 'EgJAAQ%3D%3D'; // YouTube results filter → live streams
export const WATCH_BASE = 'https://www.youtube.com/watch?v=';

// Localized broad "live football" query per UI language (2-letter match).
export const SEARCH_QUERIES = {
    pt: 'futebol ao vivo',
    en: 'live football',
    es: 'fútbol en vivo',
    fr: 'football en direct',
};

export function queryForLang(lang) {
    const base = (lang || 'en').slice(0, 2).toLowerCase();
    return SEARCH_QUERIES[base] || SEARCH_QUERIES.en;
}

// ---------------------------------------------------------------------------
// Trusted broadcasters — the curation that keeps the list to REAL official match
// streams and drops the flood of re-stream / pirate channels ("transmissões
// fake"). A stream shows ONLY if its channel is listed for the viewer's region.
// Each entry has YouTube `handles` (lowercase, no @ — readable, easy to extend)
// and verified channel `ids` (UC… — spoof-proof: a copycat that renames itself
// "CazéTV" fails the id and is dropped). Keys are ISO-3166 alpha-2 countries;
// `ANY` is worldwide/official (shown everywhere); a finer `BR-SP` sub-region key
// is honoured when a sub-region is supplied (state-league broadcasters). The ids
// below were each confirmed live against youtube.com; extend freely.
//
// REALITY CHECK — list channels that carry FULL live matches on YouTube for their
// region, not highlights channels. For the FIFA World Cup 2026, full matches are
// free on YouTube essentially in BRAZIL (CazéTV — all 104). In most countries the
// official broadcaster puts only highlights / the first minutes on YouTube and
// streams full matches in its OWN app (BBC iPlayer, ITVX, SBS On Demand, VIX,
// JioCinema, RaiPlay…). Since we only ever show streams badged LIVE from a trusted
// channel, those regions naturally surface little here — that is honest, not a
// bug. Non-BR handles below are kept for club competitions some of them do stream
// live; drop any that only post highlights if it starts surfacing studio shows.
// ---------------------------------------------------------------------------
export const TRUSTED_CHANNELS = {
    // Worldwide / official — confederations + channels that stream FULL matches
    // free to an international audience (all ids verified live). A few may be geo-
    // blocked in some markets at play time — that's YouTube's call, not ours.
    ANY: {
        handles: ['fifa', 'fifaworldcup', 'conmebol', 'conmebollibertadores', 'conmebolsudamericana', 'uefa', 'cafofficiel',
            'jleagueinternational', 'jleague', 'daznwomensfootball', 'theafchub', 'concacaf', 'ussoccer'],
        ids: [
            'UCpcTrCXblq78GZrTUTLWeBw', // FIFA
            'UCzU8-lZlRfkV3nj0RzAZdrQ', // CONMEBOL (Libertadores / Sudamericana)
            'UCSFPjfwA4eOavxU-WbOrhWQ', // CAF (African football / AFCON)
            'UCmQp6ZaAejJKKkXc_Y_lh1A', // J.League International (full games worldwide, EN)
            'UCY9Q-QnNiOGgepqrYroYPSQ', // J.League (JP)
            'UCxgii5f9u4YgXCeubCozbEA', // DAZN Women's Football (UEFA Women's Champions League)
            'UCnj0TjaM0wyxkAWW_nz8_1g', // The AFC Hub (AFC Champions League)
            'UCqn7r-so0mBLaJTtTms9dAQ', // Concacaf (Champions Cup)
            'UCk1pcWQ5E19g0Cgp4c1eI1w', // US Soccer (US Open Cup)
        ],
    },
    BR: {
        handles: ['cazetv', 'globoesporte', 'canalge', 'goat', 'espnbrasil', 'tntsportsbr', 'sbt', 'sbtsports', 'premiere', 'sportv', 'paramountplusbr', 'nsports'],
        ids: [
            'UCZiYbVptd3PVPf4f6eR6UaQ', // CazéTV
            'UCw5-xj3AKqEizC7MvHaIPqA', // ESPN Brasil
            'UCS710QGV74b0wPETkrcVB7w', // ge / globoesporte
            'UCgEmJIf6XrKPOMSXRmcdkkg', // Canal GE
            'UCnnnK1gB7B_AKAiiMmo_Jxg', // GOAT
            'UCs-6sCz2LJm1PrWQN4ErsPw', // TNT Sports Brasil
            'UCR3TOnFWDeAlT-Ho6LueDmg', // SBT
            'UCxc3marqP9BJSkQ0_K4mqDg', // SBT Sports
            'UCAnCxJ1Weh2pUAKJW0bro0Q', // Paramount+ Brasil
        ],
    },
    ES: { handles: ['laliga', 'daznfutbol', 'realmadrid', 'fcbarcelona'], ids: ['UCTv-XvfzLX3i4IGWAm4sbmA', 'UCz9FiMLz6SOgR_4VEFvjeIA'] },
    GB: { handles: ['premierleague', 'skysportsfootball', 'tntsports'], ids: ['UCG5qGWdu8nIRZqJ_GgDwQ-w', 'UCZ7wY7MRDSygp63HIEfdQZA'] },
    US: { handles: ['cbssportsgolazo', 'foxsoccer', 'espnfc'], ids: ['UCET00YnetHT7tOpu12v8jxg', 'UC6c1z7bA__85CIWZ_jpCK-Q'] },
    MX: { handles: ['tudn', 'televisadeportes', 'ligamxoficial'], ids: ['UC9GIHKYg4zLePtR7302oROg'] },
    AR: { handles: ['tntsports', 'tvpublica'], ids: [] },
    PT: { handles: ['canal11oficial'], ids: [] },
    KR: { handles: ['kleague', 'kleaguetv'], ids: ['UCak5ZEX4BjijJcf7fdppuIQ', 'UCI_oeTbM8Rs3iREYAs2HNtw'] }, // K League — full matches free on YouTube
    IN: { handles: ['indiansuperleague'], ids: ['UCJk-aQ7NZtqYtpcqKDt_vZg'] },                                  // Indian Super League
    // Sub-region (state leagues). The browser locale only reveals the country, so
    // these apply only when a sub-region like 'BR-SP' is passed explicitly (a
    // future user setting). Handles here still need confirming before relying on.
    'BR-SP': { handles: ['paulistao'], ids: [] },
    'BR-RJ': { handles: ['cariocao'], ids: [] },
};

function normHandle(h) {
    return String(h || '').replace(/^\//, '').replace(/^@/, '').toLowerCase();
}

/** Best-effort ISO country from a UI language tag ("pt-BR" → "BR"). */
export function regionFromLang(lang) {
    const m = /[-_]([A-Za-z]{2})\b/.exec(lang || '');
    if (m) return m[1].toUpperCase();
    return { pt: 'BR', es: 'ES', en: 'GB', fr: 'FR' }[(lang || '').slice(0, 2).toLowerCase()] || '';
}

/**
 * The set of trusted tokens (lowercased handles + verified ids) for a region:
 * worldwide (ANY) ∪ the country ∪ an optional sub-region ("BR-SP").
 */
export function trustedSet(region, subRegion) {
    const set = new Set();
    const add = entry => {
        if (!entry) return;
        for (const h of entry.handles || []) set.add(normHandle(h));
        for (const id of entry.ids || []) set.add(id);
    };
    add(TRUSTED_CHANNELS.ANY);
    add(TRUSTED_CHANNELS[(region || '').toUpperCase()]);
    if (subRegion) add(TRUSTED_CHANNELS[String(subRegion).toUpperCase()]);
    return set;
}

/** True when a parsed match comes from a trusted broadcaster (verified id or handle). */
export function isTrusted(match, regionOrSet, subRegion) {
    if (!match) return false;
    const set = regionOrSet instanceof Set ? regionOrSet : trustedSet(regionOrSet, subRegion);
    if (match.channelId && set.has(match.channelId)) return true;
    return !!match.handle && set.has(match.handle);
}

export function buildSearchUrl(lang) {
    const params = new URLSearchParams({ search_query: queryForLang(lang), hl: lang || 'en' });
    return `https://www.youtube.com/results?${params.toString()}&sp=${YT_LIVE_FILTER}`;
}

// UPCOMING is found by a SEPARATE, UNFILTERED search: the Live filter (sp) hides
// scheduled "waiting room" streams, and channel /streams tabs list only past
// broadcasts. A competition-aware query surfaces the real upcoming waiting rooms
// (e.g. "copa do mundo hoje ao vivo" → CazéTV's next match). This is the
// maintenance surface for upcoming coverage — update per active competition.
export const UPCOMING_QUERIES = {
    pt: 'copa do mundo hoje ao vivo',
    en: 'world cup today live',
    es: 'mundial hoy en vivo',
    fr: 'coupe du monde en direct',
};

export function upcomingQueryForLang(lang) {
    const base = (lang || 'en').slice(0, 2).toLowerCase();
    return UPCOMING_QUERIES[base] || UPCOMING_QUERIES.en;
}

export function buildUpcomingSearchUrl(lang) {
    const params = new URLSearchParams({ search_query: upcomingQueryForLang(lang), hl: lang || 'en' });
    return `https://www.youtube.com/results?${params.toString()}`; // no Live filter → includes upcoming
}

export function thumbUrl(videoId) {
    return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

export function watchUrl(videoId) {
    return WATCH_BASE + encodeURIComponent(videoId);
}

// Slice a balanced { ... } object from `s` starting at the `{` at `start`,
// respecting strings/escapes so a "};" inside a string never ends it early.
function sliceBalanced(s, start) {
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < s.length; i++) {
        const c = s[i];
        if (inStr) {
            if (esc) esc = false;
            else if (c === '\\') esc = true;
            else if (c === '"') inStr = false;
        } else if (c === '"') inStr = true;
        else if (c === '{') depth++;
        else if (c === '}') { if (--depth === 0) return s.slice(start, i + 1); }
    }
    return null;
}

/** Pull the parsed `ytInitialData` object out of a YouTube results page, or null. */
export function extractYtInitialData(html) {
    if (typeof html !== 'string') return null;
    const MARK = 'ytInitialData';
    for (let i = html.indexOf(MARK); i !== -1; i = html.indexOf(MARK, i + MARK.length)) {
        const eq = html.indexOf('=', i);
        const brace = html.indexOf('{', i);
        if (eq === -1 || brace === -1 || brace < eq) continue;
        const obj = sliceBalanced(html, brace);
        if (!obj) continue;
        try { return JSON.parse(obj); } catch { /* wrong occurrence — keep scanning */ }
    }
    return null;
}

// Depth-first collect of every videoRenderer in the parsed tree (the search
// results, wherever YouTube nests them).
function collectVideoRenderers(node, out = []) {
    if (!node || typeof node !== 'object') return out;
    if (node.videoRenderer) out.push(node.videoRenderer);
    for (const k in node) collectVideoRenderers(node[k], out);
    return out;
}

function joinRuns(textObj) {
    if (!textObj) return '';
    if (typeof textObj.simpleText === 'string') return textObj.simpleText;
    if (Array.isArray(textObj.runs)) return textObj.runs.map(r => r.text).join('');
    return '';
}

function digits(text) {
    const n = parseInt(String(text).replace(/[^\d]/g, ''), 10);
    return Number.isFinite(n) ? n : null;
}

// Only actual GAME broadcasts — not the commentary/analysis around them. A match
// broadcast names two teams ("TEAM x TEAM"); pre-/post-game shows, recaps,
// reactions, watch-alongs, podcasts and generic channel lives ("SBT Ao Vivo")
// are dropped even when they mention the matchup. `x`/`×`/`vs` between two names
// is the include signal; the keyword list is the exclude signal.
const MATCHUP_RE = /(?:^|\s)(?:x|vs\.?)\s|×/i;
const COMMENTARY_RE = /esquenta|é\s*hoje|resumo|pr[ée]-?\s*jogo|p[óo]s-?\s*jogo|resenha|an[áa]lise|\bdebate\b|rea[çc][ãa]o|\breact\b|mesa\s*redonda|coment|tudo que rolou|aquecimento|pre-?game|post-?game|watch\s*(?:along|party)|est[úu]dio|narra[çc]|bastidores|entrevista|coletiva|\btreino\b|melhores momentos|gols de|p[óo]dcast|\btalk\b/i;

/** True when a stream title looks like an actual match broadcast (not commentary). */
export function isMatchBroadcast(title) {
    if (typeof title !== 'string' || !title) return false;
    return MATCHUP_RE.test(title) && !COMMENTARY_RE.test(title);
}

/** Map one videoRenderer to a match, or null if it isn't a live/upcoming match broadcast. */
export function parseVideoRenderer(v) {
    if (!v || typeof v.videoId !== 'string') return null;
    const badges = (v.badges || []).map(b => b.metadataBadgeRenderer && b.metadataBadgeRenderer.style).filter(Boolean);
    const overlays = (v.thumbnailOverlays || [])
        .map(o => o.thumbnailOverlayTimeStatusRenderer && o.thumbnailOverlayTimeStatusRenderer.style)
        .filter(Boolean);
    const isLive = badges.includes('BADGE_STYLE_TYPE_LIVE_NOW') || overlays.includes('LIVE');
    const isUpcoming = !!v.upcomingEventData || overlays.includes('UPCOMING');
    if (!isLive && !isUpcoming) return null; // ignore ordinary VODs the filter let through

    const title = joinRuns(v.title);
    if (!isMatchBroadcast(title)) return null; // only game broadcasts, not commentary

    const viewersText = joinRuns(v.viewCountText) || joinRuns(v.shortViewCountText);
    const startSec = v.upcomingEventData && Number(v.upcomingEventData.startTime);
    const owner = (v.ownerText && v.ownerText.runs && v.ownerText.runs[0])
        || (v.longBylineText && v.longBylineText.runs && v.longBylineText.runs[0]) || null;
    const browse = owner && owner.navigationEndpoint && owner.navigationEndpoint.browseEndpoint;
    return {
        id: v.videoId,
        videoId: v.videoId,
        status: isLive ? 'live' : 'upcoming',
        title,
        channel: joinRuns(v.ownerText) || joinRuns(v.longBylineText),
        channelId: (browse && browse.browseId) || null,
        handle: normHandle(browse && browse.canonicalBaseUrl),
        thumbnail: thumbUrl(v.videoId),
        watchUrl: watchUrl(v.videoId),
        viewers: isLive ? digits(viewersText) : null,
        viewersText: isLive ? viewersText : '',
        scheduledStart: Number.isFinite(startSec) ? startSec * 1000 : null,
    };
}

/**
 * Turn a parsed ytInitialData object into ranked { live, upcoming } lists.
 * By default keeps ONLY trusted broadcasters for the region (drops re-streams /
 * pirate channels); pass `trustedOnly: false` to keep everything (tests/debug).
 * Live is ordered by watcher count (the official broadcast floats to the top);
 * upcoming by start time. Deduped by video id and capped.
 * @param {Object} data
 * @param {{limit?:number, region?:string, trustedOnly?:boolean}} [opts]
 */
export function parseYtInitialData(data, opts = {}) {
    const limit = opts.limit ?? 15;
    const trustedOnly = opts.trustedOnly !== false;
    const trustSet = trustedSet(opts.region, opts.subRegion);
    const seen = new Set();
    const live = [];
    const upcoming = [];
    for (const v of collectVideoRenderers(data)) {
        const m = parseVideoRenderer(v);
        if (!m || seen.has(m.id)) continue;
        if (trustedOnly && !isTrusted(m, trustSet)) continue;
        seen.add(m.id);
        (m.status === 'live' ? live : upcoming).push(m);
    }
    live.sort((a, b) => (b.viewers || 0) - (a.viewers || 0));
    upcoming.sort((a, b) => (a.scheduledStart || Infinity) - (b.scheduledStart || Infinity));
    return { live: live.slice(0, limit), upcoming: upcoming.slice(0, limit) };
}

/** Convenience: parse a full results-page HTML string. Never throws. */
export function parseLiveSearchHtml(html, opts = {}) {
    const data = extractYtInitialData(html);
    if (!data) return { live: [], upcoming: [] };
    try { return parseYtInitialData(data, opts); } catch { return { live: [], upcoming: [] }; }
}

// ---------------------------------------------------------------------------
// Channel /streams tab — the reliable, complete list of a trusted channel's
// scheduled matches (the search only surfaces them intermittently). It uses the
// NEW `lockupViewModel` structure (not `videoRenderer`): the badge text carries
// "Upcoming"/"LIVE", and the scheduled time is only a display string
// ("Scheduled for 7/7/26, 3:00 PM"). We fetch with hl=en so those markers/dates
// are consistently parseable; the time is read in the runtime's local zone,
// which in the extension is the user's — matching what YouTube shows them.
// ---------------------------------------------------------------------------
function collectLockups(node, out = []) {
    if (!node || typeof node !== 'object') return out;
    if (node.lockupViewModel) out.push(node.lockupViewModel);
    for (const k in node) collectLockups(node[k], out);
    return out;
}

function lockupBadgeText(lock) {
    let text = '';
    (function w(n) {
        if (!n || typeof n !== 'object') return;
        if (n.thumbnailBadgeViewModel && typeof n.thumbnailBadgeViewModel.text === 'string') text = n.thumbnailBadgeViewModel.text;
        for (const k in n) w(n[k]);
    })(lock);
    return text;
}

function lockupStrings(node, out = []) {
    if (node == null) return out;
    if (typeof node === 'string') { out.push(node); return out; }
    if (typeof node === 'object') for (const k in node) lockupStrings(node[k], out);
    return out;
}

/** True when two timestamps fall on the same local calendar day. */
export function isSameLocalDay(aMs, bMs) {
    const a = new Date(aMs);
    const b = new Date(bMs);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Parse YouTube's "Scheduled for 7/7/26, 3:00 PM" (hl=en) to ms in local time, or null. */
export function parseScheduledText(text) {
    const m = /(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})\s*([AP]M)?/i.exec(String(text || ''));
    if (!m) return null;
    let year = Number(m[3]); if (year < 100) year += 2000;
    let hour = Number(m[4]);
    if (m[6]) { const pm = /pm/i.test(m[6]); if (pm && hour < 12) hour += 12; if (!pm && hour === 12) hour = 0; }
    const dt = new Date(year, Number(m[1]) - 1, Number(m[2]), hour, Number(m[5]), 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt.getTime();
}

/**
 * Parse a channel /streams page (lockupViewModel) into { live, upcoming } match
 * broadcasts. `ctx` supplies the channel identity (the page is one channel).
 */
export function parseChannelStreams(html, ctx = {}) {
    const data = extractYtInitialData(html);
    const channelName = (data && data.metadata && data.metadata.channelMetadataRenderer
        && data.metadata.channelMetadataRenderer.title) || ctx.channel || '';
    const live = [];
    const upcoming = [];
    for (const l of collectLockups(data)) {
        const id = l.contentId;
        if (typeof id !== 'string') continue;
        const meta = l.metadata && l.metadata.lockupMetadataViewModel;
        const title = (meta && meta.title && meta.title.content) || '';
        if (!isMatchBroadcast(title)) continue;
        const badge = lockupBadgeText(l).toLowerCase();
        const base = {
            id, videoId: id, title,
            channel: channelName, handle: ctx.handle || '', channelId: ctx.channelId || null,
            thumbnail: thumbUrl(id), watchUrl: watchUrl(id), viewers: null, viewersText: '',
        };
        if (badge === 'live') {
            live.push({ ...base, status: 'live', scheduledStart: null });
        } else if (badge === 'upcoming') {
            const sched = lockupStrings(l).find(s => /scheduled for/i.test(s));
            upcoming.push({ ...base, status: 'upcoming', scheduledStart: parseScheduledText(sched) });
        }
    }
    return { live, upcoming };
}

// Trusted channels whose /streams tab we scan for the upcoming schedule (a small
// subset of TRUSTED_CHANNELS — the ones that publish a full match schedule). Kept
// tiny so a popup open makes at most a couple of extra requests.
export const SCHEDULE_CHANNELS = {
    BR: ['CazeTV'],
    ES: ['LaLiga'],
    GB: ['premierleague'],
    MX: ['LigaMXoficial'],
    KR: ['kleague'],
    IN: ['IndianSuperLeague'],
};

/** Fetch the region's schedule channels' /streams and collect their upcoming matches. */
export async function fetchChannelUpcoming(o = {}) {
    const { region = '', fetchImpl, signal } = o;
    const handles = SCHEDULE_CHANNELS[(region || '').toUpperCase()] || [];
    if (!handles.length || !fetchImpl) return [];
    const req = { credentials: 'omit', signal };
    const lists = await Promise.all(handles.map(h =>
        fetchImpl(`https://www.youtube.com/@${h}/streams?hl=en`, req)
            .then(r => (r.ok ? r.text() : ''))
            .then(html => parseChannelStreams(html, { channel: h, handle: h.toLowerCase() }).upcoming)
            .catch(() => [])));
    return lists.flat();
}

/**
 * Fetch + parse the current live football streams from YouTube.
 * @param {{lang?:string, fetchImpl?:Function, signal?:AbortSignal, limit?:number}} [o]
 * @returns {Promise<{live:Object[], upcoming:Object[]}>}
 */
export async function fetchLiveMatches(o = {}) {
    const { lang = 'en', fetchImpl = (typeof fetch !== 'undefined' ? fetch : null), signal, limit, subRegion } = o;
    const region = o.region || regionFromLang(lang);
    const trustedOnly = o.trustedOnly !== false;
    const now = o.now ?? Date.now();
    const todayOnly = o.todayOnly !== false;   // "Em breve" = only matches still airing TODAY
    if (!fetchImpl) throw new Error('[ZeroDelay] no fetch available');
    // credentials omitted: neither query carries the user's YouTube login/cookies.
    const req = { credentials: 'omit', signal };
    const parse = html => parseLiveSearchHtml(html, { limit, region, subRegion, trustedOnly });

    // Three sources in parallel: the Live-filtered search (streams on now), an
    // UNFILTERED competition search (some upcoming), and the trusted channels'
    // /streams tabs (the reliable, complete upcoming schedule).
    const [liveHtml, upHtml, channelUp] = await Promise.all([
        // Live is the primary feature — surface its error.
        fetchImpl(buildSearchUrl(lang), req).then(r => {
            if (!r.ok) throw new Error('[ZeroDelay] youtube fetch ' + r.status);
            return r.text();
        }),
        // Upcoming sources are best-effort — a failure must never sink the live list.
        fetchImpl(buildUpcomingSearchUrl(lang), req).then(r => (r.ok ? r.text() : '')).catch(() => ''),
        fetchChannelUpcoming({ region, fetchImpl, signal }).catch(() => []),
    ]);

    const live = parse(liveHtml).live;
    const trust = trustedSet(region, subRegion);

    // Merge upcoming from the channel /streams (complete) and the unfiltered
    // search (fills gaps); dedupe by id, drop anything already live, sort by time.
    const seen = new Set(live.map(m => m.id));
    let upcoming = [];
    for (const m of [...channelUp, ...parse(upHtml).upcoming]) {
        if (!m || seen.has(m.id)) continue;
        if (trustedOnly && !isTrusted(m, trust)) continue;
        seen.add(m.id);
        upcoming.push(m);
    }
    // Keep only what still airs today (local day) — a known time is required.
    if (todayOnly) upcoming = upcoming.filter(m => m.scheduledStart != null && isSameLocalDay(m.scheduledStart, now));
    upcoming.sort((a, b) => (a.scheduledStart || Infinity) - (b.scheduledStart || Infinity));
    return { live, upcoming: limit ? upcoming.slice(0, limit) : upcoming };
}
