# Home Guard (Pi ↔ VPS ↔ ครอบครัว)

ระบบแจ้งเตือนเมื่อกล้องที่บ้านเจอ**คนที่ไม่ใช่คนในครอบครัว** แล้วให้คนในบ้านที่อยู่นอกบ้านเปิดดูกล้องแบบ realtime ผ่าน VPS + domain

## สถาปัตย์

```
[กล้อง + Raspberry Pi] --(VPN/SSH)--> [VPS effecttier]
   ตรวจใบหน้าคนแปลกหน้า              ├─ home-guard API/UI  (guard.effecttier.com)
   ดัน RTSP/WebRTC                    └─ MediaMTX stream   (cam1)
                                              │
                                    [มือถือครอบครัว] เปิดเว็บดูแจ้งเตือน + สตรีม
```

## ตอนนี้บน VPS มีอะไรแล้ว
- `home-guard` เว็บครอบครัว + API แจ้งเตือน (port `5191`)
- `MediaMTX` สำหรับรับสตรีมจาก Pi และเล่น WebRTC ในเบราว์เซอร์
- `pi-agent/` สคริปต์ตัวอย่างให้รันบน Pi

## ข้อจำกัดตอนมีแค่ Pi เปล่าๆ
- ยังสตรีมจริงไม่ได้จนกว่าจะมีกล้อง
- ทำได้ก่อน: VPS + หน้าเว็บ + ยิงแจ้งเตือนทดสอบ + เตรียมช่องทางเชื่อม Pi↔VPS (Tailscale/WireGuard/SSH tunnel)

## คำสั่งบน VPS

```bash
cd /root/home-guard
docker compose up -d
pm2 start server.js --name home-guard
```

Family token / Pi token อยู่ใน `.env`

## ขั้นตอนถัดไปบน Pi
1. ติดตั้งกล้อง
2. เชื่อม VPN ถึง VPS
3. ดันกล้อง: `ffmpeg … rtsp://VPS:8554/cam1`
4. เมื่อเจอคนแปลกหน้า ยิง `POST /api/alerts` (ดู `pi-agent/`)
