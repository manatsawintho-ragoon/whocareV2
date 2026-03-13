import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { apiGetFeaturedNews } from '../services/api';

const FeaturedArticles = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeatured();
  }, []);

  const loadFeatured = async () => {
    try {
      const res = await apiGetFeaturedNews('article');
      if (res.success && res.data.length > 0) {
        setArticles(res.data.slice(0, 6));
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading || articles.length === 0) return null;

  return (
    <section className="py-16 bg-section dark:bg-darkmode">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8" data-aos="fade-up">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-midnight_text dark:text-white">
              บทความสุขภาพ
            </h2>
            <div className="w-12 h-1 bg-primary rounded-full mt-2" />
          </div>
          <Link
            to="/articles"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border dark:border-dark_border text-midnight_text dark:text-white hover:border-primary hover:text-primary transition-colors font-semibold text-sm"
          >
            ดูทั้งหมด
            <Icon icon="mdi:arrow-right" width="18" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-aos="fade-up" data-aos-delay="100">
          {articles.map((a) => (
            <Link
              key={a.id}
              to={`/articles/${a.category_slug || 'all'}/${a.slug}`}
              className="group bg-white dark:bg-darklight rounded-2xl shadow-service hover:shadow-deatail_shadow border border-border dark:border-dark_border overflow-hidden transition-all duration-300 hover:-translate-y-1"
            >
              {/* Image */}
              <div className="relative overflow-hidden h-48">
                {a.cover_image ? (
                  <img src={a.cover_image} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <Icon icon="mdi:notebook-outline" width="48" className="text-primary/20" />
                  </div>
                )}
                {a.category_name && (
                  <span className="absolute top-3 left-3 bg-white/90 dark:bg-darkmode/90 backdrop-blur-sm text-xs font-semibold px-2.5 py-1 rounded-lg text-primary">
                    {a.category_name}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-bold text-midnight_text dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
                  {a.title}
                </h3>
                {a.excerpt && (
                  <p className="text-sm text-grey dark:text-white/50 line-clamp-2">{a.excerpt}</p>
                )}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border dark:border-dark_border">
                  <span className="text-xs text-grey dark:text-white/40">{formatDate(a.published_at)}</span>
                  <span className="text-xs text-primary font-semibold flex items-center gap-1">
                    อ่านต่อ
                    <Icon icon="mdi:arrow-right" width="14" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedArticles;
