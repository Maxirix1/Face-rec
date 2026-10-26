from pathlib import Path
from zipfile import ZipFile
from copy import deepcopy
from hashlib import sha256
from lxml import etree as E

ROOT = Path(__file__).resolve().parent
REF = Path(r'C:\Users\RCP\Downloads\Template-OS_Project_Report _1-69.docx')
OUT = ROOT.parent / 'รายงานโครงงาน_Face_Reg.docx'
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
ns = {'w': W}
def q(t): return '{'+W+'}'+t
with ZipFile(REF) as z:
    parts = {n:z.read(n) for n in z.namelist()}
root = E.fromstring(parts['word/document.xml'])
body = root.find('w:body', ns)
ps = body.findall('w:p', ns)
section = deepcopy(body.find('w:sectPr', ns))
inventory = '\n'.join(f'- {n}: {len(v)} bytes; SHA256 {sha256(v).hexdigest()}' for n,v in parts.items())
(ROOT/'artifact.md').write_text(f'''# Template contract
Reference: {REF}
SHA256: {sha256(REF.read_bytes()).hexdigest()}
One A4 portrait section, 11900 x 16840 twips, margins 1440 twips all sides.
Source typography: TH SarabunPSK; cover title 24 pt bold, cover metadata 20 pt, section heads 18 pt bold, body 16 pt. Centered cover and contribution/reference headings. Template numbering remains available.
Source slots: body paragraphs 0 title; 7–16 authors; 21–24 course and term; 26–30 objectives; 32–37 design and workflow table; 38–40 results; 41–45 conclusions; 48–69 contributions; 71–77 references.
Replace placeholder text with project evidence. Clone source paragraphs to expand each content slot. Keep all existing package parts except document.xml byte-identical. Preserve page geometry, section count, fonts, course, faculty, institution. Remove unused author/contribution placeholders; allow subsequent additions. User confirmed term 1/2569 and empty contribution details.
Use explicit page breaks between major groups to keep long narrative manageable. Workflow uses the original table container, with its placeholder replaced by a text flow diagram. No original images, content controls or TOC fields exist.
Render attempt failed: bundled LibreOffice unavailable on Windows; Word.Application also unavailable. Visual pagination remains unverified; package and text checks required. This unresolved rendering limitation must be disclosed.
## Package inventory
{inventory}
''', encoding='utf-8')

def prop(parent, name, **attrs):
    el = parent.find(q(name))
    if el is None: el = E.SubElement(parent, q(name))
    for k,v in attrs.items(): el.set(q(k), str(v))
    return el

def para(text, source=39, page=False, center=False, bold=None):
    p = deepcopy(ps[source])
    for child in list(p):
        if child.tag != q('pPr'): p.remove(child)
    pp = prop(p, 'pPr')
    for name in ['numPr','tabs','pageBreakBefore','keepNext']:
        e=pp.find(q(name))
        if e is not None: pp.remove(e)
    prop(pp,'ind',left=0,right=0,firstLine=0)
    prop(pp,'spacing',before=0,after=100,line=240,lineRule='auto')
    prop(pp,'jc',val='center' if center else 'left')
    if page: prop(pp,'pageBreakBefore')
    if source in [26,32,38,41,42,44,48,71]: prop(pp,'keepNext')
    rp = deepcopy(ps[source].find('w:r/w:rPr',ns))
    if rp is None: rp=E.Element(q('rPr'))
    prop(rp,'color',val='000000')
    if bold is not None:
        prop(rp,'b',val='1' if bold else '0'); prop(rp,'bCs',val='1' if bold else '0')
    for old in pp.findall('w:rPr',ns): pp.remove(old)
    pp.append(deepcopy(rp))
    r=E.SubElement(p,q('r')); r.append(rp)
    for i,line in enumerate(text.split('\n')):
        if i: E.SubElement(r,q('br'))
        t=E.SubElement(r,q('t'));t.text=line
    return p

for child in list(body): body.remove(child)
def add(text, source=39, **kw):
    p=para(text,source,**kw);body.append(p);return p

title=add('ระบบลงทะเบียนและจดจำใบหน้าผ่านเว็บเบราว์เซอร์\nFace Reg',0,center=True)
prop(title.find(q('pPr')),'pStyle',val='Title')
for _ in range(4): add('',1,center=True)
add('ผู้จัดทำ',6,center=True)
add('ภูวดล กัสปะ รหัสนักศึกษา 68050437',7,center=True)
for _ in range(7): add('',1,center=True)
add('โครงงานนี้เป็นส่วนหนึ่งของรายวิชา 05506007 ระบบปฏิบัติการ',21,center=True)
add('สาขาวิชาวิทยาการคอมพิวเตอร์ คณะวิทยาศาสตร์',22,center=True)
add('สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง',23,center=True)
add('ภาคเรียนที่ 1 ปีการศึกษา 2569',24,center=True)

add('1 วัตถุประสงค์',26,page=True)
add('โครงงาน Face Reg เป็นเว็บแอปพลิเคชันสำหรับทดลองลงทะเบียนและจดจำใบหน้า โดยรับภาพจากกล้องหรือไฟล์ภาพ ประมวลผลในเบราว์เซอร์ และเปรียบเทียบกับข้อมูลบุคคลที่บันทึกไว้ภายในเครื่อง ใช้เป็นกรณีศึกษาเรื่องการจัดการอุปกรณ์ หน่วยความจำ การจัดเก็บข้อมูล และการให้บริการไฟล์ของระบบปฏิบัติการ')
for s in [
'1.1 เพื่อพัฒนาระบบลงทะเบียนบุคคลด้วยตัวอย่างใบหน้า 3 ตัวอย่าง และแสดงผลการจับคู่กับรายชื่อที่บันทึกไว้',
'1.2 เพื่อศึกษาการตรวจจับใบหน้า จุดสำคัญบนใบหน้า และการเปรียบเทียบเวกเตอร์ลักษณะใบหน้าด้วย JavaScript',
'1.3 เพื่อศึกษาการขอสิทธิ์ใช้กล้อง การประมวลผลแบบอะซิงโครนัส และการคืนทรัพยากรเมื่อหยุดใช้งาน',
'1.4 เพื่อฝึกตรวจสอบข้อมูลและทดสอบตรรกะของโปรแกรม รวมถึงข้อผิดพลาดในการจัดเก็บและการเข้าถึงไฟล์']: add(s)
add('2 การออกแบบและการดำเนินงาน',32)
add('2.1 ขอบเขตและเครื่องมือที่ใช้',42)
add('ส่วนติดต่อผู้ใช้พัฒนาด้วย React และ Vite โดยแบ่งหน้าจอเป็นพื้นที่รับภาพ แบบฟอร์มลงทะเบียน รายชื่อบุคคล และผลการจดจำ ใช้ไลบรารี @vladmandic/face-api รุ่น 1.7.15 ส่วน Node.js ทำหน้าที่เตรียมไฟล์และให้บริการเว็บภายในเครื่อง ไม่ได้ประมวลผลใบหน้าแทนเบราว์เซอร์ [1], [2]')
add('ระบบใช้โมเดล Tiny Face Detector, Face Landmark 68 และ Face Recognition เลือก WebGL เป็นตัวประมวลผลก่อน และเปลี่ยนเป็น CPU หากเริ่มใช้งาน WebGL ไม่สำเร็จ ข้อมูลที่บันทึกประกอบด้วยรหัสบุคคล ชื่อ เวกเตอร์ใบหน้า และวันเวลาที่สร้าง โดยไม่มีฐานข้อมูลส่วนกลาง [2], [3]')

add('2.2 สถาปัตยกรรมและกระบวนการทำงาน',42,page=True)
add('เมื่อเปิดเว็บ เบราว์เซอร์โหลดส่วนติดต่อผู้ใช้และโมเดลจากเครื่อง ผู้ใช้เลือกเปิดกล้องหรือเลือกรูปภาพ จากนั้นระบบตรวจจับใบหน้าและสร้างเวกเตอร์ขนาด 128 ค่า ก่อนนำไปลงทะเบียนหรือเปรียบเทียบกับข้อมูลเดิม ขั้นตอนหลักแสดงดังแผนภาพต่อไปนี้')
table=deepcopy(root.find('.//w:tbl',ns)) if root.find('.//w:tbl',ns) is not None else None
# The original body has been replaced; recover the template table from its immutable bytes.
table=deepcopy(E.fromstring(parts['word/document.xml']).find('w:body/w:tbl',ns))
cell=table.find('.//w:tc',ns)
for child in list(cell):
    if child.tag!=q('tcPr'): cell.remove(child)
for line in ['เริ่มต้นและโหลดโมเดลในเบราว์เซอร์','↓','รับภาพจากกล้องหรือไฟล์ภาพ','↓','ตรวจจับใบหน้าและจุดสำคัญ 68 จุด','↓','สร้างเวกเตอร์ใบหน้า 128 ค่า','↓','ลงทะเบียน: ตรวจเงื่อนไข → เก็บ 3 ตัวอย่าง → บันทึก localStorage','หรือ','จดจำ: เทียบกับโปรไฟล์ → ตรวจเกณฑ์ระยะห่าง → แสดงผล']:
    cell.append(para(line,39,center=True))
body.append(table)
add('แผนภาพที่ 1 กระบวนการลงทะเบียนและจดจำใบหน้า',39,center=True)
add('2.3 การลงทะเบียนและจัดเก็บข้อมูล',42)
add('ผู้ใช้กรอกชื่อและยืนยันความยินยอมก่อนเก็บตัวอย่าง โดยในภาพต้องมีใบหน้าเพียงคนเดียว ระบบตรวจขนาด ความชัด และตำแหน่งใบหน้า รวมทั้งตรวจว่าตัวอย่างใหม่ต่างจากชุดเดิมมากเกินไปหรือใกล้เคียงกับบุคคลที่ลงทะเบียนแล้ว เมื่อครบ 3 ตัวอย่างจึงบันทึกโปรไฟล์ได้ [2], [3]')
add('ระบบบันทึก JSON ใน localStorage ภายใต้คีย์ face-reg.profiles.v1 และตรวจโครงสร้างข้อมูลทุกครั้งที่อ่านหรือเขียน หากข้อมูลเสียหายจะแจ้งข้อผิดพลาดโดยไม่ลบข้อมูลเดิม ผู้ใช้สามารถลบรายบุคคลหรือลบทั้งหมดได้ ข้อมูลแยกตามเบราว์เซอร์และ origin รวมถึงหมายเลขพอร์ต [3]')

add('2.4 หลักการจับคู่ใบหน้า',42,page=True)
add('ระบบคำนวณระยะห่างแบบยูคลิดระหว่างเวกเตอร์ที่ตรวจพบกับตัวอย่างทั้ง 3 ของแต่ละบุคคล แล้วใช้ค่าเฉลี่ยระยะห่างเลือกบุคคลที่ใกล้ที่สุด หากค่าเฉลี่ยน้อยกว่าหรือเท่ากับเกณฑ์ที่กำหนดจะแสดงชื่อ มิฉะนั้นแสดงว่าไม่รู้จัก ค่าเริ่มต้นของเกณฑ์เท่ากับ 0.50 โดยค่าระยะห่างไม่ใช่เปอร์เซ็นต์ความแม่นยำ [3]')
add('2.5 ความเกี่ยวข้องกับระบบปฏิบัติการ',42)
add('การจัดการอุปกรณ์และสิทธิ์: เบราว์เซอร์ร้องขอกล้องผ่าน getUserMedia โดยปิดการรับเสียงและตรวจบริบทที่ปลอดภัยก่อนใช้งาน เมื่อผู้ใช้หยุดกล้อง โปรแกรมเรียก stop กับ media tracks และยกเลิกตัวจับเวลา เพื่อคืนทรัพยากรที่ไม่ต้องใช้ [2]')
add('การจัดตารางงานและหน่วยความจำ: โปรแกรมรอให้การตรวจจับแต่ละรอบเสร็จก่อนนัดรอบถัดไปด้วย setTimeout และพักการตรวจจับเมื่อแท็บถูกซ่อน ใช้หมายเลขรุ่นของการเปิดกล้องเพื่อไม่ให้ผลจากงานเดิมกลับมาแก้ไขสถานะหลังหยุดกล้อง ส่วนภาพที่เลือกจากเครื่องใช้ Object URL และคืน URL เมื่อเลิกใช้งาน กระบวนการเหล่านี้เกิดในระดับแอปพลิเคชันบนเบราว์เซอร์ [2]')
add('ระบบไฟล์และการสื่อสาร: เซิร์ฟเวอร์ Node.js รับคำขอผ่าน 127.0.0.1 พอร์ตเริ่มต้น 5188 ให้บริการไฟล์จาก dist รองรับ GET และ HEAD และตรวจเส้นทางจริงเพื่อป้องกันการอ่านไฟล์นอกไดเรกทอรีที่กำหนด ส่วนการจดจำใบหน้าและการจัดเก็บโปรไฟล์ดำเนินการฝั่งเบราว์เซอร์ [4]')
add('2.6 การติดตั้งและการใช้งาน',42)
add('ติดตั้ง Node.js ตามข้อกำหนดใน package.json แล้วเปิดเทอร์มินัลที่โฟลเดอร์โครงงาน รัน npm install --ignore-scripts ตามด้วย npm start ซึ่งจะสร้างเว็บและเริ่มเซิร์ฟเวอร์ จากนั้นเปิด http://127.0.0.1:5188 ในเบราว์เซอร์ที่รองรับกล้องและ WebGL [1], [4]')
add('รอโมเดลพร้อม เลือกกล้องหรือไฟล์ภาพ กรอกชื่อและยืนยันความยินยอม เก็บตัวอย่าง 3 ครั้งโดยเปลี่ยนมุมเล็กน้อย แล้วบันทึกบุคคล จากนั้นใช้ภาพใหม่ทดสอบการจดจำและปรับเกณฑ์ระยะห่างได้ เมื่อเลิกใช้งานให้ปิดกล้องและลบโปรไฟล์ที่ไม่ต้องการเก็บไว้')

add('3 ผลการดำเนินงาน',38,page=True)
add('3.1 องค์ประกอบของระบบที่พัฒนา',42)
add('ซอร์สโค้ดปัจจุบันประกอบด้วยส่วนรับภาพจากกล้องและไฟล์ภาพ การลงทะเบียนด้วยตัวอย่าง 3 ชุด การแสดงกรอบใบหน้าและชื่อที่จับคู่ได้ การแสดงจำนวนใบหน้าและเวลาประมวลผลต่อรอบ ตลอดจนการลบโปรไฟล์และปรับเกณฑ์การจับคู่ ส่วนเลือกรูปภาพกำหนดขนาดไฟล์สูงสุด 12 MB และประมวลผลไฟล์ในเบราว์เซอร์ [2]')
add('3.2 ผลการทดสอบอัตโนมัติ',42)
add('การรันชุดทดสอบด้วย node --test เมื่อวันที่ 25 ตุลาคม 2569 พบการทดสอบทั้งหมด 15 รายการ ผ่าน 14 รายการ ไม่ผ่าน 0 รายการ และข้าม 1 รายการ เนื่องจากบัญชี Windows ที่ใช้ทดสอบไม่มีสิทธิ์สร้าง symbolic link จึงยังไม่ยืนยันผลทดสอบกรณีดังกล่าวในสภาพแวดล้อมนี้ [5]')
add('ชุดทดสอบด้านข้อมูล 8 รายการผ่านทั้งหมด ครอบคลุมการตรวจเวกเตอร์ การปรับรูปแบบชื่อและป้องกันชื่อซ้ำ การเลือกบุคคลที่ใกล้ที่สุด ขอบเขตเกณฑ์ระยะห่าง การอ่านเขียนและลบข้อมูล การรักษาข้อมูลเสียหาย การแจ้งข้อผิดพลาดพื้นที่จัดเก็บ และการคัดกรองตัวอย่างลงทะเบียน [5]')
add('ชุดทดสอบด้านเซิร์ฟเวอร์และไฟล์ 7 รายการ ผ่าน 6 รายการและข้าม 1 รายการ ครอบคลุมชนิดไฟล์และคำขอ HEAD การปฏิเสธเส้นทางไม่เหมาะสม วิธี HTTP ที่ไม่รองรับ การแจ้งเมื่อโมเดลหาย และการคัดลอกโมเดลตาม manifest โดยใช้ไฟล์จำลองในการทดสอบ [5]')
add('3.3 การประเมินผลการจดจำ',42)
add('ผลทดสอบข้างต้นยืนยันตรรกะโปรแกรมตามกรณีทดสอบ แต่ไม่ได้วัดความแม่นยำของโมเดลจากใบหน้าจริง การประเมินขั้นต่อไปควรแยกภาพลงทะเบียนออกจากภาพทดสอบ ทดลองทั้งบุคคลที่มีและไม่มีในรายชื่อ ภายใต้แสงและมุมที่ต่างกัน แล้วบันทึกจำนวนครั้งที่จับคู่ถูก จับคู่ผิด และปฏิเสธบุคคลที่ควรรู้จัก')
add('ควรทดสอบการปฏิเสธสิทธิ์กล้อง การถอดกล้อง การสลับโหมดรับภาพ และการเปิดเว็บใหม่เพื่อตรวจข้อมูลคงอยู่ร่วมด้วย โดยบันทึกสเปกเครื่อง เบราว์เซอร์ เกณฑ์ระยะห่าง และเวลาประมวลผล เพื่อให้เปรียบเทียบผลแต่ละครั้งได้อย่างมีความหมาย')

add('4 สรุปผล',41,page=True)
add('4.1 สรุปผลการดำเนินงาน',42)
add('โครงงานมีองค์ประกอบสำหรับลงทะเบียนและจดจำใบหน้าในเบราว์เซอร์ โดยแยกส่วนติดต่อผู้ใช้ การประมวลผล และการจัดเก็บข้อมูลอย่างชัดเจน การทดสอบอัตโนมัติที่ดำเนินการผ่าน 14 รายการและข้าม 1 รายการ แสดงว่าตรรกะที่ครอบคลุมในชุดทดสอบทำงานตามที่กำหนด ส่วนคุณภาพการจดจำกับผู้ใช้งานจริงยังต้องประเมินเพิ่มเติมก่อนนำไปใช้งาน')
add('4.2 ปัญหาและข้อเสนอแนะ',44)
add('แสง มุมใบหน้า ระยะจากกล้อง และคุณภาพตัวอย่างมีผลต่อการตรวจจับและจับคู่ ควรเก็บตัวอย่างหลายมุมอย่างสม่ำเสมอ และประเมินเกณฑ์ระยะห่างกับชุดทดสอบจริง ปัจจุบันระบบไม่มีการตรวจจับความมีชีวิตของใบหน้า จึงอาจรับภาพถ่ายหรือวิดีโอและไม่ควรใช้เป็นหลักฐานยืนยันตัวตนเพียงอย่างเดียว')
add('ข้อมูลใน localStorage อาจสูญหายเมื่อล้างข้อมูลเว็บไซต์ และไม่ถูกแชร์ข้ามเบราว์เซอร์หรือ origin ควรออกแบบการจัดเก็บ การเข้าถึง และระยะเวลาการเก็บข้อมูลให้เหมาะกับการใช้งานจริง นอกจากนี้ควรเพิ่มการทดสอบส่วนติดต่อผู้ใช้และป้องกันการเก็บรูปเดิมซ้ำในโหมดไฟล์ภาพ เพื่อให้ได้ตัวอย่างที่หลากหลายขึ้น')
add('การมีส่วนร่วมกับโครงงาน',48,center=True)
add('ภูวดล กัสปะ    รหัสนักศึกษา 68050437',50,bold=True)
add('หน้าที่และการมีส่วนร่วม: ........................................................................................')
add('.............................................................................................................................')
add('เอกสารอ้างอิง',71,center=True)
for s in [
'[1] โครงงาน Face Reg. package.json และ src/App.jsx. รุ่นโครงงาน 1.0.0.',
'[2] โครงงาน Face Reg. src/hooks/useFaceRegistry.js. การจัดการโมเดล กล้อง ภาพ และการลงทะเบียน.',
'[3] โครงงาน Face Reg. src/lib/profiles.js. การตรวจสอบข้อมูล การจับคู่ และการจัดเก็บโปรไฟล์.',
'[4] โครงงาน Face Reg. scripts/server.js, scripts/build.js และ scripts/prepare-assets.js. การให้บริการเว็บและเตรียมไฟล์.',
'[5] โครงงาน Face Reg. test/profiles.test.js และ test/server.test.js. ผลการรันทดสอบวันที่ 25 ตุลาคม 2569.'
]: add(s,73)
body.append(section)
edited=E.tostring(root,xml_declaration=True,encoding='UTF-8',standalone=True)
with ZipFile(REF) as src, ZipFile(OUT,'w') as dst:
    for info in src.infolist():
        dst.writestr(info, edited if info.filename=='word/document.xml' else src.read(info.filename))
with ZipFile(OUT) as z:
    assert all(z.read(n)==v for n,v in parts.items() if n!='word/document.xml')
    assert z.testzip() is None
    text=''.join(E.fromstring(z.read('word/document.xml')).itertext())
    assert 'ภูวดล กัสปะ' in text and '68050437' in text
    assert '66XXXXXX' not in text and '1/2568' not in text
    assert len(E.fromstring(z.read('word/document.xml')).findall('.//w:sectPr',ns))==1
assert sha256(REF.read_bytes()).hexdigest() in (ROOT/'artifact.md').read_text(encoding='utf-8')
print(OUT)
print('Verified: source unchanged; all non-body package parts preserved; placeholders replaced; one section.')
