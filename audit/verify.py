"""Probe reviewed HTTPS HLS sources and publish only successful rights-approved entries."""
import concurrent.futures
import datetime
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parent
ORIGIN = os.environ.get('STREAM_ORIGIN', 'https://lnwlawyer.github.io')


def fetch(url, path):
    result = subprocess.run([
        'curl', '--noproxy', '', '-sSL', '--max-time', '22',
        '--proto', '=https', '--proto-redir', '=https', '--max-filesize', '25000000',
        '-H', f'Origin: {ORIGIN}', '-D', str(path.with_suffix('.headers')),
        '-o', str(path), '-w', '%{http_code}\n%{url_effective}', url
    ], capture_output=True, text=True)
    status, _, effective = result.stdout.partition('\n')
    if result.returncode or status != '200':
        raise ValueError(f"HTTP {status or '000'}; curl={result.returncode}")
    headers = path.with_suffix('.headers').read_text().strip().split('\n\n')[-1]
    allowed = re.search(r'^access-control-allow-origin:\s*(\S+)', headers, re.I | re.M)
    if not allowed or allowed[1] not in ('*', ORIGIN):
        raise ValueError('CORS did not allow the app origin')
    return effective


def entries(text):
    return [line.strip() for line in text.splitlines() if line.strip() and not line.startswith('#')]


def probe(source):
    outcome = dict(source)
    try:
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            manifest = directory / 'manifest'
            if source['url'].endswith('.webm'):
                media = directory / 'video.webm'
                fetch(source['url'], media)
                result = subprocess.run([
                    'ffprobe','-v','error','-select_streams','v:0',
                    '-show_entries','stream=codec_name','-of','csv=p=0',str(media)
                ],capture_output=True,text=True,timeout=15)
                if result.returncode or not result.stdout.strip():
                    raise ValueError('Unreadable WebM video')
                outcome.update(technical='pass',codec=result.stdout.strip(),mode='vod',
                               sample_bytes=media.stat().st_size)
                return outcome
            effective = fetch(source['url'], manifest)
            text = manifest.read_text()
            if not text.startswith('#EXTM3U'):
                raise ValueError('Not an M3U manifest')
            if '#EXT-X-STREAM-INF:' in text:
                variants = re.findall(r'^#EXT-X-STREAM-INF:([^\n]*)\n([^#\r\n]+)', text, re.M)
                video = [uri.strip() for attributes, uri in variants if 'RESOLUTION=' in attributes]
                effective = fetch(urljoin(effective, (video or entries(text))[0]), manifest)
                text = manifest.read_text()
            if '#EXTINF:' not in text or '#EXT-X-KEY:' in text:
                raise ValueError('No clear media segments')
            segment = directory / 'segment.ts'
            uri = entries(text)[-1 if '#EXT-X-ENDLIST' not in text else 0]
            fetch(urljoin(effective, uri), segment)
            result = subprocess.run([
                'ffprobe', '-v', 'error', '-select_streams', 'v:0',
                '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', str(segment)
            ], capture_output=True, text=True, timeout=15)
            if result.returncode or not result.stdout.strip():
                raise ValueError('Sample segment did not contain a readable video stream')
            outcome.update(technical='pass', codec=result.stdout.splitlines()[0],
                           mode='vod' if '#EXT-X-ENDLIST' in text else 'live',
                           sample_bytes=segment.stat().st_size)
    except (ValueError, OSError, IndexError, subprocess.TimeoutExpired) as error:
        outcome.update(technical='unverified', reason=str(error))
    return outcome


def main():
    sources = json.loads((ROOT / 'sources.json').read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(probe, sources))
    accepted = []
    seen = set()
    for result in results:
        name = result['name']
        duplicate = name in seen
        expected_mode = 'live' if result['kind'] == 'live' else 'vod'
        if duplicate:
            result['decision'] = 'duplicate-title'
        elif not all(result.get(field) for field in ('rights','license','credit')):
            result['decision'] = 'rights-not-confirmed'
        elif result.get('technical') != 'pass' or result.get('mode') != expected_mode:
            result['decision'] = 'playback-not-confirmed'
        else:
            seen.add(name)
            accepted.append(result)
            result['decision'] = 'include'
    public = ROOT.parent / 'public'
    for name in ('live','vod'):
        rows = ['#EXTM3U']
        for item in accepted:
            if (item['kind'] == 'live') != (name == 'live'):
                continue
            rows.append(f'#EXTINF:-1 tvg-type="{item["kind"]}" group-title="{("Caminandes" if item["kind"] == "series" else "Open Movies")}",{item["name"]}')
            rows.append(item['url'])
        (public / f'verified-{name}.m3u').write_text('\n'.join(rows)+'\n')
    (public / 'stream-credits.json').write_text(json.dumps({r['url']:r for r in accepted}, indent=2)+'\n')
    report = {'checked_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'origin':ORIGIN, 'results':results}
    (ROOT / 'results.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
