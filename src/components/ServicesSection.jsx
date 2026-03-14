import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Drag-to-scroll state
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const hasDragged = useRef(false);
  const dragVelocity = useRef(0);
  const dragLastX = useRef(0);
  const dragLastTime = useRef(0);
  const momentumRaf = useRef(null);

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

  // Dark grab cursor data URI
  const CURSOR_GRAB = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24'%3E%3Cpath fill='%231e293b' d='M9 5.5a1.5 1.5 0 0 0-3 0V13l-1-1a1.73 1.73 0 0 0-2.45 2.45l4.45 4.46A3.5 3.5 0 0 0 9.5 20H13a4 4 0 0 0 4-4v-5a1.5 1.5 0 0 0-3 0v-1a1.5 1.5 0 0 0-3 0V5.5z'/%3E%3C/svg%3E\") 11 4, grab";
  const CURSOR_GRABBING = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24'%3E%3Cpath fill='%231e293b' d='M8 9a1 1 0 0 0-2 0v3l-1-1a1.5 1.5 0 0 0-2.12 2.12l4 4A4 4 0 0 0 9.7 18H13a4 4 0 0 0 4-4v-3a1 1 0 0 0-2 0v-.5a1 1 0 0 0-2 0V9a1 1 0 0 0-2 0V9z'/%3E%3C/svg%3E\") 11 4, grabbing";

  // Drag-to-scroll handlers with momentum — use clientX to avoid position jump
  const handleMouseDown = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    if (momentumRaf.current) cancelAnimationFrame(momentumRaf.current);
    isDragging.current = true;
    hasDragged.current = false;
    dragStartX.current = e.clientX;       // use clientX — no offset math
    dragScrollLeft.current = el.scrollLeft;
    dragLastX.current = e.clientX;
    dragLastTime.current = Date.now();
    dragVelocity.current = 0;
    el.style.cursor = CURSOR_GRABBING;
    el.style.userSelect = 'none';
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    const delta = e.clientX - dragStartX.current;  // pure delta, no offset
    if (Math.abs(delta) > 4) hasDragged.current = true;
    // Track velocity for momentum
    const now = Date.now();
    const dt = now - dragLastTime.current;
    if (dt > 0) dragVelocity.current = (e.clientX - dragLastX.current) / dt;
    dragLastX.current = e.clientX;
    dragLastTime.current = now;
    el.scrollLeft = dragScrollLeft.current - delta;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    const el = scrollRef.current;
    if (el) {
      el.style.cursor = CURSOR_GRAB;
      el.style.userSelect = '';
      // Apply momentum
      let velocity = dragVelocity.current * 15;
      const decelerate = () => {
        if (Math.abs(velocity) < 0.3) return;
        el.scrollLeft -= velocity;
        velocity *= 0.92;
        momentumRaf.current = requestAnimationFrame(decelerate);
      };
      if (Math.abs(velocity) > 0.5) momentumRaf.current = requestAnimationFrame(decelerate);
    }
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const formatPrice = (val) => {
    const num = parseFloat(val);
    if (!num && num !== 0) return '-';
    return num.toLocaleString('th-TH');
  };

  const hasDiscount = (s) => {
    const orig = parseFloat(s.original_price);
    const curr = parseFloat(s.price);
    return s.is_promotion && orig > 0 && orig > curr;
  };

  const discountPct = (s) => {
    const orig = parseFloat(s.original_price);
    const curr = parseFloat(s.price);
    return Math.round((1 - curr / orig) * 100);
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
            onMouseDown={handleMouseDown}
            onTouchStart={(e) => {
              if (momentumRaf.current) cancelAnimationFrame(momentumRaf.current);
              const touch = e.touches[0];
              isDragging.current = true;
              hasDragged.current = false;
              dragStartX.current = touch.clientX;   // use clientX
              dragScrollLeft.current = scrollRef.current.scrollLeft;
              dragLastX.current = touch.clientX;
              dragLastTime.current = Date.now();
              dragVelocity.current = 0;
            }}
            onTouchMove={(e) => {
              if (!isDragging.current) return;
              const touch = e.touches[0];
              const delta = touch.clientX - dragStartX.current;
              if (Math.abs(delta) > 4) hasDragged.current = true;
              const now = Date.now();
              const dt = now - dragLastTime.current;
              if (dt > 0) dragVelocity.current = (touch.clientX - dragLastX.current) / dt;
              dragLastX.current = touch.clientX;
              dragLastTime.current = now;
              scrollRef.current.scrollLeft = dragScrollLeft.current - delta;
            }}
            onTouchEnd={() => { handleMouseUp(); }}
            className="flex gap-5 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory select-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', cursor: CURSOR_GRAB }}
          >
            {loading ? (
              // Skeleton
              [...Array(4)].map((_, i) => (
                <div key={i} className="shrink-0 w-[260px] animate-pulse">
                  <div className="bg-section dark:bg-darkmode rounded-lg h-[200px]" />
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
                  <div className="bg-white dark:bg-darkmode rounded-lg border border-border dark:border-dark_border overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300">
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
                        {hasDiscount(s) && (
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

                      {/* Price display */}
                      <div className="flex items-center gap-2 mt-2">
                        {hasDiscount(s) && (
                          <span className="text-xs text-grey dark:text-white/40 line-through">
                            ฿{formatPrice(s.original_price)}
                          </span>
                        )}
                        <span className={`text-sm font-bold ${
                          hasDiscount(s)
                            ? 'text-primary'
                            : 'text-midnight_text dark:text-white'
                        }`}>
                          ฿{formatPrice(s.price)}
                        </span>
                        {hasDiscount(s) && (
                          <span className="text-[10px] font-semibold bg-red-100 dark:bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-full">
                            -{discountPct(s)}%
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => { if (!hasDragged.current) navigate(`/services/${s.id}`); }}
                          className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer"
                        >
                          <Icon icon="mdi:information-outline" width="15" />
                          ดูรายละเอียด
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
