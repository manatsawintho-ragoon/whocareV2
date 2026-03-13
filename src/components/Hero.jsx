import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';

const slides = [
  "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&q=80",
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80",
  "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=1200&q=80",
  "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1200&q=80",
];

const Hero = () => {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next]);

  return (
    <section className="relative md:pt-32 pt-28 pb-0 bg-white dark:bg-darklight">
      <div className="container mx-auto max-w-6xl px-4">
          {/* Main hero banner with carousel */}
          <div
            className="group/carousel relative overflow-hidden rounded-2xl min-h-[400px] md:min-h-[480px]"
            data-aos="fade-up"
            data-aos-delay="200"
            data-aos-duration="1000"
          >
            {/* Carousel images */}
            {slides.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Slide ${i + 1}`}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                  i === current ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}

            {/* Overlay gradient - subtle dark for readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent dark:from-black/60 dark:via-black/30 dark:to-transparent" />

            {/* Content */}
            <div className="relative z-10 flex flex-col justify-center h-full p-8 md:p-12 lg:p-16 min-h-[400px] md:min-h-[480px]">
              <div className="max-w-xl">
                <h1 className="text-white font-bold text-3xl md:text-4xl lg:text-5xl leading-tight mb-4">
                  สวยครบจบในที่เดียว
                  <br />
                  <span className="text-white/90">คลินิกศัลยกรรมความงาม</span>
                </h1>
                <p className="text-white/80 text-lg md:text-xl leading-relaxed">
                  ด้วยทีมศัลยแพทย์ผู้เชี่ยวชาญ เทคโนโลยีระดับสากล
                  <br className="hidden md:block" />
                  ปลอดภัย มั่นใจ สวยธรรมชาติ
                </p>
              </div>

              {/* Arrow left */}
              <button
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 shadow-xl flex items-center justify-center text-midnight_text hover:bg-white transition-all cursor-pointer z-20 opacity-0 group-hover/carousel:opacity-100 duration-300 border border-gray-200"
                aria-label="Previous slide"
              >
                <Icon icon="mdi:chevron-left" width="28" />
              </button>

              {/* Arrow right */}
              <button
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 shadow-xl flex items-center justify-center text-midnight_text hover:bg-white transition-all cursor-pointer z-20 opacity-0 group-hover/carousel:opacity-100 duration-300 border border-gray-200"
                aria-label="Next slide"
              >
                <Icon icon="mdi:chevron-right" width="28" />
              </button>

              {/* Dots */}
              <div className="absolute bottom-6 right-8 flex items-center gap-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      className={`rounded-full transition-all duration-300 cursor-pointer ${
                        i === current
                          ? 'w-8 h-2.5 bg-white'
                          : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/70'
                      }`}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
              </div>
            </div>
          </div>
      </div>
    </section>
  );
};

export default Hero;
