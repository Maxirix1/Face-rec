# Deploy Face (ชุดเดียว) บน Raspberry Pi

โค้ดเดียวกับ `face.effecttier.com` — บน Pi ใช้โหมด **เฝ้าบ้าน** แล้วแจ้งเตือนไป VPS

## 1) คัดลอกโปรเจกต์ไป Pi

```bash
# บน VPS
rsync -av --exclude node_modules --exclude dist /root/face/ pi@PI_IP:~/face/
```

## 2) ติดตั้งและรันบน Pi

```bash
cd ~/face
npm install --ignore-scripts
npm run build
HOST=0.0.0.0 PORT=5188 npm start
# หรือ pm2:
# HOST=0.0.0.0 PORT=5188 pm2 start scripts/start.mjs --name face
```

เปิดจากมือถือในบ้าน: `http://PI_IP:5188`

## 3) ตั้งค่าในแอป (แท็บ ตั้งค่า)

- Guard URL: `https://guard.effecttier.com`
- Pi Token: ค่า `PI_TOKEN` จาก `/root/home-guard/.env` บน VPS
- เปิดโหมดเฝ้าบ้าน
- กด “ทดสอบแจ้งเตือน”

## 3.1) ซิงก์รายชื่อครอบครัว (สำคัญ)

VPS **ไม่ค้นหา** Pi อัตโนมัติ — Pi เป็นฝ่ายยิงไปที่ Guard URL

1. บนมือถือ/PC (face.effecttier.com) ลงทะเบียนครอบครัว → กด **ซิงก์ครอบครัวขึ้น VPS**
2. บน Pi กด **ดึงครอบครัวจาก VPS** ให้ได้ descriptor ชุดเดียวกัน
3. จากนั้นโหมดเฝ้าบ้านบน Pi จะรู้ว่าใครคือคนในบ้าน

## 4) ใช้งาน

1. แท็บ **ครอบครัว** — อัปโหลดรูปคนในบ้าน + ซิงก์ขึ้น VPS
2. บน Pi ดึงรายชื่อจาก VPS
3. แท็บ **เฝ้าบ้าน** — เปิดกล้อง
4. เจอคนแปลกหน้า → Pi POST ไป VPS อัตโนมัติ
5. คนในครอบครัวเปิด `https://guard.effecttier.com` ดูแจ้งเตือน (+ สตรีมเมื่อมีกล้องดัน RTSP)

## 5) สตรีมสด (เมื่อมีกล้อง)

บน Pi ดันกล้องเข้า MediaMTX ของ VPS (ผ่าน VPN/SSH tunnel):

```bash
ffmpeg -f v4l2 -i /dev/video0 -an -c:v libx264 -preset ultrafast -tune zerolatency \
  -f rtsp rtsp://VPS_VPN_IP:8554/cam1
```

รายละเอียดเพิ่มใน `/root/home-guard/pi-agent/README.md`
