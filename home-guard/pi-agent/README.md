# Pi Agent — Home Guard

รันบน Raspberry Pi (เมื่อมีกล้อง)

## สิ่งที่ต้องมี
- Raspberry Pi + กล้อง (USB / Pi Camera)
- เน็ตถึง VPS นี้ได้ (แนะนำ WireGuard/Tailscale หรือ SSH tunnel)
- คนในบ้านถูก enroll ไว้ก่อน (ใช้แอป face หรือไฟล์โปรไฟล์)

## สถาปัตย์
1. Pi ตรวจใบหน้าคนแปลกหน้า
2. ถ้า **ไม่ใช่คนในบ้าน** → `POST /api/alerts` ไปที่ VPS + เริ่มดันกล้อง
3. ครอบครัวเปิด `https://guard.effecttier.com` ดูแจ้งเตือน + สตรีมสด

## ดันสตรีมไป VPS (ตัวอย่าง)

ถ้า VPS เปิด RTSP ที่พอร์ต 8554 ผ่าน VPN:

```bash
ffmpeg -f v4l2 -i /dev/video0 \
  -an -c:v libx264 -preset ultrafast -tune zerolatency -f rtsp \
  rtsp://VPS_VPN_IP:8554/cam1
```

หรือใช้ SSH tunnel จาก Pi:

```bash
ssh -N -R 8554:127.0.0.1:8554 user@effecttier-vps
```

## ยิงแจ้งเตือนทดสอบ

```bash
export PI_TOKEN='...'   # จาก VPS .env
export GUARD_URL='https://guard.effecttier.com'

curl -X POST "$GUARD_URL/api/alerts" \
  -H "Authorization: Bearer $PI_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"type":"unknown","label":"คนแปลกหน้า","message":"ตรวจพบบุคคลที่ไม่ใช่คนในบ้าน"}'
```

สคริปต์ตัวอย่าง: `agent.py`
