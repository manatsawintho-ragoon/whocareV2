import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { apiGetPublicServices } from '../services/api';
import Footer from '../components/Footer';

const AppointmentPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiGetPublicServices({});
        if (res.success) setServices(res.data || []);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = services.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <main className="min-h-screen bg-section dark:bg-darkmode pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-10" data-aos="fade-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 dark:bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Icon icon="mdi:calendar-clock" width="20" />
              นัดหมายแพทย์ออนไลน์
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-midnight_text dark:text-white mb-3">นัดหมายแพทย์</h1>
            <p className="text-grey dark:text-gray-400 max-w-2xl mx-auto">เลือกบริการที่ต้องการ แล้วทำการนัดหมายกับแพทย์ผู้เชี่ยวชาญได้ทันที</p>
          </div>

          {/* Steps */}
          <div className="max-w-3xl mx-auto mb-10" data-aos="fade-up" data-aos-delay="100">
            <div className="grid grid-cols-3 gap-4">
              {[
                { step: 1, title: 'เลือกบริการ', desc: 'เลือกบริการที่ต้องการ', icon: 'mdi:hand-pointing-right' },
                { step: 2, title: 'เลือกวันเวลา', desc: 'เลือกวันและเวลานัดหมาย', icon: 'mdi:calendar-check' },
                { step: 3, title: 'ยืนยันนัดหมาย', desc: 'ตรวจสอบและยืนยัน', icon: 'mdi:check-circle' },
              ].map(s => (
                <div key={s.step} className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    <Icon icon={s.icon} width="24" className="text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-midnight_text dark:text-white">{s.title}</p>
                  <p className="text-xs text-grey dark:text-gray-400">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto mb-8" data-aos="fade-up" data-aos-delay="150">
            <div className="relative">
              <Icon icon="mdi:magnify" width="22" className="absolute left-4 top-1/2 -translate-y-1/2 text-grey" />
              <input
                type="text"
                placeholder="ค้นหาบริการ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-border dark:border-gray-700 bg-white dark:bg-darklight text-midnight_text dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          {/* Service Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-white dark:bg-darklight rounded-2xl h-72 animate-pulse border border-border/50 dark:border-gray-700/50" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((svc, i) => (
                <div
                  key={svc.id}
                  className="bg-white dark:bg-darklight rounded-2xl overflow-hidden shadow-service dark:shadow-dark-md border border-border/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 group"
                  data-aos="fade-up"
                  data-aos-delay={i * 60}
                >
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={svc.image_url || 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400&q=80'}
                      alt={svc.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {svc.branch && (
                      <span className="absolute top-3 left-3 bg-white/90 dark:bg-darklight/90 backdrop-blur-sm text-xs px-2.5 py-1 rounded-full text-midnight_text dark:text-white">
                        {svc.branch}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-midnight_text dark:text-white mb-1 line-clamp-1">{svc.name}</h3>
                    <p className="text-sm text-grey dark:text-gray-400 mb-3 line-clamp-2">{svc.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        {svc.is_promotion && svc.original_price > 0 && (
                          <span className="text-xs text-grey line-through mr-2">฿{Number(svc.original_price).toLocaleString()}</span>
                        )}
                        <span className="text-lg font-bold text-primary">฿{Number(svc.price).toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => navigate(`/booking/${svc.id}`)}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
                      >
                        <Icon icon="mdi:calendar-plus" width="16" />
                        จอง
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16">
              <Icon icon="mdi:calendar-blank" width="64" className="mx-auto text-grey/30 mb-4" />
              <p className="text-grey dark:text-gray-400">ไม่พบบริการที่ตรงกับการค้นหา</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default AppointmentPage;
