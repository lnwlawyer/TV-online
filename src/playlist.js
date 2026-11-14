export function parseM3U(input, base, fallback = 'live') {
  if (/^#EXT-X-/m.test(input)) return [];
  const items = [];
  const urls = new Set();
  let info;
  for (const raw of input.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('#EXTINF:')) {
      const separator = line.match(/^(?:[^",]|"[^"]*")*,/);
      const title = separator ? line.slice(separator[0].length).trim() : '';
      const attr = key => line.match(new RegExp(`(?:^|\\s)${key}="([^"]*)"`, 'i'))?.[1] || '';
      const kind = attr('tvg-type').toLowerCase();
      info = {
        name: attr('tvg-name') || title || 'ไม่ระบุชื่อ',
        logo: attr('tvg-logo'),
        category: attr('group-title') || 'ทั่วไป',
        kind: ['live','movies','series'].includes(kind) ? kind : fallback
      };
    } else if (line && !line.startsWith('#') && info) {
      try {
        const url = new URL(line, base);
        if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !urls.has(url.href)) {
          urls.add(url.href);
          items.push({...info, id: `catalog:${url.href}`, url: url.href});
        }
      } catch { /* Skip malformed URLs. */ }
      info = undefined;
    }
  }
  return items;
}

export function exportM3U(items) {
  const safe = value => String(value || '').replace(/[\r\n"]/g, ' ').trim();
  return ['#EXTM3U', ...items.flatMap(item=>[
    `#EXTINF:-1 tvg-type="${safe(item.kind || 'live')}" tvg-name="${safe(item.name)}" tvg-logo="${safe(item.logo)}" group-title="${safe(item.category)}",${safe(item.name)}`,
    item.url
  ])].join('\n')+'\n';
}
