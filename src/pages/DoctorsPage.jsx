import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

const SPECIALTIES = [
  { key: 'all', label: 'ทั้งหมด', icon: 'mdi:account-group' },
  { key: 'surgery', label: 'ศัลยกรรม', icon: 'mdi:medical-bag' },
  { key: 'skin', label: 'ผิวหนัง', icon: 'mdi:face-woman-shimmer' },
  { key: 'laser', label: 'เลเซอร์', icon: 'mdi:laser-pointer' },
  { key: 'dental', label: 'ทันตกรรม', icon: 'mdi:tooth-outline' },
  { key: 'wellness', label: 'สุขภาพทั่วไป', icon: 'mdi:heart-pulse' },
];

const MOCK_DOCTORS = [
  { id: 1, name: 'นพ. สมชาย เจริญสุข', specialty: 'surgery', experience: 15, image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&q=80', rating: 4.9, reviews: 128, desc: 'ผู้เชี่ยวชาญด้านศัลยกรรมตกแต่ง มีประสบการณ์กว่า 15 ปี' },
  { id: 2, name: 'พญ. นภา วงศ์สว่าง', specialty: 'skin', experience: 12, image: 'https://images.unsplash.com/photo-1594824476967-48c8b964f137?w=300&q=80', rating: 4.8, reviews: 95, desc: 'แพทย์ผิวหนังเฉพาะทาง เชี่ยวชาญด้านเลเซอร์และฟิลเลอร์' },
  { id: 3, name: 'นพ. วิทยา ศรีสุข', specialty: 'laser', experience: 10, image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&q=80', rating: 4.7, reviews: 76, desc: 'ผู้เชี่ยวชาญด้านเลเซอร์และเทคโนโลยีความงาม' },
  { id: 4, name: 'ทพญ. อรุณี สุขสม', specialty: 'dental', experience: 8, image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&q=80', rating: 4.9, reviews: 112, desc: 'ทันตแพทย์เฉพาะทาง ด้านทันตกรรมเพื่อความสวยงาม' },
  { id: 5, name: 'นพ. ธนกร ปิยะพงษ์', specialty: 'surgery', experience: 20, image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&q=80', rating: 5.0, reviews: 203, desc: 'ศัลยแพทย์อาวุโส เชี่ยวชาญศัลยกรรมจมูกและตา' },
  { id: 6, name: 'พญ. ปิยนุช รัตนะ', specialty: 'wellness', experience: 9, image: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=300&q=80', rating: 4.6, reviews: 64, desc: 'แพทย์ด้านเวชศาสตร์ชะลอวัยและสุขภาพองค์รวม' },
];

const DoctorsPage = () => {
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [doctors, setDoctors] = useState(MOCK_DOCTORS);
  const navigate = useNavigate();

  const filtered = doctors.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.desc.toLowerCase().includes(search.toLowerCase());
    const matchSpec = specialty === 'all' || d.specialty === specialty;
    return matchSearch && matchSpec;
  });

  return (
    <>
      <main className="min-h-screen bg-section dark:bg-darkmode pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-10" data-aos="fade-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 dark:bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Icon icon="mdi:doctor" width="20" />
              ค้นหาแพทย์ผู้เชี่ยวชาญ
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-midnight_text dark:text-white mb-3">ทีมแพทย์ของเรา</h1>
            <p className="text-grey dark:text-gray-400 max-w-2xl mx-auto">ค้นหาแพทย์ผู้เชี่ยวชาญเฉพาะทาง พร้อมให้คำปรึกษาและดูแลคุณอย่างใกล้ชิด</p>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto mb-8" data-aos="fade-up" data-aos-delay="100">
            <div className="relative">
              <Icon icon="mdi:magnify" width="22" className="absolute left-4 top-1/2 -translate-y-1/2 text-grey" />
              <input
                type="text"
                placeholder="ค้นหาชื่อแพทย์ หรือความเชี่ยวชาญ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-border dark:border-gray-700 bg-white dark:bg-darklight text-midnight_text dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          {/* Specialty Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-10" data-aos="fade-up" data-aos-delay="150">
            {SPECIALTIES.map(s => (
              <button
                key={s.key}
                onClick={() => setSpecialty(s.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  specialty === s.key
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white dark:bg-darklight text-midnight_text dark:text-gray-300 hover:bg-primary/10 border border-border dark:border-gray-700'
                }`}
              >
                <Icon icon={s.icon} width="18" />
                {s.label}
              </button>
            ))}
          </div>

          {/* Doctor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((doc, i) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-darklight rounded-2xl overflow-hidden shadow-service dark:shadow-dark-md border border-border/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 group"
                data-aos="fade-up"
                data-aos-delay={i * 80}
              >
                <div className="relative h-56 overflow-hidden">
                  <img src={doc.image} alt={doc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 bg-white/90 dark:bg-darklight/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
                    <Icon icon="mdi:star" className="text-yellow-400" width="16" />
                    <span className="text-sm font-semibold text-midnight_text dark:text-white">{doc.rating}</span>
                    <span className="text-xs text-grey">({doc.reviews})</span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-midnight_text dark:text-white mb-1">{doc.name}</h3>
                  <p className="text-sm text-grey dark:text-gray-400 mb-3">{doc.desc}</p>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                      <Icon icon="mdi:briefcase-outline" width="14" />
                      {doc.experience} ปี
                    </span>
                    <span className="flex items-center gap-1 text-xs text-grey dark:text-gray-400">
                      <Icon icon="mdi:stethoscope" width="14" />
                      {SPECIALTIES.find(s => s.key === doc.specialty)?.label}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/appointment')}
                    className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon icon="mdi:calendar-plus" width="18" />
                    นัดหมายแพทย์
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Icon icon="mdi:account-search" width="64" className="mx-auto text-grey/30 mb-4" />
              <p className="text-grey dark:text-gray-400">ไม่พบแพทย์ที่ตรงกับการค้นหา</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default DoctorsPage;
