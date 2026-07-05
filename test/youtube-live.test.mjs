// Tests for the YouTube live-match parser (youtube-live.js). The parser is pure,
// so it runs against a SMALL real fixture (test/fixtures/yt-live-search.json,
// trimmed from an actual results page) plus inline cases for branches the live
// snapshot didn't contain (upcoming, junk).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
    extractYtInitialData, parseVideoRenderer, parseYtInitialData, parseLiveSearchHtml,
    buildSearchUrl, queryForLang, thumbUrl, watchUrl, fetchLiveMatches,
    regionFromLang, trustedSet, isTrusted,
    isMatchBroadcast, parseScheduledText, parseChannelStreams, fetchChannelUpcoming,
} from '../youtube-live.js';

const fixture = JSON.parse(readFileSync(
    fileURLToPath(new URL('./fixtures/yt-live-search.json', import.meta.url)), 'utf8'));
const asHtml = obj => `<!doctype html><script>var ytInitialData = ${JSON.stringify(obj)};</script></body>`;

test('extractYtInitialData — pulls the object, survives strings and junk', () => {
    assert.deepEqual(extractYtInitialData('<script>ytInitialData = {"a":1,"b":"x};y"};</script>'), { a: 1, b: 'x};y' });
    assert.deepEqual(extractYtInitialData('window["ytInitialData"] = {"n":2};'), { n: 2 });
    assert.equal(extractYtInitialData('no data here'), null);
    assert.equal(extractYtInitialData(null), null);
});

test('parseVideoRenderer — live stream maps to a real, clickable match with channel identity', () => {
    const v = {
        videoId: 'abc12345678',
        title: { runs: [{ text: 'BRASIL X NORUEGA ' }, { text: 'AO VIVO' }] },
        ownerText: { runs: [{ text: 'CazéTV', navigationEndpoint: { browseEndpoint: { browseId: 'UCZiYbVptd3PVPf4f6eR6UaQ', canonicalBaseUrl: '/@CazeTV' } } }] },
        badges: [{ metadataBadgeRenderer: { style: 'BADGE_STYLE_TYPE_LIVE_NOW' } }],
        viewCountText: { runs: [{ text: '2.660.490' }, { text: ' assistindo' }] },
    };
    const m = parseVideoRenderer(v);
    assert.equal(m.status, 'live');
    assert.equal(m.title, 'BRASIL X NORUEGA AO VIVO');
    assert.equal(m.channel, 'CazéTV');
    assert.equal(m.handle, 'cazetv');                 // @-stripped, lowercased for matching
    assert.equal(m.channelId, 'UCZiYbVptd3PVPf4f6eR6UaQ');
    assert.equal(m.viewers, 2660490);
    assert.equal(m.thumbnail, thumbUrl('abc12345678'));
    assert.equal(m.watchUrl, watchUrl('abc12345678'));
});

test('parseVideoRenderer — upcoming carries a scheduled start; VOD/garbage rejected', () => {
    const up = parseVideoRenderer({
        videoId: 'up111111111',
        title: { simpleText: 'Palmeiras x Flamengo' },
        upcomingEventData: { startTime: '1799000000' },
        thumbnailOverlays: [{ thumbnailOverlayTimeStatusRenderer: { style: 'UPCOMING' } }],
    });
    assert.equal(up.status, 'upcoming');
    assert.equal(up.scheduledStart, 1799000000 * 1000);
    assert.equal(up.viewers, null);

    assert.equal(parseVideoRenderer({ videoId: 'vod00000000', title: { simpleText: 'highlights' } }), null); // no live/upcoming markers
    assert.equal(parseVideoRenderer({ title: { simpleText: 'x' } }), null); // no id
    assert.equal(parseVideoRenderer(null), null);
});

test('parseYtInitialData — trusted-only by default; keeps re-streams only when asked', () => {
    // Default keeps ONLY trusted broadcasters — for a BR viewer that's CazéTV
    // (verified id); the pirate re-streams drop.
    const trusted = parseYtInitialData(fixture, { region: 'BR' });
    assert.equal(trusted.live.length, 1);
    assert.equal(trusted.live[0].channel, 'CazéTV');

    // trustedOnly:false keeps everything, ranked by viewers (CazéTV still first).
    const all = parseYtInitialData(fixture, { trustedOnly: false });
    assert.ok(all.live.length >= 2);
    for (let i = 1; i < all.live.length; i++) {
        assert.ok((all.live[i - 1].viewers || 0) >= (all.live[i].viewers || 0), 'sorted by viewers desc');
    }
    assert.equal(all.live[0].channel, 'CazéTV');

    // Dedup + cap on the unfiltered set.
    const dupe = { contents: [...fixture.contents, ...fixture.contents] };
    const capped = parseYtInitialData(dupe, { trustedOnly: false, limit: 2 });
    assert.ok(capped.live.length <= 2);
    assert.equal(new Set(capped.live.map(m => m.id)).size, capped.live.length);
});

test('trust — region parsing, per-region sets, and id/handle matching block fakes', () => {
    assert.equal(regionFromLang('pt-BR'), 'BR');
    assert.equal(regionFromLang('es'), 'ES');            // language-only fallback
    const br = trustedSet('BR');
    assert.ok(br.has('cazetv') && br.has('sbt') && br.has('fifa'), 'country ∪ worldwide handles');
    assert.ok(br.has('UCZiYbVptd3PVPf4f6eR6UaQ'), 'verified ids join the set');
    assert.ok(!br.has('litoralnews'), 'a re-stream channel is not trusted');

    // Country-scoped: CazéTV counts for BR, not for a Spanish viewer.
    assert.equal(isTrusted({ handle: 'cazetv' }, 'BR'), true);
    assert.equal(isTrusted({ handle: 'cazetv' }, 'ES'), false);
    assert.equal(isTrusted({ channelId: 'UCZiYbVptd3PVPf4f6eR6UaQ' }, 'BR'), true);
    assert.equal(isTrusted({ channelId: 'UCZiYbVptd3PVPf4f6eR6UaQ' }, 'US'), false);
    // Worldwide/official confederations (FIFA, CONMEBOL) count everywhere.
    assert.equal(isTrusted({ channelId: 'UCpcTrCXblq78GZrTUTLWeBw' }, 'US'), true);
    assert.equal(isTrusted({ channelId: 'UCzU8-lZlRfkV3nj0RzAZdrQ' }, 'GB'), true); // CONMEBOL (ANY)
    assert.equal(isTrusted({ handle: 'concacaf' }, 'BR'), true);                     // international feed, worldwide
    assert.equal(isTrusted({ channelId: 'UCnj0TjaM0wyxkAWW_nz8_1g' }, 'JP'), true);  // The AFC Hub (ANY)
    // Foreign local leagues are region-scoped: K League for a Korean viewer.
    assert.equal(isTrusted({ handle: 'kleague' }, 'KR'), true);
    assert.equal(isTrusted({ handle: 'kleague' }, 'BR'), false);
    // A fake broadcast is rejected; a sub-region channel only with the sub-region on.
    assert.equal(isTrusted({ handle: 'litoralnews' }, 'BR'), false);
    assert.equal(isTrusted({ handle: 'paulistao' }, 'BR'), false);
    assert.equal(isTrusted({ handle: 'paulistao' }, 'BR', 'BR-SP'), true);
});

test('parseLiveSearchHtml — trusted stream survives; re-streams and junk drop', () => {
    const { live } = parseLiveSearchHtml(asHtml(fixture), { region: 'BR' });
    assert.equal(live.length, 1);
    assert.equal(live[0].channel, 'CazéTV');
    assert.deepEqual(parseLiveSearchHtml('<html>nothing</html>'), { live: [], upcoming: [] });
});

test('isMatchBroadcast — only game broadcasts pass; commentary/generic dropped', () => {
    assert.equal(isMatchBroadcast('AO VIVO: BRASIL X NORUEGA | COPA DO MUNDO FIFA 2026'), true);
    assert.equal(isMatchBroadcast('AO VIVO: ESTADOS UNIDOS X BÉLGICA | OITAVAS'), true);
    assert.equal(isMatchBroadcast('Portugal vs Espanha - AO VIVO'), true);
    // commentary / recaps / reactions / generic channel lives
    assert.equal(isMatchBroadcast('SUPER ESQUENTA DE BRASIL X NORUEGA'), false);
    assert.equal(isMatchBroadcast('BRASIL X NORUEGA AO VIVO: PRÉ-JOGO COMPLETO'), false);
    assert.equal(isMatchBroadcast('TUDO QUE ROLOU NO 24º DIA | RESUMO DA COPA'), false);
    assert.equal(isMatchBroadcast('SBT Ao Vivo'), false);              // no matchup
    assert.equal(isMatchBroadcast('PÓDCAST DA COPA: BRASIL X NORUEGA'), false);
    assert.equal(isMatchBroadcast(''), false);
});

test('parseScheduledText — reads YouTube\'s "Scheduled for M/D/YY, h:mm A"', () => {
    const t = parseScheduledText('Scheduled for 7/7/26, 3:00 PM');
    const d = new Date(t);
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 6);          // July (0-based)
    assert.equal(d.getDate(), 7);
    assert.equal(d.getHours(), 15);         // 3 PM (local components — tz-independent)
    assert.equal(d.getMinutes(), 0);
    // 12-hour edge cases + junk
    assert.equal(new Date(parseScheduledText('Scheduled for 1/2/2027, 12:30 AM')).getHours(), 0);
    assert.equal(new Date(parseScheduledText('12/1/26, 12:00 PM')).getHours(), 12);
    assert.equal(parseScheduledText('no date here'), null);
    assert.equal(parseScheduledText(null), null);
});

test('parseChannelStreams — lockupViewModel: upcoming match kept, commentary dropped, live tagged', () => {
    const lock = (id, title, badge, sched) => ({ lockupViewModel: {
        contentId: id,
        metadata: { lockupMetadataViewModel: { title: { content: title },
            metadata: { metadataViewModel: { metadataRows: [{ metadataParts: [{ text: { content: sched || '' } }] }] } } } },
        contentImage: { thumbnailViewModel: { overlays: [{ thumbnailBottomOverlayViewModel: { badges: [{ thumbnailBadgeViewModel: { text: badge } }] } }] } },
    } });
    const fixtureObj = { contents: [
        lock('aaaaaaaaaaa', 'AO VIVO: SUÍÇA X COLÔMBIA | COPA DO MUNDO', 'Upcoming', 'Scheduled for 7/7/26, 3:00 PM'),
        lock('bbbbbbbbbbb', 'SUPER ESQUENTA DE BRASIL X NORUEGA', 'Upcoming', 'Scheduled for 7/6/26, 1:00 PM'), // commentary → dropped
        lock('ccccccccccc', 'AO VIVO: BRASIL X NORUEGA | COPA', 'LIVE'),
        lock('ddddddddddd', 'TUDO QUE ROLOU | RESUMO', '2:01:36'),   // past VOD, not a match → dropped
    ] };
    const { live, upcoming } = parseChannelStreams(asHtml(fixtureObj), { handle: 'cazetv' });
    assert.equal(upcoming.length, 1);
    assert.equal(upcoming[0].id, 'aaaaaaaaaaa');
    assert.equal(upcoming[0].status, 'upcoming');
    assert.ok(upcoming[0].scheduledStart > 0);
    assert.equal(upcoming[0].thumbnail, thumbUrl('aaaaaaaaaaa'));
    assert.equal(live.length, 1);
    assert.equal(live[0].id, 'ccccccccccc');
    assert.equal(live[0].status, 'live');
});

test('fetchChannelUpcoming — calibrates /streams display time to real UTC (tz fix)', async () => {
    const lock = (id, title, sched) => ({ lockupViewModel: {
        contentId: id,
        metadata: { lockupMetadataViewModel: { title: { content: title }, metadata: { m: { text: { content: sched } } } } },
        contentImage: { thumbnailViewModel: { overlays: [{ thumbnailBottomOverlayViewModel: { badges: [{ thumbnailBadgeViewModel: { text: 'Upcoming' } }] } }] } },
    } });
    const streamsHtml = asHtml({ contents: [
        lock('mexeng0000a', 'AO VIVO: MÉXICO X INGLATERRA | COPA', 'Scheduled for 7/5/26, 3:30 PM'),
        lock('portesp000b', 'AO VIVO: PORTUGAL X ESPANHA | COPA', 'Scheduled for 7/5/26, 5:30 PM'),
    ] });
    let watchCalls = 0;
    const fetchImpl = async url => {
        if (url.includes('/watch')) { watchCalls++; return { ok: true, text: async () => '..."scheduledStartTime":"1783290600"...' }; } // 2026-07-05T22:30:00Z
        return { ok: true, text: async () => streamsHtml };
    };
    const up = await fetchChannelUpcoming({ region: 'BR', fetchImpl });
    assert.equal(up.length, 2);
    assert.equal(watchCalls, 1, 'ONE watch fetch calibrates the whole list');
    const by = Object.fromEntries(up.map(m => [m.id, m.scheduledStart]));
    // The "3:30 PM" display text is really 22:30 UTC (the tz bug); calibration fixes it,
    // and the +2h gap to the next match is preserved.
    assert.equal(new Date(by.mexeng0000a).toISOString(), '2026-07-05T22:30:00.000Z');
    assert.equal(by.portesp000b - by.mexeng0000a, 2 * 3600000);
});

test('buildSearchUrl / queryForLang — localized query + live filter', () => {
    assert.equal(queryForLang('pt-BR'), 'futebol ao vivo');
    assert.equal(queryForLang('xx'), 'live football');
    const url = buildSearchUrl('pt-BR');
    assert.match(url, /^https:\/\/www\.youtube\.com\/results\?/);
    assert.match(url, /search_query=futebol\+ao\+vivo/);
    assert.match(url, /hl=pt-BR/);
    assert.match(url, /&sp=EgJAAQ%3D%3D$/);
});

test('fetchLiveMatches — merges live + upcoming, today-only, best-effort upcoming', async () => {
    const NOW_SEC = 1799000000;                   // injected "now"
    const upRenderer = (id, startSec, title) => ({ videoRenderer: {
        videoId: id,
        title: { runs: [{ text: title }] },
        ownerText: { runs: [{ text: 'CazéTV', navigationEndpoint: { browseEndpoint: { browseId: 'UCZiYbVptd3PVPf4f6eR6UaQ', canonicalBaseUrl: '/@CazeTV' } } }] },
        upcomingEventData: { startTime: String(startSec) },
        thumbnailOverlays: [{ thumbnailOverlayTimeStatusRenderer: { style: 'UPCOMING' } }],
    } });
    // One match later TODAY, one two DAYS out — the unfiltered ("no sp=") search.
    const upcomingFixture = { contents: [
        upRenderer('uptoday0000', NOW_SEC + 3600, 'AO VIVO: BRASIL X COLÔMBIA'),
        upRenderer('upfuture000', NOW_SEC + 2 * 86400, 'AO VIVO: SUÍÇA X COLÔMBIA'),
    ] };
    const fakeFetch = async url => ({ ok: true, text: async () => asHtml(url.includes('sp=') ? fixture : upcomingFixture) });

    const { live, upcoming } = await fetchLiveMatches({ lang: 'pt-BR', fetchImpl: fakeFetch, now: NOW_SEC * 1000 });
    assert.equal(live.length, 1);                 // pt-BR → region BR → only the trusted CazéTV
    assert.equal(live[0].channel, 'CazéTV');
    assert.equal(upcoming.length, 1);             // only the match still airing today
    assert.equal(upcoming[0].id, 'uptoday0000');

    // A failed upcoming search must never sink the live list.
    const flaky = async url => url.includes('sp=')
        ? { ok: true, text: async () => asHtml(fixture) }
        : { ok: false, status: 500, text: async () => '' };
    assert.equal((await fetchLiveMatches({ lang: 'pt-BR', fetchImpl: flaky, now: NOW_SEC * 1000 })).live.length, 1);

    // A failed LIVE search does reject (it's the primary feature).
    const badFetch = async () => ({ ok: false, status: 503, text: async () => '' });
    await assert.rejects(() => fetchLiveMatches({ fetchImpl: badFetch }), /youtube fetch 503/);
});
