import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { apiGetPublicNews, apiGetNewsCategories, apiGetNewsTags, apiGetFeaturedNews } from '../services/api';
import Footer from '../components/Footer';

const CONTENT_CONFIG = {
  article: {
    title: 'บทความสุขภาพ',
    subtitle: 'ความรู้ด้านสุขภาพ บทวิเคราะห์ และเทคนิคการดูแลตัวเอง',
    searchPlaceholder: 'ค้นหาบทความ...',
    emptyText: 'ไม่พบบทความ',
    icon: 'mdi:notebook-outline',
    basePath: '/articles',
  },
  news: {
    title: 'ข่าวสาร',
    subtitle: 'ข่าวสาร กิจกรรม และรายงานเหตุการณ์จาก Whocare Hospital',
    searchPlaceholder: 'ค้นหาข่าวสาร...',
    emptyText: 'ไม่พบข่าวสาร',
    icon: 'mdi:bullhorn-outline',
    basePath: '/news',
  },
};

const NewsListPage = ({ contentType = 'article' }) => {
  const config = CONTENT_CONFIG[contentType];
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tagParam = searchParams.get('tag') || '';
  const searchQuery = searchParams.get('q') || '';

  const [articles, setArticles] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState(searchQuery);

  useEffect(() => {
    loadCategories();
    loadTags();
    loadFeatured();
  }, [contentType]);

  useEffect(() => {
    loadArticles(1);
  }, [category, tagParam, searchQuery, contentType]);

  const loadCategories = async () => {
    try {
      const res = await apiGetNewsCategories();
      if (res.success) setCategories(res.data);
    } catch { /* ignore */ }
  };

  const loadTags = async () => {
    try {
      const res = await apiGetNewsTags();
      if (res.success) setTags(res.data.filter(t => parseInt(t.article_count) > 0));
    } catch { /* ignore */ }
  };

  const loadFeatured = async () => {
    try {
      const res = await apiGetFeaturedNews(contentType);
      if (res.success) setFeatured(res.data);
    } catch { /* ignore */ }
  };

  const loadArticles = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 12, sort: 'latest', content_type: contentType };
      if (category) params.category = category;
      if (tagParam) params.tag = tagParam;
      if (searchQuery) params.search = searchQuery;
      const res = await apiGetPublicNews(params);
      if (res.success) {
        setArticles(res.data.articles);
        setPagination(res.data.pagination);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    setSearchParams(params);
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const currentCategory = categories.find(c => c.slug === category);

  return (
    <>
      <div className="min-h-screen bg-section dark:bg-darkmode pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-midnight_text dark:text-white">
              {currentCategory ? currentCategory.name_th : config.title}
            </h1>
            <div className="w-12 h-1 bg-primary rounded-full mt-3 mx-auto" />
            <p className="text-grey dark:text-white/50 mt-3">
              {currentCategory ? (currentCategory.name_en || '') : config.subtitle}
            </p>
          </div>

          {/* Featured (top banner) */}
          {!category && !tagParam && !searchQuery && featured.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-primary font-bold text-sm">★</span>
                <h2 className="font-bold text-midnight_text dark:text-white">
                  {contentType === 'article' ? 'บทความแนะนำ' : 'ข่าวสารแนะนำ'}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {featured.slice(0, 3).map(f => (
                  <Link key={f.id} to={`${config.basePath}/${f.category_slug || 'all'}/${f.slug}`}
                    className="group relative rounded-2xl overflow-hidden h-52 border border-border dark:border-dark_border">
                    {f.cover_image ? (
                      <img src={f.cover_image} alt={f.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        <Icon icon={config.icon} width="48" className="text-primary/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-white font-bold leading-snug line-clamp-2 text-sm group-hover:text-primary transition-colors">{f.title}</h3>
                      {f.category_name && (
                        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white/90">
                          {f.category_name}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Search + Category Tabs */}
          <div className="flex flex-col gap-4 mb-8">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto w-full">
              <div className="relative flex-1">
                <Icon icon="mdi:magnify" width="20" className="absolute left-3 top-1/2 -translate-y-1/2 text-grey" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={config.searchPlaceholder}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border dark:border-dark_border bg-white dark:bg-darklight text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button type="submit" className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-blue-700 cursor-pointer font-semibold text-sm">
                ค้นหา
              </button>
            </form>

            {/* Category Tabs */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Link to={config.basePath}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${!category ? 'bg-primary text-white' : 'bg-white dark:bg-darklight text-grey dark:text-white/60 border border-border dark:border-dark_border hover:border-primary hover:text-primary'}`}
              >
                ทั้งหมด
              </Link>
              {categories.map(c => (
                <Link key={c.id} to={`${config.basePath}/${c.slug}`}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${category === c.slug ? 'bg-primary text-white' : 'bg-white dark:bg-darklight text-grey dark:text-white/60 border border-border dark:border-dark_border hover:border-primary hover:text-primary'}`}
                >
                  <Icon icon={c.icon} width="16" />
                  {c.name_th}
                </Link>
              ))}
            </div>

            {/* Tag Filter */}
            {tags.length > 0 && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {tags.slice(0, 10).map(t => (
                  <button key={t.id}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      if (tagParam === t.slug) { params.delete('tag'); } else { params.set('tag', t.slug); }
                      setSearchParams(params);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${tagParam === t.slug ? 'bg-primary text-white' : 'bg-white dark:bg-darklight text-grey dark:text-white/50 border border-border dark:border-dark_border hover:border-primary hover:text-primary'}`}
                  >
                    #{t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Icon icon="mdi:loading" width="36" className="text-primary animate-spin" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20">
              <Icon icon="mdi:newspaper-variant-outline" width="64" className="mx-auto mb-3 text-grey/30" />
              <p className="text-grey dark:text-white/40 text-lg">{config.emptyText}</p>
            </div>
          ) : (
            <>
              {/* Article Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((a, i) => (
                  <Link
                    key={a.id}
                    to={`${config.basePath}/${a.category_slug || 'all'}/${a.slug}`}
                    className={`group bg-white dark:bg-darklight rounded-2xl shadow-service hover:shadow-deatail_shadow border border-border dark:border-dark_border overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                      i === 0 && !category && !tagParam && !searchQuery ? 'sm:col-span-2 lg:col-span-2' : ''
                    }`}
                  >
                    {/* Image */}
                    <div className={`relative overflow-hidden ${i === 0 && !category && !tagParam && !searchQuery ? 'h-64' : 'h-48'}`}>
                      {a.cover_image ? (
                        <img src={a.cover_image} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <Icon icon="mdi:newspaper-variant" width="48" className="text-primary/20" />
                        </div>
                      )}
                      {a.is_featured && (
                        <span className="absolute top-3 left-3 bg-amber-500 text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold">⭐ แนะนำ</span>
                      )}
                      {a.is_pinned && (
                        <span className="absolute top-3 right-3 bg-red-500 text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold">📌 ปักหมุด</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        {a.category_name && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                            <Icon icon={a.category_icon || 'mdi:folder'} width="12" />
                            {a.category_name}
                          </span>
                        )}
                        <span className="text-xs text-grey dark:text-white/40">{formatDate(a.published_at)}</span>
                      </div>
                      <h3 className="font-bold text-midnight_text dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
                        {a.title}
                      </h3>
                      {a.excerpt && (
                        <p className="text-sm text-grey dark:text-white/50 line-clamp-2">{a.excerpt}</p>
                      )}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border dark:border-dark_border">
                        <span className="text-xs text-grey dark:text-white/40">{a.author_name || '-'}</span>
                        <span className="text-xs text-grey dark:text-white/40 flex items-center gap-1">
                          <Icon icon="mdi:eye" width="14" />
                          {(a.view_count || 0).toLocaleString()}
                        </span>
                      </div>
                      {a.tags && a.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {a.tags.slice(0, 3).map((t, j) => (
                            <span key={j} className="px-2 py-0.5 rounded-full text-[10px] bg-section dark:bg-darkmode text-grey dark:text-white/50">
                              #{t.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button onClick={() => loadArticles(pagination.page - 1)} disabled={pagination.page <= 1}
                    className="px-4 py-2. rounded-xl border border-border dark:border-dark_border text-sm disabled:opacity-30 hover:bg-white dark:hover:bg-darklight cursor-pointer text-midnight_text dark:text-white">
                    <Icon icon="mdi:chevron-left" width="20" />
                  </button>
                  <span className="text-sm text-grey dark:text-white/50 px-3">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button onClick={() => loadArticles(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                    className="px-4 py-2 rounded-xl border border-border dark:border-dark_border text-sm disabled:opacity-30 hover:bg-white dark:hover:bg-darklight cursor-pointer text-midnight_text dark:text-white">
                    <Icon icon="mdi:chevron-right" width="20" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default NewsListPage;
