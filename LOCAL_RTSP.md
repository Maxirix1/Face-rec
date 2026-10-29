# Face + Ubuntu local (RTSP)

เบราว์เซอร์เปิด RTSP ตรงๆ ไม่ได้ — ใช้ MediaMTX แปลงเป็น WebRTC (WHEP) แล้ว face สแกนใบหน้าจากวิดีโอนั้น

## สถาปัตย์

```
กล้อง IP / USB  --RTSP-->  MediaMTX (Ubuntu)
                              |  WHEP
                              v
                         Face web (เฝ้าบ้าน)
                              |
                         POST alert --> VPS guard.effecttier.com
                              |
                         ครอบครัวดูสตรีมชุดเดียวที่ Guard
```

## 1) MediaMTX บน Ubuntu

คัดลอกจาก VPS `/root/home-guard` หรือ:

```bash
docker run --rm -it --network=host \
  -v "$PWD/mediamtx.yml:/mediamtx.yml:ro" \
  bluenviron/mediamtx:1.12.2
```

ตัวอย่าง `mediamtx.yml` path `cam1`:

```yaml
paths:
  cam1:
    # แบบ A: ให้ ffmpeg/กล้องมา publish
    source: publisher
    # แบบ B: MediaMTX ดึง RTSP เอง
    # source: rtsp://USER:PASS@192.168.1.50:554/stream1
```

## 2) ดันกล้องเข้า cam1 (ถ้าใช้ publisher)

```bash
# จาก IP camera
ffmpeg -rtsp_transport tcp -i 'rtsp://USER:PASS@CAM_IP/stream' \
  -c copy -f rtsp rtsp://127.0.0.1:8554/cam1

# จาก USB webcam
ffmpeg -f v4l2 -i /dev/video0 -an -c:v libx264 -preset ultrafast -tune zerolatency \
  -f rtsp rtsp://127.0.0.1:8554/cam1
```

## 3) รัน Face

```bash
cd ~/face   # หรือ K:\!WORK\Face-rec บนเครื่องพัฒนา แล้ว sync มา
npm install --ignore-scripts
npm run build
HOST=0.0.0.0 PORT=5188 npm start
# optional: MEDIAMTX_WHEP_ORIGIN=http://127.0.0.1:8889
```

เปิด `http://UBUNTU_IP:5188` → ตั้งค่าแหล่งกล้อง = **RTSP** → แท็บเฝ้าบ้าน

## 4) Guard บน VPS เห็นกล้องเดียวกัน

ดัน RTSP ไป VPS MediaMTX (VPN/SSH tunnel) path `cam1`  
แล้วเปิด `https://guard.effecttier.com` — หน้า live ใช้ WHEP ชุดเดียว
