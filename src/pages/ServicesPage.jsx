import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { apiGetPublicServices } from '../services/api';
import Footer from '../components/Footer';

const CATEGORIES = [
  { key: 'all', label: 'ทั้งหมด', icon: 'mdi:view-grid' },
  { key: 'recommended', label: 'แนะนำ', icon: 'mdi:star' },
  { key: 'surgery', label: 'ศัลยกรรม', icon: 'mdi:medical-bag' },
  { key: 'skin', label: 'ผิวหนัง & เลเซอร์', icon: 'mdi:face-woman-shimmer' },
  { key: 'wellness', label: 'สุขภาพ', icon: 'mdi:heart-pulse' },
];

const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {};
        if (category === 'recommended') params.recommended = 'true';
        const res = await apiGetPublicServices(params);
        if (res.success) setServices(res.data || []);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, [category]);

  const filtered = services.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <main className="min-h-screen bg-section dark:bg-darkmode pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-10" data-aos="fade-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 dark:bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Icon icon="mdi:hand-heart" width="20" />
              บริการทั้งหมดของเรา
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-midnight_text dark:text-white mb-3">แนะนำบริการ</h1>
            <p className="text-grey dark:text-gray-400 max-w-2xl mx-auto">เลือกบริการด้านความงามและสุขภาพที่ครบครัน ดูแลโดยทีมแพทย์ผู้เชี่ยวชาญ</p>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto mb-8" data-aos="fade-up" data-aos-delay="100">
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

          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-10" data-aos="fade-up" data-aos-delay="150">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  category === c.key
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white dark:bg-darklight text-midnight_text dark:text-gray-300 hover:bg-primary/10 border border-border dark:border-gray-700'
                }`}
              >
                <Icon icon={c.icon} width="18" />
                {c.label}
              </button>
            ))}
          </div>

          {/* Cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="bg-white dark:bg-darklight rounded-2xl h-72 animate-pulse border border-border/50 dark:border-gray-700/50" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((svc, i) => (
                <div
                  key={svc.id}
                  onClick={() => navigate(`/services/${svc.id}`)}
                  className="bg-white dark:bg-darklight rounded-2xl overflow-hidden shadow-service dark:shadow-dark-md border border-border/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  data-aos="fade-up"
                  data-aos-delay={i * 50}
                >
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={svc.image_url || 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400&q=80'}
                      alt={svc.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      {svc.branch && (
                        <span className="bg-white/90 dark:bg-darklight/90 backdrop-blur-sm text-xs px-2.5 py-1 rounded-full text-midnight_text dark:text-white">{svc.branch}</span>
                      )}
                      {svc.is_recommended && (
                        <span className="bg-yellow-400/90 text-xs px-2.5 py-1 rounded-full text-midnight_text font-medium flex items-center gap-1">
                          <Icon icon="mdi:star" width="12" /> แนะนำ
                        </span>
                      )}
                    </div>
                    {svc.is_promotion && svc.original_price > 0 && (
                      <span className="absolute top-3 right-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        -{Math.round(((svc.original_price - svc.price) / svc.original_price) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-midnight_text dark:text-white mb-1 line-clamp-1">{svc.name}</h3>
                    <p className="text-xs text-grey dark:text-gray-400 mb-3 line-clamp-2">{svc.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        {svc.is_promotion && svc.original_price > 0 && (
                          <span className="text-xs text-grey line-through mr-2">฿{Number(svc.original_price).toLocaleString()}</span>
                        )}
                        <span className="text-lg font-bold text-primary">฿{Number(svc.price).toLocaleString()}</span>
                      </div>
                      <span className="text-primary text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        ดูเพิ่มเติม <Icon icon="mdi:arrow-right" width="16" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16">
              <Icon icon="mdi:package-variant" width="64" className="mx-auto text-grey/30 mb-4" />
              <p className="text-grey dark:text-gray-400">ไม่พบบริการที่ตรงกับการค้นหา</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ServicesPage;
