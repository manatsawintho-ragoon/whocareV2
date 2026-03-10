import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { apiGetPublicServices } from '../services/api';

const TABS = [
  { key: 'all',       label: 'ดูทั้งหมด',      icon: 'mdi:view-grid' },
  { key: 'checkup',   label: 'ตรวจสุขภาพ',    icon: 'mdi:stethoscope' },
  { key: 'vaccine',   label: 'วัคซีน',         icon: 'mdi:needle' },
  { key: 'screening', label: 'คัดกรองมะเร็ง',  icon: 'mdi:radiology-box' },
  { key: 'beauty',    label: 'ความงาม',        icon: 'mdi:face-woman-shimmer' },
  { key: 'dental',    label: 'ทันตกรรม',       icon: 'mdi:tooth' },
  { key: 'general',   label: 'ทั่วไป',          icon: 'mdi:hospital-box' },
];

const ServicesSection = () => {
  const [services, setServices] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState({});
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    fetchServices();
  }, [activeTab]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab !== 'all') params.category = activeTab;
      const result = await apiGetPublicServices(params);
      if (result.success) setServices(result.data || []);
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
    const cardWidth = 280;
    setActiveDot(Math.round(el.scrollLeft / cardWidth));
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
    el.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatPrice = (val) => {
    const num = parseFloat(val);
    if (!num && num !== 0) return null;
    return num.toLocaleString('th-TH');
  };

  const formatPriceRange = (min, max) => {
    const a = formatPrice(min);
    const b = formatPrice(max);
    if (!a) return null;
    if (!b) return `${a} THB`;
    return `${a} - ${b} THB`;
  };

  const totalDots = Math.max(0, services.length - 3);

  return (
    <section className="py-16 bg-white dark:bg-darklight">
      <div className="container mx-auto max-w-6xl px-4">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8" data-aos="fade-up">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-midnight_text dark:text-white">
              แพ็กเกจและโปรโมชั่น
            </h2>
            <div className="w-12 h-1 bg-primary rounded-full mt-2" />
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white dark:bg-darkmode text-midnight_text dark:text-white border-border dark:border-dark_border hover:border-primary hover:text-primary'
                }`}
              >
                <Icon icon={tab.icon} width="15" />
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
              className="absolute -left-4 top-[40%] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white dark:bg-darkmode shadow-lg border border-border dark:border-dark_border flex items-center justify-center text-midnight_text hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer"
            >
              <Icon icon="mdi:chevron-left" width="24" />
            </button>
          )}

          {/* Right arrow */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute -right-4 top-[40%] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white dark:bg-darkmode shadow-lg border border-border dark:border-dark_border flex items-center justify-center text-midnight_text hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer"
            >
              <Icon icon="mdi:chevron-right" width="24" />
            </button>
          )}

          {/* Scrollable row */}
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="shrink-0 w-[260px] animate-pulse">
                  <div className="bg-section dark:bg-darkmode rounded-2xl h-[220px]" />
                  <div className="mt-3 h-4 bg-section dark:bg-darkmode rounded w-3/4" />
                  <div className="mt-2 h-3 bg-section dark:bg-darkmode rounded w-1/3" />
                </div>
              ))
            ) : services.length === 0 ? (
              <div className="w-full text-center py-16 text-grey dark:text-white/40">
                <Icon icon="mdi:package-variant" width="48" className="mx-auto mb-2 opacity-30" />
                <p>ยังไม่มีบริการในหมวดนี้</p>
              </div>
            ) : (
              services.map((s) => (
                <div key={s.id} className="shrink-0 w-[260px] snap-start group/card">
                  <div className="bg-white dark:bg-darkmode rounded-2xl border border-border dark:border-dark_border overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col h-full">

                    {/* Image */}
                    <div className="relative h-[210px] overflow-hidden">
                      {s.image_url ? (
                        <img
                          src={s.image_url}
                          alt={s.name}
                          className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-section to-blue-50 dark:from-darklight dark:to-darkmode flex items-center justify-center">
                          <Icon icon="mdi:medical-bag" width="52" className="text-primary/20" />
                        </div>
                      )}

                      {/* Branch watermark — top left */}
                      {s.branch && (
                        <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-white dark:bg-darkmode/90 backdrop-blur-md text-midnight_text dark:text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-xl shadow-md">
                          <Icon icon="mdi:hospital-building" width="13" className="text-primary shrink-0" />
                          {s.branch}
                        </span>
                      )}

                      {/* Heart / Favorite button */}
                      <button
                        onClick={() => toggleFavorite(s.id)}
                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white dark:bg-darkmode/90 backdrop-blur-md flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform duration-200 cursor-pointer"
                      >
                        <Icon
                          icon={favorites[s.id] ? 'mdi:heart' : 'mdi:heart-outline'}
                          width="19"
                          className={favorites[s.id] ? 'text-red-500' : 'text-primary'}
                        />
                      </button>

                      {/* Price overlay at bottom of image */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pt-10 pb-3">
                        {(() => {
                          const origRange = formatPriceRange(s.original_price, s.original_price_max);
                          const origMin = formatPrice(s.original_price);
                          const priceMin = formatPrice(s.price);
                          const showOrig = origMin && parseFloat(s.original_price) > parseFloat(s.price);
                          return (
                            <>
                              {showOrig && origRange && (
                                <p className="text-white/60 text-xs line-through leading-tight tracking-wide">
                                  {origRange}
                                </p>
                              )}
                              {priceMin && (
                                <p className="text-white font-extrabold text-base leading-tight drop-shadow">
                                  {formatPriceRange(s.price, s.price_max)}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col gap-3 flex-1">
                      <h3 className="font-bold text-midnight_text dark:text-white text-sm leading-snug line-clamp-2 min-h-[40px]">
                        {s.name}
                      </h3>

                      {/* Branch badge */}
                      {s.branch && (
                        <span className="inline-flex items-center self-start gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full border border-primary/20">
                          <Icon icon="mdi:hospital-building" width="12" />
                          {s.branch}
                        </span>
                      )}

                      {/* Detail button */}
                      <button className="mt-auto w-full border-2 border-border dark:border-dark_border text-midnight_text dark:text-white text-sm font-semibold py-2.5 rounded-xl hover:border-primary hover:text-primary hover:bg-primary/5 dark:hover:text-primary dark:hover:bg-primary/10 transition-all duration-200 cursor-pointer">
                        รายละเอียด
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination dots */}
          {!loading && totalDots > 0 && (
            <div className="flex justify-start gap-1.5 mt-4 pl-1">
              {[...Array(totalDots + 1)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const el = scrollRef.current;
                    if (el) el.scrollTo({ left: i * 280, behavior: 'smooth' });
                  }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === activeDot ? 'w-6 bg-primary' : 'w-1.5 bg-border dark:bg-dark_border'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;

