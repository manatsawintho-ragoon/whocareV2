import { useState } from 'react';
import { Icon } from '@iconify/react';
import { hospitals } from '../data/data';
import Footer from '../components/Footer';

const CENTERS = [
  {
    key: 'surgery', name: 'ศูนย์ศัลยกรรมตกแต่ง', icon: 'mdi:face-man-shimmer',
    desc: 'ศัลยกรรมจมูก ตา หน้าอก ดูดไขมัน โดยศัลยแพทย์ผู้เชี่ยวชาญ', color: 'bg-blue-500', ring: 'ring-blue-300',
    services: [
      { name: 'ศัลยกรรมจมูก', icon: 'mdi:nose', detail: 'เสริมจมูก แก้จมูก ตัดปีกจมูก' },
      { name: 'ศัลยกรรมตา', icon: 'mdi:eye-outline', detail: 'ทำตาสองชั้น กรีดหัวตา ถุงใต้ตา' },
      { name: 'ศัลยกรรมหน้าอก', icon: 'mdi:human-female', detail: 'เสริมหน้าอก ยกกระชับ แก้ไขหน้าอก' },
      { name: 'ดูดไขมัน', icon: 'mdi:water-minus', detail: 'ดูดไขมันหน้าท้อง ต้นขา แขน คาง' },
    ],
  },
  {
    key: 'skin', name: 'ศูนย์ผิวหนังและเลเซอร์', icon: 'mdi:laser-pointer',
    desc: 'รักษาปัญหาผิวหนัง เลเซอร์ IPL รอยสิว ฝ้า กระ จุดด่างดำ', color: 'bg-purple-500', ring: 'ring-purple-300',
    services: [
      { name: 'เลเซอร์หน้าใส', icon: 'mdi:flash-outline', detail: 'เลเซอร์ Q-Switch, Pico Laser' },
      { name: 'IPL กำจัดขน', icon: 'mdi:ray-vertex', detail: 'IPL กำจัดขนถาวร ทุกส่วนของร่างกาย' },
      { name: 'รักษาสิว', icon: 'mdi:face-woman-shimmer', detail: 'รักษาสิวอักเสบ สิวผด หลุมสิว' },
      { name: 'ฝ้า กระ จุดด่างดำ', icon: 'mdi:circle-opacity', detail: 'รักษาฝ้า กระ เมลาสมา จุดด่างดำ' },
    ],
  },
  {
    key: 'anti-aging', name: 'ศูนย์ชะลอวัย', icon: 'mdi:bottle-tonic-plus',
    desc: 'ร้อยไหม ฟิลเลอร์ โบท็อกซ์ PRP สเต็มเซลล์ วิตามินบำรุง', color: 'bg-pink-500', ring: 'ring-pink-300',
    services: [
      { name: 'ร้อยไหม', icon: 'mdi:needle', detail: 'ร้อยไหมยกกระชับหน้า คอ ลดริ้วรอย' },
      { name: 'ฟิลเลอร์', icon: 'mdi:eyedropper', detail: 'ฟิลเลอร์เติมร่องแก้ม ปาก คาง จมูก' },
      { name: 'โบท็อกซ์', icon: 'mdi:needle', detail: 'โบท็อกซ์ลดริ้วรอย ลดกราม ลดเหงื่อ' },
      { name: 'PRP & สเต็มเซลล์', icon: 'mdi:blood-bag', detail: 'ฟื้นฟูผิวด้วยเกล็ดเลือดและสเต็มเซลล์' },
    ],
  },
  {
    key: 'body', name: 'ศูนย์ดูแลรูปร่าง', icon: 'mdi:human-female-dance',
    desc: 'ดูดไขมัน สลายไขมัน กระชับสัดส่วน เทคโนโลยีลดน้ำหนัก', color: 'bg-green-500', ring: 'ring-green-300',
    services: [
      { name: 'สลายไขมัน', icon: 'mdi:fire', detail: 'สลายไขมันด้วยความเย็น เลเซอร์ คลื่นวิทยุ' },
      { name: 'กระชับสัดส่วน', icon: 'mdi:human', detail: 'กระชับหน้าท้อง ต้นขา ต้นแขน' },
      { name: 'ลดน้ำหนัก', icon: 'mdi:scale-bathroom', detail: 'โปรแกรมลดน้ำหนักแบบครบวงจร' },
      { name: 'เทคโนโลยี Body Contouring', icon: 'mdi:cog-outline', detail: 'HIFU Body, RF Body, CoolSculpting' },
    ],
  },
  {
    key: 'dental', name: 'ศูนย์ทันตกรรม', icon: 'mdi:tooth-outline',
    desc: 'จัดฟัน วีเนียร์ รากฟันเทียม ฟอกสีฟัน ทันตกรรมเพื่อความสวยงาม', color: 'bg-cyan-500', ring: 'ring-cyan-300',
    services: [
      { name: 'จัดฟัน', icon: 'mdi:tooth', detail: 'จัดฟันแบบใส Invisalign, จัดฟันแบบติดแน่น' },
      { name: 'วีเนียร์', icon: 'mdi:star-face', detail: 'วีเนียร์เคลือบฟัน ยิ้มสวยเป็นธรรมชาติ' },
      { name: 'รากฟันเทียม', icon: 'mdi:screw-machine-round-top', detail: 'ปลูกรากฟันเทียมแทนฟันที่สูญเสีย' },
      { name: 'ฟอกสีฟัน', icon: 'mdi:white-balance-sunny', detail: 'ฟอกสีฟันขาวสดใส ปลอดภัย' },
    ],
  },
  {
    key: 'wellness', name: 'ศูนย์สุขภาพองค์รวม', icon: 'mdi:heart-pulse',
    desc: 'ตรวจสุขภาพ วิเคราะห์ระบบร่างกาย โปรแกรมดูแลสุขภาพครบวงจร', color: 'bg-orange-500', ring: 'ring-orange-300',
    services: [
      { name: 'ตรวจสุขภาพ', icon: 'mdi:clipboard-pulse-outline', detail: 'ตรวจสุขภาพประจำปี แพ็กเกจตรวจครบ' },
      { name: 'วิเคราะห์ร่างกาย', icon: 'mdi:chart-line', detail: 'วิเคราะห์ระบบร่างกายเชิงลึก ฮอร์โมน' },
      { name: 'วิตามินบำรุง', icon: 'mdi:iv-bag', detail: 'วิตามินบำรุงทางหลอดเลือด IV Drip' },
      { name: 'ดูแลสุขภาพครบวงจร', icon: 'mdi:shield-check', detail: 'โปรแกรมดูแลสุขภาพระยะยาว' },
    ],
  },
];

const MedicalCenterPage = () => {
  const [selectedCenter, setSelectedCenter] = useState(null);
  const allBranches = [...hospitals.thailand, ...hospitals.international];

  return (
    <>
      <main className="min-h-screen bg-section dark:bg-darkmode pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-10" data-aos="fade-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 dark:bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Icon icon="mdi:hospital-building" width="20" />
              ศูนย์การแพทย์เฉพาะทาง
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-midnight_text dark:text-white mb-3">ศูนย์ทางการแพทย์</h1>
            <p className="text-grey dark:text-gray-400 max-w-2xl mx-auto">ศูนย์การแพทย์เฉพาะทางครบครัน พร้อมเทคโนโลยีทันสมัยและทีมแพทย์ผู้เชี่ยวชาญ</p>
          </div>

          {/* Medical Centers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-start gap-6 mb-16" data-aos="fade-up">
            {CENTERS.map((c, i) => {
              const isOpen = selectedCenter === c.key;
              return (
                <div
                  key={c.key}
                  className={`bg-white dark:bg-darklight rounded-2xl shadow-service dark:shadow-dark-md border transition-shadow transition-colors duration-300 cursor-pointer group ${
                    isOpen
                      ? `border-2 ${c.ring.replace('ring', 'border')} ring-2 ${c.ring}/30`
                      : 'border-border/50 dark:border-gray-700/50 hover:shadow-xl hover:border-primary/30'
                  }`}
                >
                  <div className="p-6" onClick={() => setSelectedCenter(isOpen ? null : c.key)}>
                    <div className={`w-14 h-14 ${c.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon icon={c.icon} width="28" className="text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-midnight_text dark:text-white mb-2">{c.name}</h3>
                    <p className="text-sm text-grey dark:text-gray-400 leading-relaxed">{c.desc}</p>
                    <div className="mt-4 flex items-center gap-1 text-primary text-sm font-medium">
                      <span>{isOpen ? 'ปิด' : 'ดูเพิ่มเติม'}</span>
                      <Icon icon={isOpen ? 'mdi:chevron-up' : 'mdi:chevron-right'} width="18" />
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <h4 className="text-sm font-semibold text-midnight_text dark:text-white mb-3">บริการในศูนย์</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {c.services.map((s) => (
                          <div key={s.name} className="flex items-start gap-3 p-3 bg-section dark:bg-darkmode rounded-xl">
                            <div className={`w-9 h-9 ${c.color}/10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                              <Icon icon={s.icon} width="20" className={c.color.replace('bg-', 'text-')} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-midnight_text dark:text-white">{s.name}</p>
                              <p className="text-xs text-grey dark:text-gray-400">{s.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); }}
                        className={`mt-4 w-full py-2.5 rounded-xl text-white text-sm font-medium ${c.color} hover:opacity-90 transition-opacity`}
                      >
                        นัดหมายศูนย์นี้
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Branches Section */}
          <div className="mb-6" data-aos="fade-up">
            <h2 className="text-2xl font-bold text-midnight_text dark:text-white mb-2 text-center">สาขาของเรา</h2>
            <p className="text-grey dark:text-gray-400 text-center mb-8">ให้บริการทั้งในประเทศไทยและต่างประเทศ</p>
          </div>

          {/* Thailand */}
          <h3 className="text-lg font-bold text-midnight_text dark:text-white mb-4 flex items-center gap-2" data-aos="fade-up">
            <span className="text-2xl">🇹🇭</span> ประเทศไทย
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {hospitals.thailand.map((h, i) => (
              <div
                key={i}
                className="bg-white dark:bg-darklight rounded-2xl overflow-hidden shadow-service dark:shadow-dark-md border border-border/50 dark:border-gray-700/50 hover:shadow-xl transition-all group"
                data-aos="fade-up"
                data-aos-delay={i * 60}
              >
                <div className="h-36 overflow-hidden">
                  <img src={h.image} alt={h.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-midnight_text dark:text-white text-sm mb-1">{h.name}</h4>
                  <p className="text-xs text-grey dark:text-gray-400 flex items-center gap-1 mb-2">
                    <Icon icon="mdi:map-marker" width="14" /> {h.location}
                  </p>
                  <p className="text-xs text-grey dark:text-gray-400 flex items-center gap-1 mb-2">
                    <Icon icon="mdi:phone" width="14" /> {h.phone}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {h.services.map((s, j) => (
                      <span key={j} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* International */}
          <h3 className="text-lg font-bold text-midnight_text dark:text-white mb-4 flex items-center gap-2" data-aos="fade-up">
            <span className="text-2xl">🌏</span> ต่างประเทศ
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {hospitals.international.map((h, i) => (
              <div
                key={i}
                className="bg-white dark:bg-darklight rounded-2xl overflow-hidden shadow-service dark:shadow-dark-md border border-border/50 dark:border-gray-700/50 hover:shadow-xl transition-all group"
                data-aos="fade-up"
                data-aos-delay={i * 60}
              >
                <div className="h-36 overflow-hidden">
                  <img src={h.image} alt={h.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-midnight_text dark:text-white text-sm mb-1">{h.name}</h4>
                  <p className="text-xs text-grey dark:text-gray-400 flex items-center gap-1 mb-2">
                    <Icon icon="mdi:map-marker" width="14" /> {h.location}
                  </p>
                  <p className="text-xs text-grey dark:text-gray-400 flex items-center gap-1 mb-2">
                    <Icon icon="mdi:phone" width="14" /> {h.phone}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {h.services.map((s, j) => (
                      <span key={j} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default MedicalCenterPage;
