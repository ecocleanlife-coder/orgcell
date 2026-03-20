import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import {
  QrCode,
  Users,
  Zap,
  Heart,
  Bell,
  Share2,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Camera,
} from 'lucide-react';

const smoothScroll = (elementId) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

const LiveSharingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleStartFree = () => {
    navigate('/');
    setTimeout(() => {
      const loginSection = document.getElementById('login-section');
      if (loginSection) {
        loginSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="bg-[#FAFAF7] text-[#0E1E2A]">
      <Helmet>
        <title>Live Photo Sharing — Orgcell</title>
        <meta name="description" content="QR코드 하나로 가족·친구와 사진을 실시간 공유. 앱 설치 불필요, 24시간 자동 삭제, 무료 사용." />
        <meta property="og:title" content="Live Photo Sharing — Orgcell" />
        <meta property="og:description" content="모임·여행·결혼식 사진을 QR코드로 즉시 공유. 로그인 없이 무료로 시작하세요." />
        <meta property="og:image" content="/pwa-512x512.png" />
      </Helmet>
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#EEF4FD] to-[#E4EEFA] pt-16 pb-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="text-sm text-[#7A6E5E] mb-8">
            Orgcell &gt; {t('liveSharing.breadcrumb')}
          </div>

          {/* Tagline Pill */}
          <div className="inline-block bg-white px-4 py-2 rounded-full border border-[#E0E0E0] mb-6">
            <span className="text-sm">{t('liveSharing.tagline')}</span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight mb-6">
            {t('liveSharing.headline').split('\n').map((line, i, arr) => (
              <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>
            ))}
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-[#7A6E5E] mb-8 max-w-2xl">
            {t('liveSharing.subtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <button
              onClick={handleStartFree}
              className="px-8 py-3 bg-[#5A9460] text-white rounded-lg font-semibold hover:bg-[#4a7a50] transition-colors"
            >
              {t('liveSharing.ctaStart')}
            </button>
            <button
              onClick={() => smoothScroll('how-it-works')}
              className="px-8 py-3 border-2 border-[#4B7DB8] text-[#4B7DB8] rounded-lg font-semibold hover:bg-[#4B7DB8] hover:text-white transition-colors"
            >
              {t('liveSharing.ctaHow')}
            </button>
          </div>

          {/* Hero Image */}
          <img
            src="/images/landing/card-live-share.png"
            alt="Live Photo Sharing"
            style={{ maxWidth: '320px', width: '100%', margin: '0 auto 32px', display: 'block' }}
          />

          {/* Stats Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-[#E0E0E0]">
              <p className="font-semibold text-[#0E1E2A]">{t('liveSharing.stat1')}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-[#E0E0E0]">
              <p className="font-semibold text-[#0E1E2A]">{t('liveSharing.stat2')}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-[#E0E0E0]">
              <p className="font-semibold text-[#0E1E2A]">{t('liveSharing.stat3')}</p>
            </div>
          </div>

          {/* Privacy Badge */}
          <div className="mt-6 flex justify-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-[#4B7DB8] bg-white border border-[#b0c8e0]">
              🆓 Free · No account needed for viewers
            </span>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="bg-white py-20 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 text-center">
            {t('liveSharing.useCasesTitle')}
          </h2>
          <p className="text-center text-[#7A6E5E] mb-12">
            {t('liveSharing.useCasesSubtitle')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Family Gatherings */}
            <div className="border-l-4 border-yellow-400 pl-6 py-4">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="font-serif text-xl font-bold mb-3">{t('liveSharing.useCase1Title')}</h3>
              <p className="text-[#7A6E5E]">{t('liveSharing.useCase1Desc')}</p>
            </div>

            {/* Group Travel */}
            <div className="border-l-4 border-blue-400 pl-6 py-4">
              <div className="text-4xl mb-3">✈️</div>
              <h3 className="font-serif text-xl font-bold mb-3">{t('liveSharing.useCase2Title')}</h3>
              <p className="text-[#7A6E5E]">{t('liveSharing.useCase2Desc')}</p>
            </div>

            {/* Weddings & Events */}
            <div className="border-l-4 border-pink-400 pl-6 py-4">
              <div className="text-4xl mb-3">💍</div>
              <h3 className="font-serif text-xl font-bold mb-3">{t('liveSharing.useCase3Title')}</h3>
              <p className="text-[#7A6E5E]">{t('liveSharing.useCase3Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-[#F0F5FF] py-20 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 text-center">
            {t('liveSharing.featuresTitle')}
          </h2>
          <p className="text-center text-[#7A6E5E] mb-12">
            {t('liveSharing.featuresSubtitle')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-[#E0E0E0]">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <QrCode className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold mb-2">{t('liveSharing.feat1Title')}</h3>
                  <p className="text-[#7A6E5E]">{t('liveSharing.feat1Desc')}</p>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-[#E0E0E0]">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Camera className="text-purple-600" size={24} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold mb-2">{t('liveSharing.feat2Title')}</h3>
                  <p className="text-[#7A6E5E]">{t('liveSharing.feat2Desc')}</p>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-[#E0E0E0]">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Zap className="text-amber-600" size={24} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold mb-2">{t('liveSharing.feat3Title')}</h3>
                  <p className="text-[#7A6E5E]">{t('liveSharing.feat3Desc')}</p>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-[#E0E0E0]">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-pink-100 rounded-lg">
                  <Heart className="text-pink-600" size={24} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold mb-2">{t('liveSharing.feat4Title')}</h3>
                  <p className="text-[#7A6E5E]">{t('liveSharing.feat4Desc')}</p>
                </div>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-[#E0E0E0]">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Bell className="text-green-600" size={24} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold mb-2">{t('liveSharing.feat5Title')}</h3>
                  <p className="text-[#7A6E5E]">{t('liveSharing.feat5Desc')}</p>
                </div>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-[#E0E0E0]">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-teal-100 rounded-lg">
                  <ShieldCheck className="text-teal-600" size={24} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold mb-2">{t('liveSharing.feat6Title')}</h3>
                  <p className="text-[#7A6E5E]">{t('liveSharing.feat6Desc')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-white py-20 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 text-center">
            {t('liveSharing.howTitle')}
          </h2>
          <p className="text-center text-[#7A6E5E] mb-12">
            {t('liveSharing.howSubtitle')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="text-5xl font-bold text-[#4B7DB8] mb-4">1</div>
              <div className="text-2xl mb-6">🔗</div>
              <h3 className="font-serif text-xl font-bold mb-4">{t('liveSharing.how1Title')}</h3>
              <ul className="space-y-3 text-[#7A6E5E]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>{t('liveSharing.how1step1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>{t('liveSharing.how1step2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>{t('liveSharing.how1step3')}</span>
                </li>
              </ul>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="text-5xl font-bold text-[#4B7DB8] mb-4">2</div>
              <div className="text-2xl mb-6">📸</div>
              <h3 className="font-serif text-xl font-bold mb-4">{t('liveSharing.how2Title')}</h3>
              <ul className="space-y-3 text-[#7A6E5E]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>{t('liveSharing.how2step1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>{t('liveSharing.how2step2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>{t('liveSharing.how2step3')}</span>
                </li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="text-5xl font-bold text-[#4B7DB8] mb-4">3</div>
              <div className="text-2xl mb-6">✅</div>
              <h3 className="font-serif text-xl font-bold mb-4">{t('liveSharing.how3Title')}</h3>
              <ul className="space-y-3 text-[#7A6E5E]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>{t('liveSharing.how3step1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>{t('liveSharing.how3step2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>{t('liveSharing.how3step3')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Individual vs Group Sharing */}
      <section className="bg-[#F0F5FF] py-20 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-12 text-center">
            {t('liveSharing.compareTitle')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Individual Sharing */}
            <div className="bg-white rounded-lg p-8 border-l-4 border-[#4B7DB8] shadow-sm">
              <h3 className="font-serif text-2xl font-bold mb-6 text-[#4B7DB8]">
                {t('liveSharing.individualTitle')}
              </h3>
              <p className="text-sm text-[#7A6E5E] font-semibold mb-6 uppercase tracking-wide">
                {t('liveSharing.individualLabel')}
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <ArrowRight size={20} className="text-[#4B7DB8] mt-1 flex-shrink-0" />
                  <span className="text-[#0E1E2A]">{t('liveSharing.individual1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight size={20} className="text-[#4B7DB8] mt-1 flex-shrink-0" />
                  <span className="text-[#0E1E2A]">{t('liveSharing.individual2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight size={20} className="text-[#4B7DB8] mt-1 flex-shrink-0" />
                  <span className="text-[#0E1E2A]">{t('liveSharing.individual3')}</span>
                </li>
              </ul>
            </div>

            {/* Group Sharing */}
            <div className="bg-white rounded-lg p-8 border-l-4 border-[#5A9460] shadow-sm">
              <h3 className="font-serif text-2xl font-bold mb-6 text-[#5A9460]">
                {t('liveSharing.groupTitle')}
              </h3>
              <p className="text-sm text-[#7A6E5E] font-semibold mb-6 uppercase tracking-wide">
                {t('liveSharing.groupLabel')}
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <ArrowRight size={20} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span className="text-[#0E1E2A]">{t('liveSharing.group1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight size={20} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span className="text-[#0E1E2A]">{t('liveSharing.group2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight size={20} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span className="text-[#0E1E2A]">{t('liveSharing.group3')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 px-4 bg-[#EEF4FD]">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0E1E2A] mb-8 text-center">{t('landing.faqTitle')}</h2>
          <div className="space-y-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="bg-white rounded-2xl p-6 shadow-sm border border-[#dce8f5]">
                <h3 className="font-bold text-[#0E1E2A] text-[15px] mb-2 flex gap-2 items-start">
                  <span className="text-[#4B7DB8]">Q.</span> {t(`liveSharing.faq${n}Q`)}
                </h3>
                <p className="text-[#6b5d4d] text-[13.5px] leading-relaxed pl-6">
                  <span className="font-bold text-[#0E1E2A]">A. </span>{t(`liveSharing.faq${n}A`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        id="cta-section"
        className="bg-gradient-to-r from-[#0E1E3A] to-[#1a3a5c] py-20 px-4 md:px-8 text-white"
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
            {t('liveSharing.finalCtaTitle')}
          </h2>
          <p className="text-lg text-gray-200 mb-8">
            {t('liveSharing.finalCtaSubtitle')}
          </p>
          <button
            onClick={handleStartFree}
            className="px-8 py-4 bg-[#5A9460] text-white rounded-lg font-semibold hover:bg-[#4a7a50] transition-colors mb-4"
          >
            {t('liveSharing.ctaBtn')}
          </button>
          <p className="text-sm text-gray-300">
            {t('liveSharing.freeNote')}
          </p>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LiveSharingPage;
