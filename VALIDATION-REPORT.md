# Online TV & VOD V0.4 — รายงานตรวจสอบ 14 พฤศจิกายน 2569

## รายการตั้งต้น

| ประเภท | ผล | รายการ |
|---|---:|---|
| Live TV | 0 | ยังไม่มีรายการที่ยืนยันทั้งสิทธิและการเข้าถึงสตรีม |
| Movies | 2 | Big Buck Bunny (Mux), Tears of Steel (Unified Streaming) |
| Series | 3 ตอน | Caminandes — Llama Drama, Gran Dillama, Llamigos (Wikimedia Commons) |

หนังทั้งสองเรื่องผ่านการดาวน์โหลด HLS master manifest, variant manifest และชิ้นวิดีโอ H.264 ตัวอย่างพร้อมตรวจ CORS ทั้งสามชั้นด้วย Origin ของ GitHub Pages ที่คาดไว้ ซีรีส์ทั้งสามตอนดาวน์โหลด WebM/VP9 ได้และ ffprobe อ่านสตรีมภาพได้ ตรวจเครดิตและสัญญาอนุญาตรายรายการแล้วและแสดงในแอปเมื่อเลือกรายการ ตรวจเพียงชิ้นตัวอย่างสำหรับ HLS จึงยังไม่ได้ยืนยันการเล่นครบเรื่องหรือการเล่นผ่านเบราว์เซอร์จริง

## แหล่งที่ตรวจ

- ดาวน์โหลด [IPTV-org Index](https://iptv-org.github.io/iptv/index.m3u) และ [IPTV-org Thailand source](https://github.com/iptv-org/iptv/blob/master/streams/th.m3u) สำเร็จ พบ 11,472 และ 85 บรรทัด EXTINF ตามลำดับ พบ URL HTTP(S) 11,542 บรรทัด รวม URL ซ้ำแบบตรงตัว 63 บรรทัด เหลือ 11,479 URL ต่างกัน คัดทั้งสองชุดออกจากข้อมูลตั้งต้นเพราะยังไม่มีหลักฐานสิทธิรายช่อง และยังไม่ได้ทดสอบการเล่นทีละ URL
- ตรวจลิงก์ที่คัดมารายรายการ 11 รายการ รายละเอียด HTTP, CORS, codec, เหตุผลคัดออกและหลักฐานสิทธิอยู่ใน audit/results.json ขอบเขตคือแหล่งที่ระบุในรายงานและรายการที่บันทึกไว้ใน audit/sources.json
- Unified Streaming Live Reference และ Archived Live VTT Countdown อ่านชิ้นวิดีโอได้ แต่ยังยืนยันสิทธิเผยแพร่ไม่ได้
- PBS Big Buck Bunny ซ้ำกับเรื่องที่ใช้จาก Mux อีก URL ของ Big Buck Bunny ตอบ 404 ส่วน URL ของ Sintel และ JW Player ตัวอย่างตอบ 403 จากสภาพแวดล้อมที่ตรวจ
- ใช้เครดิตและเงื่อนไขของ [Big Buck Bunny](https://peach.blender.org/about/), [Tears of Steel](https://mango.blender.org/about/) และหน้าไฟล์ Wikimedia Commons ตาม audit/sources.json

## แอปและการเผยแพร่

- โหลด verified-live.m3u และ verified-vod.m3u อัตโนมัติ เปิดนำเข้าจากไฟล์หรือ URL HTTPS ที่อนุญาต CORS ในหน้าจัดการ รายการที่ผู้ใช้เพิ่มบันทึกในเบราว์เซอร์
- มี Live TV, Movies, Series และโหมด Smart TV ที่รองรับปุ่มลูกศรกับ Enter พร้อมเลย์เอาต์ตามขนาดหน้าจอ
- ผ่าน npm test 3 กรณี, production build สำหรับ path ของ GitHub Pages, การตรวจไฟล์อ้างอิงใน build, ขนาดไอคอนและไวยากรณ์ service worker
- การทดสอบ Chromium อัตโนมัติเริ่มไม่ได้ในสภาพแวดล้อมรันโค้ด จึงยังต้องทดสอบ React/HLS.js ตอนเล่นจริง การติดตั้ง PWA การเปิดหน้าออฟไลน์ และรีโมต Smart TV เครื่องจริง เครื่องรุ่นเก่าอาจไม่รองรับ VP9
- ยังไม่ได้เผยแพร่ GitHub Pages เพราะยังไม่มี repository ปลายทางสำหรับโครงการและ Cloud Browser อยู่หน้าลงชื่อเข้าใช้ GitHub
- สำหรับ GitHub Free ให้ใช้ repository สาธารณะของโครงการโดยเฉพาะ นำไฟล์ในโฟลเดอร์ app ขึ้น branch main รวม .github/workflows/deploy.yml จากนั้นเลือก Settings → Pages → Source → GitHub Actions และรัน Deploy GitHub Pages จากแท็บ Actions เมื่อ workflow สำเร็จ ใช้ URL จากผล deploy แล้วทดสอบการเล่นและการติดตั้ง PWA ที่ URL นั้น
