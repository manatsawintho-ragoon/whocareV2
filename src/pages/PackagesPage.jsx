import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { apiGetPublicServices } from '../services/api';
import Footer from '../components/Footer';

const PackagesPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // all, promotion
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {};
        if (tab === 'promotion') params.promotion = 'true';
        const res = await apiGetPublicServices(params);
        if (res.success) {
          const data = res.data || [];
          setServices(tab === 'all' ? data : data.filter(s => s.is_promotion));
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, [tab]);

  return (
    <>
      <main className="min-h-screen bg-section dark:bg-darkmode pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-10" data-aos="fade-up">
            <div className="inline-flex items-center gap-2 bg-red-500/10 dark:bg-red-500/20 text-red-500 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Icon icon="mdi:tag-multiple" width="20" />
              โปรโมชั่นพิเศษ
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-midnight_text dark:text-white mb-3">แพ็กเกจ & โปรโมชั่น</h1>
            <p className="text-grey dark:text-gray-400 max-w-2xl mx-auto">รวมแพ็กเกจสุดคุ้มและโปรโมชั่นพิเศษ ราคาดีที่สุดในตอนนี้</p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center gap-3 mb-10" data-aos="fade-up" data-aos-delay="100">
            <button
              onClick={() => setTab('all')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === 'all' ? 'bg-primary text-white shadow-md' : 'bg-white dark:bg-darklight text-midnight_text dark:text-gray-300 border border-border dark:border-gray-700'
              }`}
            >
              แพ็กเกจทั้งหมด
            </button>
            <button
              onClick={() => setTab('promotion')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                tab === 'promotion' ? 'bg-red-500 text-white shadow-md' : 'bg-white dark:bg-darklight text-midnight_text dark:text-gray-300 border border-border dark:border-gray-700'
              }`}
            >
              <Icon icon="mdi:fire" width="16" /> โปรโมชั่น
            </button>
          </div>

          {/* Promo Banner */}
          <div className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-6 md:p-8 mb-10 text-white" data-aos="fade-up" data-aos-delay="150">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">🎉 โปรโมชั่นประจำเดือน</h2>
                <p className="text-white/80 mb-4">รับส่วนลดสูงสุด 50% สำหรับแพ็กเกจที่ร่วมรายการ พร้อมบริการคุณภาพจากทีมแพทย์ผู้เชี่ยวชาญ</p>
                <div className="flex gap-3">
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm">✓ ปรึกษาฟรี</span>
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm">✓ ผ่อน 0%</span>
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm">✓ รับประกัน</span>
                </div>
              </div>
              <Icon icon="mdi:gift" width="80" className="text-white/30" />
            </div>
          </div>

          {/* Cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-white dark:bg-darklight rounded-2xl h-80 animate-pulse border border-border/50 dark:border-gray-700/50" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((svc, i) => {
                const discount = svc.is_promotion && svc.original_price > 0
                  ? Math.round(((svc.original_price - svc.price) / svc.original_price) * 100)
                  : 0;
                return (
                  <div
                    key={svc.id}
                    className="bg-white dark:bg-darklight rounded-2xl overflow-hidden shadow-service dark:shadow-dark-md border border-border/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 group"
                    data-aos="fade-up"
                    data-aos-delay={i * 60}
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={svc.image_url || 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400&q=80'}
                        alt={svc.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {discount > 0 && (
                        <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1">
                          <Icon icon="mdi:fire" width="14" /> ลด {discount}%
                        </div>
                      )}
                      {svc.branch && (
                        <span className="absolute top-3 left-3 bg-white/90 dark:bg-darklight/90 backdrop-blur-sm text-xs px-2.5 py-1 rounded-full text-midnight_text dark:text-white">{svc.branch}</span>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-midnight_text dark:text-white mb-1 line-clamp-1">{svc.name}</h3>
                      <p className="text-sm text-grey dark:text-gray-400 mb-4 line-clamp-2">{svc.description}</p>
                      <div className="flex items-end justify-between">
                        <div>
                          {svc.is_promotion && svc.original_price > 0 && (
                            <span className="text-sm text-grey line-through block">฿{Number(svc.original_price).toLocaleString()}</span>
                          )}
                          <span className="text-xl font-bold text-primary">฿{Number(svc.price).toLocaleString()}</span>
                        </div>
                        <button
                          onClick={() => navigate(`/services/${svc.id}`)}
                          className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-colors"
                        >
                          ดูรายละเอียด
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && services.length === 0 && (
            <div className="text-center py-16">
              <Icon icon="mdi:tag-off" width="64" className="mx-auto text-grey/30 mb-4" />
              <p className="text-grey dark:text-gray-400">ยังไม่มีแพ็กเกจหรือโปรโมชั่นในขณะนี้</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PackagesPage;
