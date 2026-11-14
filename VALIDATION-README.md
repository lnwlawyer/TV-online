# Online TV V0.3 — M3U network validation

Double-click `CHECK-PLAYLISTS-WINDOWS.bat` on Windows 11 with Python 3 and Internet access. The script downloads selected IPTV-org lists, deduplicates by exact URL, requests HLS manifests and one referenced media resource (or MP4 header), then writes **only network-verified** entries to `verified-channels.m3u`. The CSV report contains every tested URL and failure reason. Import the resulting `.m3u` using the existing **จัดการช่องทีวี → นำเข้าไฟล์ M3U** button.

**Limitations:** Network verification does not guarantee playback in HLS.js/Smart TVs (CORS, DRM, codecs, geo-restrictions, expiring tokens), legal rights, or persistent uptime. The Movies/Series category playlists contain linear TV channels, not necessarily VOD titles. Use only streams you are entitled to view and embed. This project does not extract protected streams or bypass access controls. Existing V0.2 does not yet have a dedicated VOD catalog.

The playlist is intentionally not prepopulated with untested URLs. Run the checker on the machine/network where you will watch. The checker uses Python's standard library and requires no pip installs.
