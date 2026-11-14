const jsonTokens = /"(?:\\[\s\S]|[^"\\])*"|[,\[\]{}]|[^\s",\[\]{}]+/g;

export function parseW3U(input, base, kind = 'live') {
  // Repair extra array separators without changing strings or URL queries.
  const tokens = input.replace(/^\uFEFF/, '').match(jsonTokens) || [];
  const normalized = tokens.filter((token, index) =>
    token !== ',' || (tokens[index + 1] !== undefined && tokens[index - 1] !== '[' && ![']', '}'].includes(tokens[index + 1])));
  const root = JSON.parse(normalized.join(' '));
  const items = [];
  const seen = new Set();
  let references = 0;
  function walk(node, category = 'ทั่วไป', station = false) {
    if (Array.isArray(node)) {
      node.forEach(child => walk(child, category, station));
      return;
    }
    if (!node || typeof node !== 'object') return;
    if (node.import === true || String(node.import).toLowerCase() === 'true') {
      references++;
      return;
    }
    if (station && typeof node.url === 'string') {
      try {
        const url = new URL(node.url, base);
        if (url.protocol === 'https:' && !url.username && !url.password &&
            /\.(?:m3u8|mp4|webm)(?:\/|$)/i.test(url.pathname) &&
            !node.referer && !node.referrer && !node.userAgent && !node.headers &&
            !seen.has(url.href)) {
          seen.add(url.href);
          items.push({url:url.href, name:String(node.name || 'ไม่ระบุชื่อ'), logo:'',
                      category, kind});
        }
      } catch { /* Skip invalid media URLs. */ }
    }
    if (Array.isArray(node.stations)) walk(node.stations, String(node.name || category), true);
    if (Array.isArray(node.groups)) walk(node.groups, category);
  }
  walk(root, 'ทั่วไป', Array.isArray(root));
  return {items, references};
}
