import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {parseM3U, exportM3U} from '../src/playlist.js';

test('parses relative URLs, quoted commas, categories and duplicates', () => {
  const rows = parseM3U('\uFEFF#EXTM3U\r\n#EXTINF:-1 tvg-type="series" group-title="One, two",Episode 1\r\nvideo.mp4\r\n#EXTINF:-1,Duplicate\r\nvideo.mp4', 'https://example.org/list.m3u');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Episode 1');
  assert.equal(rows[0].category, 'One, two');
  assert.equal(rows[0].kind, 'series');
  assert.equal(rows[0].url, 'https://example.org/video.mp4');
  assert.deepEqual(parseM3U(exportM3U(rows)), rows);
});

test('rejects HLS manifests and URLs with embedded credentials', () => {
  assert.deepEqual(parseM3U('#EXTM3U\n#EXT-X-VERSION:4\n#EXTINF:2,\nsegment.ts'), []);
  assert.deepEqual(parseM3U('#EXTM3U\n#EXTINF:-1,Private\nhttps://user:pass@example.org/media.mp4'), []);
});

test('published catalog matches audited approvals and credits', () => {
  const results = JSON.parse(readFileSync(new URL('../audit/results.json', import.meta.url)));
  const credits = JSON.parse(readFileSync(new URL('../public/stream-credits.json', import.meta.url)));
  const items = ['verified-live.m3u','verified-vod.m3u'].flatMap(file =>
    parseM3U(readFileSync(new URL('../public/'+file, import.meta.url), 'utf8')));
  assert.deepEqual(items.map(i=>i.url).sort(),results.results.filter(i=>i.decision==='include').map(i=>i.url).sort());
  assert.equal(new Set(items.map(i=>i.url)).size, items.length);
  for (const item of items) {
    assert.ok(credits[item.url].credit);
    assert.ok(credits[item.url].license);
    assert.equal(credits[item.url].kind, item.kind);
  }
});
