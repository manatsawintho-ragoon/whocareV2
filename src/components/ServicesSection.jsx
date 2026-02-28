import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { apiGetPublicServices } from '../services/api';

const TABS = [
  { key: 'all', label: 'ดูทั้งหมด' },
  { key: 'recommended', label: 'แนะนำบริการ' },
  { key: 'promotion', label: 'โปรโมชั่น' },
];

const ServicesSection = () => {
  const [services, setServices] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    fetchServices();
  }, [activeTab]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab === 'recommended') params.recommended = 'true';
      if (activeTab === 'promotion') params.promotion = 'true';
      const result = await apiGetPublicServices(params);
      if (result.success) {
        setServices(result.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      if (el) el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [services]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = 300;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const formatPrice = (val) => {
    const num = parseFloat(val);
    if (!num && num !== 0) return '-';
    return num.toLocaleString('th-TH');
  };

  return (
    <section className="py-16 bg-white dark:bg-darklight">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8" data-aos="fade-up">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-midnight_text dark:text-white">
              แพ็กเกจและโปรโมชั่น
            </h2>
            <div className="w-12 h-1 bg-primary rounded-full mt-2" />
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-darkmode text-midnight_text dark:text-white border-border dark:border-dark_border hover:border-primary hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Carousel */}
        <div className="relative group" data-aos="fade-up" data-aos-delay="100">
          {/* Left arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white dark:bg-darkmode shadow-lg border border-border dark:border-dark_border flex items-center justify-center text-midnight_text hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer"
            >
              <Icon icon="mdi:chevron-left" width="24" />
            </button>
          )}

          {/* Right arrow */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white dark:bg-darkmode shadow-lg border border-border dark:border-dark_border flex items-center justify-center text-midnight_text hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer"
            >
              <Icon icon="mdi:chevron-right" width="24" />
            </button>
          )}

          {/* Scrollable container */}
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {loading ? (
              // Skeleton
              [...Array(4)].map((_, i) => (
                <div key={i} className="shrink-0 w-[260px] animate-pulse">
                  <div className="bg-section dark:bg-darkmode rounded-2xl h-[200px]" />
                  <div className="mt-3 h-4 bg-section dark:bg-darkmode rounded w-3/4" />
                  <div className="mt-2 h-3 bg-section dark:bg-darkmode rounded w-1/2" />
                </div>
              ))
            ) : services.length === 0 ? (
              <div className="w-full text-center py-16 text-grey dark:text-white/40">
                <Icon icon="mdi:package-variant" width="48" className="mx-auto mb-2 opacity-30" />
                <p>ยังไม่มีบริการในหมวดนี้</p>
              </div>
            ) : (
              services.map((s) => (
                <div
                  key={s.id}
                  className="shrink-0 w-[260px] snap-start group/card"
                >
                  {/* Card */}
                  <div className="bg-white dark:bg-darkmode rounded-2xl border border-border dark:border-dark_border overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300">
                    {/* Image */}
                    <div className="relative h-[200px] overflow-hidden">
                      {s.image_url ? (
                        <img
                          src={s.image_url}
                          alt={s.name}
                          className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-section dark:bg-darklight flex items-center justify-center">
                          <Icon icon="mdi:medical-bag" width="48" className="text-grey/20" />
                        </div>
                      )}

                      {/* Branch badge */}
                      {s.branch && (
                        <span className="absolute top-3 left-3 bg-white/90 dark:bg-darkmode/90 backdrop-blur-sm text-xs font-medium px-2.5 py-1 rounded-lg text-midnight_text dark:text-white flex items-center gap-1">
                          <Icon icon="mdi:map-marker" width="12" className="text-primary" />
                          {s.branch}
                        </span>
                      )}

                      {/* Favorite button */}
                      <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 dark:bg-darkmode/80 backdrop-blur-sm flex items-center justify-center text-grey hover:text-red-500 transition-colors cursor-pointer">
                        <Icon icon="mdi:heart-outline" width="18" />
                      </button>

                      {/* Price overlay */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                        {s.is_promotion && s.original_price > 0 && s.original_price > s.price && (
                          <span className="bg-black/50 backdrop-blur-sm text-white/70 text-xs px-2 py-0.5 rounded line-through">
                            {formatPrice(s.original_price)} THB
                          </span>
                        )}
                        <span className="bg-primary/90 backdrop-blur-sm text-white text-sm font-bold px-3 py-1 rounded-lg ml-auto">
                          {formatPrice(s.price)} THB
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-midnight_text dark:text-white text-sm leading-snug line-clamp-2 min-h-[40px]">
                        {s.name}
                      </h3>
                      {s.branch && (
                        <p className="text-xs text-grey dark:text-white/40 mt-1 flex items-center gap-1">
                          <Icon icon="mdi:hospital-building" width="12" />
                          {s.branch}
                        </p>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 mt-3">
                        <button className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                          <Icon icon="mdi:cart-plus" width="16" />
                          เพิ่ม
                        </button>
                        <button className="flex-1 inline-flex items-center justify-center gap-1.5 border border-border dark:border-dark_border text-midnight_text dark:text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-section dark:hover:bg-darklight transition-colors cursor-pointer">
                          รายละเอียด
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
