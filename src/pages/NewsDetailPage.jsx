import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { apiGetNewsDetail } from '../services/api';
import Footer from '../components/Footer';

const NewsDetailPage = ({ contentType = 'article' }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  const basePath = contentType === 'news' ? '/news' : '/articles';
  const typeLabel = contentType === 'news' ? 'ข่าวสาร' : 'บทความ';

  useEffect(() => {
    if (slug) loadArticle();
  }, [slug]);

  const loadArticle = async () => {
    setLoading(true);
    try {
      const res = await apiGetNewsDetail(slug);
      if (res.success) {
        setArticle(res.data);
      } else {
        setArticle(null);
      }
    } catch {
      setArticle(null);
    }
    setLoading(false);
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: article.title, url: window.location.href });
      } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-section dark:bg-darkmode flex items-center justify-center pt-32">
        <Icon icon="mdi:loading" width="48" className="text-primary animate-spin" />
      </div>
    );
  }

  if (!article) {
    return (
      <>
        <div className="min-h-screen bg-section dark:bg-darkmode flex flex-col items-center justify-center pt-32 pb-16 px-4">
          <Icon icon="mdi:file-document-alert" width="80" className="text-grey/30 mb-4" />
          <h2 className="text-2xl font-bold text-midnight_text dark:text-white mb-2">ไม่พบบทความ</h2>
          <p className="text-grey dark:text-white/40 mb-6">บทความนี้อาจถูกลบหรือยังไม่ถูกเผยแพร่</p>
          <Link to={basePath} className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-blue-700 font-semibold">
            <Icon icon="mdi:arrow-left" width="18" />
            กลับหน้า{typeLabel}
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-section dark:bg-darkmode pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-6 text-grey dark:text-white/50 flex-wrap">
            <Link to="/" className="hover:text-primary transition-colors">หน้าหลัก</Link>
            <Icon icon="mdi:chevron-right" width="16" />
            <Link to={basePath} className="hover:text-primary transition-colors">{typeLabel}</Link>
            {article.category_name && (
              <>
                <Icon icon="mdi:chevron-right" width="16" />
                <Link to={`${basePath}/${article.category_slug}`} className="hover:text-primary transition-colors">{article.category_name}</Link>
              </>
            )}
            <Icon icon="mdi:chevron-right" width="16" />
            <span className="text-midnight_text dark:text-white truncate max-w-[200px]">{article.title}</span>
          </nav>

          {/* Article Card */}
          <article className="bg-white dark:bg-darklight rounded-2xl shadow-deatail_shadow border border-border dark:border-dark_border overflow-hidden">

            {/* Cover Image */}
            {article.cover_image && (
              <div className="relative h-72 sm:h-96 overflow-hidden">
                <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
              </div>
            )}

            {/* Content */}
            <div className="p-6 sm:p-10">
              {/* Meta */}
              <div className="flex items-center gap-3 flex-wrap mb-4">
                {article.category_name && (
                  <Link to={`/articles/${article.category_slug}`}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <Icon icon={article.category_icon || 'mdi:folder'} width="14" />
                    {article.category_name}
                  </Link>
                )}
                {article.is_featured && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-600 dark:bg-amber-500/20">⭐ แนะนำ</span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-bold text-midnight_text dark:text-white leading-snug mb-4">
                {article.title}
              </h1>

              {/* Author + Date + Views */}
              <div className="flex items-center gap-4 flex-wrap text-sm text-grey dark:text-white/50 mb-6 pb-6 border-b border-border dark:border-dark_border">
                {article.author_name && (
                  <span className="flex items-center gap-1.5">
                    <Icon icon="mdi:account" width="18" />
                    {article.author_name}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Icon icon="mdi:calendar" width="18" />
                  {formatDate(article.published_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon icon="mdi:eye" width="18" />
                  {(article.view_count || 0).toLocaleString()} อ่าน
                </span>
                <button onClick={handleShare} className="ml-auto flex items-center gap-1.5 text-primary hover:text-blue-700 cursor-pointer font-medium transition-colors">
                  <Icon icon="mdi:share-variant" width="18" />
                  แชร์
                </button>
              </div>

              {/* Excerpt */}
              {article.excerpt && (
                <p className="text-lg text-grey dark:text-white/60 leading-relaxed mb-6 italic border-l-4 border-primary pl-4">
                  {article.excerpt}
                </p>
              )}

              {/* Article Body */}
              <div className="prose prose-sm sm:prose-base max-w-none text-midnight_text dark:text-white/80 dark:prose-invert
                prose-headings:text-midnight_text dark:prose-headings:text-white
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-img:rounded-xl prose-img:shadow-md" dangerouslySetInnerHTML={{ __html: article.content }} />

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border dark:border-dark_border">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Icon icon="mdi:tag-multiple" width="18" className="text-grey" />
                    {article.tags.map((t, i) => (
                      <Link key={i} to={`${basePath}?tag=${t.slug}`}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-section dark:bg-darkmode text-grey dark:text-white/50 border border-border dark:border-dark_border hover:border-primary hover:text-primary transition-colors">
                        #{t.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>

          {/* Related Articles */}
          {article.related_articles && article.related_articles.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-bold text-midnight_text dark:text-white mb-6">{contentType === 'news' ? 'ข่าวที่เกี่ยวข้อง' : 'บทความที่เกี่ยวข้อง'}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {article.related_articles.map(r => (
                  <Link key={r.id} to={`${basePath}/${r.category_slug || 'all'}/${r.slug}`}
                    className="group bg-white dark:bg-darklight rounded-2xl shadow-service hover:shadow-deatail_shadow border border-border dark:border-dark_border overflow-hidden transition-all duration-300 hover:-translate-y-1">
                    <div className="h-40 overflow-hidden">
                      {r.cover_image ? (
                        <img src={r.cover_image} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <Icon icon="mdi:newspaper-variant" width="36" className="text-primary/20" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <span className="text-[11px] text-grey dark:text-white/40 mb-1 block">{formatDate(r.published_at)}</span>
                      <h3 className="font-bold text-midnight_text dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2 text-sm">
                        {r.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back Button */}
          <div className="mt-10 text-center">
            <button onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-darklight text-midnight_text dark:text-white rounded-xl border border-border dark:border-dark_border hover:border-primary hover:text-primary transition-colors cursor-pointer font-semibold">
              <Icon icon="mdi:arrow-left" width="18" />
              ย้อนกลับ
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default NewsDetailPage;
