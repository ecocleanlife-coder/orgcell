import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import {
  Sparkles,
  FolderSearch,
  Users,
  CheckCircle2,
  Zap,
  ScanSearch,
  ArrowRight,
  Star,
} from 'lucide-react';

const SmartSortPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Helper function to scroll to section smoothly
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Navigate to login and scroll
  const navigateToLogin = () => {
    navigate('/');
    setTimeout(() => {
      const loginSection = document.getElementById('login-section');
      if (loginSection) {
        loginSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF7]">
      <Helmet>
        <title>AI Smart Sort — Orgcell</title>
        <meta name="description" content="중복 사진을 자동으로 제거하고 날짜·인물별로 정리해주는 AI 사진 정리 도구. 브라우저에서 바로, 무료로 사용하세요." />
        <meta property="og:title" content="AI Smart Sort — Orgcell" />
        <meta property="og:description" content="AI가 중복 사진을 제거하고 자동으로 날짜·인물별 정리. 무료로 시작하세요." />
        <meta property="og:image" content="/pwa-512x512.png" />
      </Helmet>
      <Navbar />

      {/* Hero Section */}
      <section className="flex-grow bg-gradient-to-br from-[#F5F0FF] to-[#EDE7F8] py-16 px-4 sm:py-24">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="text-sm text-[#7A6E5E] mb-6 flex items-center gap-2">
            <button onClick={() => navigate('/')} className="hover:underline cursor-pointer font-semibold" style={{ color: '#5A9460' }}>← Orgcell.com</button>
            <span>›</span>
            <span>{t('smartSort.breadcrumb')}</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#2D1E0E] mb-4 leading-tight">
            {t('smartSort.headline')}
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-[#7A6E5E] mb-8 max-w-2xl leading-relaxed">
            {t('smartSort.subheadline')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <button
              onClick={() => scrollToSection('cta-section')}
              className="px-8 py-3 bg-[#5A9460] text-white rounded-lg font-semibold hover:bg-[#4d7a50] transition-colors flex items-center justify-center gap-2"
            >
              {t('smartSort.ctaStart')}
              <ArrowRight size={20} />
            </button>
            <button
              onClick={() => scrollToSection('features-section')}
              className="px-8 py-3 border-2 border-[#7B66B2] text-[#7B66B2] rounded-lg font-semibold hover:bg-[#7B66B2] hover:text-white transition-colors"
            >
              {t('smartSort.ctaFeatures')}
            </button>
          </div>

          {/* Hero Image */}
          <img
            src="/images/landing/card-ai-sort.png"
            alt="AI Smart Sort"
            style={{ maxWidth: '320px', width: '100%', margin: '0 auto 32px', display: 'block' }}
          />

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-white/50 backdrop-blur-sm rounded-lg p-6 border border-white/80">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-[#7B66B2]">37%</p>
              <p className="text-sm text-[#7A6E5E] mt-1">{t('smartSort.stat1label')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-[#5A9460]">1,000/min</p>
              <p className="text-sm text-[#7A6E5E] mt-1">{t('smartSort.stat2label')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-[#2D1E0E]">94%</p>
              <p className="text-sm text-[#7A6E5E] mt-1">{t('smartSort.stat3label')}</p>
            </div>
          </div>

          {/* Privacy Badge */}
          <div className="mt-6 flex justify-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-[#3a6e3a] bg-white/70 border border-[#b0d0b0]">
              🔒 No upload · Works in your browser
            </span>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 px-4 sm:py-24 bg-[#FAFAF7]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-serif text-[#2D1E0E] mb-12 text-center">
            {t('smartSort.problemTitle')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pain Point 1 */}
            <div className="bg-white border border-[#E5E1D6] rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📸</div>
              <h3 className="text-xl font-serif text-[#2D1E0E] mb-3">
                {t('smartSort.problem1Title')}
              </h3>
              <p className="text-[#7A6E5E] text-sm leading-relaxed">
                {t('smartSort.problem1Desc')}
              </p>
            </div>

            {/* Pain Point 2 */}
            <div className="bg-white border border-[#E5E1D6] rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-xl font-serif text-[#2D1E0E] mb-3">
                {t('smartSort.problem2Title')}
              </h3>
              <p className="text-[#7A6E5E] text-sm leading-relaxed">
                {t('smartSort.problem2Desc')}
              </p>
            </div>

            {/* Pain Point 3 */}
            <div className="bg-white border border-[#E5E1D6] rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👨‍👩‍👧</div>
              <h3 className="text-xl font-serif text-[#2D1E0E] mb-3">
                {t('smartSort.problem3Title')}
              </h3>
              <p className="text-[#7A6E5E] text-sm leading-relaxed">
                {t('smartSort.problem3Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features-section"
        className="py-16 px-4 sm:py-24 bg-[#F5F0FF]"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-serif text-[#2D1E0E] mb-12 text-center">
            {t('smartSort.featuresTitle')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature 1: AI Duplicate Detection */}
            <div className="bg-white rounded-lg p-6 border border-[#E5E1D6] hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#7B66B2]/10 rounded-lg flex-shrink-0">
                  <ScanSearch size={24} className="text-[#7B66B2]" />
                </div>
                <div>
                  <h3 className="text-lg font-serif text-[#2D1E0E] mb-2">{t('smartSort.feat1Title')}</h3>
                  <p className="text-[#7A6E5E] text-sm leading-relaxed">{t('smartSort.feat1Desc')}</p>
                </div>
              </div>
            </div>

            {/* Feature 2: Time Sort */}
            <div className="bg-white rounded-lg p-6 border border-[#E5E1D6] hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#3B82F6]/10 rounded-lg flex-shrink-0">
                  <Zap size={24} className="text-[#3B82F6]" />
                </div>
                <div>
                  <h3 className="text-lg font-serif text-[#2D1E0E] mb-2">{t('smartSort.feat2Title')}</h3>
                  <p className="text-[#7A6E5E] text-sm leading-relaxed">{t('smartSort.feat2Desc')}</p>
                </div>
              </div>
            </div>

            {/* Feature 3: People Classification */}
            <div className="bg-white rounded-lg p-6 border border-[#E5E1D6] hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#5A9460]/10 rounded-lg flex-shrink-0">
                  <Users size={24} className="text-[#5A9460]" />
                </div>
                <div>
                  <h3 className="text-lg font-serif text-[#2D1E0E] mb-2">{t('smartSort.feat3Title')}</h3>
                  <p className="text-[#7A6E5E] text-sm leading-relaxed">{t('smartSort.feat3Desc')}</p>
                </div>
              </div>
            </div>

            {/* Feature 4: Best Cut Selection */}
            <div className="bg-white rounded-lg p-6 border border-[#E5E1D6] hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#D97706]/10 rounded-lg flex-shrink-0">
                  <Star size={24} className="text-[#D97706]" />
                </div>
                <div>
                  <h3 className="text-lg font-serif text-[#2D1E0E] mb-2">{t('smartSort.feat4Title')}</h3>
                  <p className="text-[#7A6E5E] text-sm leading-relaxed">{t('smartSort.feat4Desc')}</p>
                </div>
              </div>
            </div>

            {/* Feature 5: Original Preservation */}
            <div className="bg-white rounded-lg p-6 border border-[#E5E1D6] hover:shadow-lg transition-shadow md:col-span-2">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#14B8A6]/10 rounded-lg flex-shrink-0">
                  <CheckCircle2 size={24} className="text-[#14B8A6]" />
                </div>
                <div>
                  <h3 className="text-lg font-serif text-[#2D1E0E] mb-2">{t('smartSort.feat5Title')}</h3>
                  <p className="text-[#7A6E5E] text-sm leading-relaxed">{t('smartSort.feat5Desc')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:py-24 bg-[#FAFAF7]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-serif text-[#2D1E0E] mb-12 text-center">
            {t('smartSort.howTitle')}
          </h2>

          {/* Steps Container */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-[#7B66B2] rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 flex-shrink-0">
                1
              </div>
              <div className="text-2xl mb-2 text-center">📁</div>
              <h3 className="text-lg font-serif text-[#2D1E0E] mb-2 text-center">{t('smartSort.step1Title')}</h3>
              <p className="text-[#7A6E5E] text-sm text-center leading-relaxed">{t('smartSort.step1Desc')}</p>
            </div>

            {/* Connecting Line (visible on desktop) */}
            <div className="hidden md:flex items-center justify-center -mx-4">
              <div className="h-1 w-full bg-gradient-to-r from-[#7B66B2]/20 to-[#7B66B2]/20"></div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-[#7B66B2] rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 flex-shrink-0">
                2
              </div>
              <div className="text-2xl mb-2 text-center">🤖</div>
              <h3 className="text-lg font-serif text-[#2D1E0E] mb-2 text-center">{t('smartSort.step2Title')}</h3>
              <p className="text-[#7A6E5E] text-sm text-center leading-relaxed">{t('smartSort.step2Desc')}</p>
            </div>

            {/* Connecting Line (visible on desktop) */}
            <div className="hidden md:flex items-center justify-center -mx-4">
              <div className="h-1 w-full bg-gradient-to-r from-[#7B66B2]/20 to-[#7B66B2]/20"></div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-[#7B66B2] rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 flex-shrink-0">
                3
              </div>
              <div className="text-2xl mb-2 text-center">✅</div>
              <h3 className="text-lg font-serif text-[#2D1E0E] mb-2 text-center">{t('smartSort.step3Title')}</h3>
              <p className="text-[#7A6E5E] text-sm text-center leading-relaxed">{t('smartSort.step3Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Before/After Section */}
      <section className="py-16 px-4 sm:py-24 bg-[#F5F0FF]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-serif text-[#2D1E0E] mb-12 text-center">
            {t('smartSort.beforeAfterTitle')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before */}
            <div>
              <div className="relative mb-4">
                <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {t('smartSort.beforeLabel')}
                </span>
              </div>
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 min-h-96 font-mono text-sm text-[#2D1E0E]">
                <div className="space-y-2">
                  <div>📸 IMG_0821.jpg</div>
                  <div className="text-red-600 font-semibold">📸 IMG_0821(1).jpg (중복)</div>
                  <div>📸 IMG_0822.jpg</div>
                  <div className="text-red-600 font-semibold">📸 IMG_0822(1).jpg (중복)</div>
                  <div>📸 IMG_0823.jpg</div>
                  <div className="text-red-600 font-semibold">📸 IMG_0823(1).jpg (중복)</div>
                  <div>📸 IMG_0824.jpg</div>
                  <div className="text-red-600 font-semibold">📸 IMG_0824(2).jpg (중복)</div>
                  <div>📸 IMG_0825.jpg</div>
                  <div className="text-red-600 font-semibold">📸 IMG_0825(1).jpg (중복)</div>
                  <div>📸 IMG_0826.jpg</div>
                  <div>📸 Unknown_photo_1.jpg</div>
                  <div className="text-red-600 font-semibold">📸 Unknown_photo_1(copy).jpg (중복)</div>
                </div>
              </div>
            </div>

            {/* After */}
            <div>
              <div className="relative mb-4">
                <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {t('smartSort.afterLabel')}
                </span>
              </div>
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 min-h-96 font-mono text-sm text-[#2D1E0E]">
                <div className="space-y-2">
                  <div>📁 2024년 12월</div>
                  <div className="ml-4">👨‍👩‍👧 가족 (3장)</div>
                  <div className="ml-4">🎄 크리스마스 (5장)</div>
                  <div>📁 2024년 여름휴가</div>
                  <div className="ml-4">🏖️ 해변 (8장)</div>
                  <div className="ml-4">⛰️ 산 (6장)</div>
                  <div>📁 2024년 봄</div>
                  <div className="ml-4">🌸 꽃놀이 (4장)</div>
                  <div className="ml-4">👧 아이 성장기 (12장)</div>
                  <div className="text-green-600 text-xs mt-4">✓ 중복 제거 완료</div>
                  <div className="text-green-600 text-xs">✓ 147개 파일 정리됨</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 px-4 bg-[#FAFAF7]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-serif text-[#2D1E0E] mb-8 text-center">{t('landing.faqTitle')}</h2>
          <div className="space-y-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8e2d6]">
                <h3 className="font-bold text-[#2D1E0E] text-[15px] mb-2 flex gap-2 items-start">
                  <span className="text-[#7B66B2]">Q.</span> {t(`smartSort.faq${n}Q`)}
                </h3>
                <p className="text-[#6b5d4d] text-[13.5px] leading-relaxed pl-6">
                  <span className="font-bold text-[#2D1E0E]">A. </span>{t(`smartSort.faq${n}A`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        id="cta-section"
        className="py-16 px-4 sm:py-24 bg-gradient-to-br from-[#F5F0FF] to-[#EDE7F8]"
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#2D1E0E] mb-4">
            {t('smartSort.ctaFinalTitle')}
          </h2>

          <p className="text-lg text-[#7A6E5E] mb-8">
            {t('smartSort.ctaFinalSubtitle')}
          </p>

          <button
            onClick={navigateToLogin}
            className="px-8 py-4 bg-[#5A9460] text-white rounded-lg font-semibold text-lg hover:bg-[#4d7a50] transition-colors inline-flex items-center gap-2 mb-6"
          >
            {t('smartSort.ctaBtn')}
            <ArrowRight size={20} />
          </button>

          <p className="text-sm text-[#7A6E5E]">
            {t('smartSort.freeNote')}
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SmartSortPage;
