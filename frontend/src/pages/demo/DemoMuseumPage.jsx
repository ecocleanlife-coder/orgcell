import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';

const ALBUMS = [
  { title: 'Summer Vacation 2023', count: 12, emoji: '🏖️', color: '#e8f0ff' },
  { title: "Grandma's 70th Birthday", count: 28, emoji: '🎂', color: '#fff0e8' },
  { title: 'Family Reunion 2022', count: 45, emoji: '👨‍👩‍👧‍👦', color: '#e8fff0' },
];

const DemoMuseumPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F2EC' }}>
      <Helmet>
        <title>Kim Family Museum — Orgcell Demo</title>
        <meta name="description" content="Orgcell 가족 박물관 예시 페이지입니다." />
      </Helmet>

      <Navbar />

      {/* Hero */}
      <section
        className="py-12 px-5"
        style={{ background: 'linear-gradient(135deg, #f0ebe0 0%, #e8e1d3 100%)' }}
      >
        <div className="max-w-[800px] mx-auto text-center">
          <div
            className="inline-block px-4 py-1.5 rounded-full text-[12px] font-bold mb-4"
            style={{ background: '#fff8e0', color: '#b07a00', border: '1px solid #f0c040' }}
          >
            ✨ {t('demo.badge')}
          </div>
          <h1
            className="mb-3"
            style={{
              fontSize: 'clamp(28px, 6vw, 42px)',
              fontWeight: 800,
              fontFamily: 'Georgia, serif',
              color: '#3D2008',
            }}
          >
            Kim Family Museum
          </h1>
          <p style={{ color: '#7a6e5e', fontSize: '15px' }}>
            {t('demo.subtitle')}
          </p>
        </div>
      </section>

      {/* Family Tree Image */}
      <section className="py-10 px-5" style={{ background: '#FAFAF7' }}>
        <div className="max-w-[900px] mx-auto">
          <h2
            className="text-center mb-6"
            style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Georgia, serif', color: '#3D2008' }}
          >
            🌳 {t('demo.treeTitle')}
          </h2>
          <img
            src="/images/landing/familytree-sample.png"
            alt="Kim Family Tree"
            style={{ width: '100%', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}
          />
        </div>
      </section>

      {/* Albums */}
      <section className="py-10 px-5" style={{ background: '#F5F2EC' }}>
        <div className="max-w-[800px] mx-auto">
          <h2
            className="text-center mb-6"
            style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Georgia, serif', color: '#3D2008' }}
          >
            📸 {t('demo.albumsTitle')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ALBUMS.map(album => (
              <div
                key={album.title}
                className="rounded-2xl p-5 text-center"
                style={{
                  background: album.color,
                  border: '1px solid rgba(0,0,0,0.06)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>{album.emoji}</div>
                <p style={{ fontWeight: '700', color: '#3D2008', fontSize: '14px', marginBottom: '4px' }}>
                  {album.title}
                </p>
                <p style={{ color: '#7a6e5e', fontSize: '12px' }}>
                  {album.count} {t('demo.photos')}
                </p>
                <div
                  className="mt-3 px-3 py-1.5 rounded-full text-[11px] font-semibold inline-block"
                  style={{ background: 'rgba(0,0,0,0.06)', color: '#7a6e5e' }}
                >
                  {t('demo.exampleOnly')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-14 px-5 text-center"
        style={{ background: 'linear-gradient(135deg, #2a3d1a 0%, #3a5a2a 100%)' }}
      >
        <h2
          className="mb-3"
          style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'Georgia, serif', color: '#FAFAF7' }}
        >
          {t('demo.ctaTitle')}
        </h2>
        <p className="mb-6" style={{ color: '#b8d498', fontSize: '14px' }}>
          {t('demo.ctaSubtitle')}
        </p>
        <button
          onClick={() => navigate('/auth/login')}
          className="px-8 py-3 rounded-full font-bold text-[15px] text-white transition-all hover:brightness-110 active:scale-95 cursor-pointer"
          style={{ background: '#8DB86B' }}
        >
          {t('demo.ctaBtn')}
        </button>
      </section>

      <Footer />
    </div>
  );
};

export default DemoMuseumPage;
