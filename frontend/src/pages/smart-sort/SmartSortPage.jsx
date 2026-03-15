import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
      <Navbar />

      {/* Hero Section */}
      <section className="flex-grow bg-gradient-to-br from-[#F5F0FF] to-[#EDE7F8] py-16 px-4 sm:py-24">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="text-sm text-[#7A6E5E] mb-6 flex items-center gap-2">
            <span>Orgcell</span>
            <span>›</span>
            <span>AI 스마트 분류</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#2D1E0E] mb-4 leading-tight">
            사진 정리, 이제 AI에게 맡기세요
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-[#7A6E5E] mb-8 max-w-2xl leading-relaxed">
            수천 장의 중복 사진을 1분 안에 제거하고, 날짜·인물·이벤트별로 자동 정리합니다
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <button
              onClick={() => scrollToSection('cta-section')}
              className="px-8 py-3 bg-[#5A9460] text-white rounded-lg font-semibold hover:bg-[#4d7a50] transition-colors flex items-center justify-center gap-2"
            >
              무료로 시작하기
              <ArrowRight size={20} />
            </button>
            <button
              onClick={() => scrollToSection('features-section')}
              className="px-8 py-3 border-2 border-[#7B66B2] text-[#7B66B2] rounded-lg font-semibold hover:bg-[#7B66B2] hover:text-white transition-colors"
            >
              기능 살펴보기
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-white/50 backdrop-blur-sm rounded-lg p-6 border border-white/80">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-[#7B66B2]">37%</p>
              <p className="text-sm text-[#7A6E5E] mt-1">평균 중복 제거율</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-[#5A9460]">1,000장/분</p>
              <p className="text-sm text-[#7A6E5E] mt-1">처리 속도</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-[#2D1E0E]">94%</p>
              <p className="text-sm text-[#7A6E5E] mt-1">얼굴 인식 정확도</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 px-4 sm:py-24 bg-[#FAFAF7]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-serif text-[#2D1E0E] mb-12 text-center">
            이런 경험 있으신가요?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pain Point 1 */}
            <div className="bg-white border border-[#E5E1D6] rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📸</div>
              <h3 className="text-xl font-serif text-[#2D1E0E] mb-3">
                같은 사진이 여러 폴더에 중복 저장
              </h3>
              <p className="text-[#7A6E5E] text-sm leading-relaxed">
                사진 앱이 바뀔 때마다 복사본이 쌓입니다
              </p>
            </div>

            {/* Pain Point 2 */}
            <div className="bg-white border border-[#E5E1D6] rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-xl font-serif text-[#2D1E0E] mb-3">
                어디서 찍었는지, 언제 찍었는지 알 수 없는 사진들
              </h3>
              <p className="text-[#7A6E5E] text-sm leading-relaxed">
                정리되지 않은 사진은 추억이 아닙니다
              </p>
            </div>

            {/* Pain Point 3 */}
            <div className="bg-white border border-[#E5E1D6] rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👨‍👩‍👧</div>
              <h3 className="text-xl font-serif text-[#2D1E0E] mb-3">
                누가 찍힌 사진인지 일일이 찾아야 하는 번거로움
              </h3>
              <p className="text-[#7A6E5E] text-sm leading-relaxed">
                아이의 성장 사진을 찾는데 1시간?
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
            AI 스마트 분류의 5가지 능력
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature 1: AI Duplicate Detection */}
            <div className="bg-white rounded-lg p-6 border border-[#E5E1D6] hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#7B66B2]/10 rounded-lg flex-shrink-0">
                  <ScanSearch size={24} className="text-[#7B66B2]" />
                </div>
                <div>
                  <h3 className="text-lg font-serif text-[#2D1E0E] mb-2">
                    AI 중복 감지
                  </h3>
                  <p className="text-[#7A6E5E] text-sm leading-relaxed">
                    dHash 알고리즘으로 완전 동일한 사진과 유사 사진을 모두 찾아냅니다
                  </p>
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
                  <h3 className="text-lg font-serif text-[#2D1E0E] mb-2">
                    시간순 자동 정렬
                  </h3>
                  <p className="text-[#7A6E5E] text-sm leading-relaxed">
                    EXIF 촬영 메타데이터를 기반으로 찍힌 순서대로 정렬합니다
                  </p>
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
                  <h3 className="text-lg font-serif text-[#2D1E0E] mb-2">
                    인물별 자동 분류
                  </h3>
                  <p className="text-[#7A6E5E] text-sm leading-relaxed">
                    얼굴 인식 AI가 같은 사람의 사진을 하나의 폴더로 모아줍니다
                  </p>
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
                  <h3 className="text-lg font-serif text-[#2D1E0E] mb-2">
                    Best Cut 선별
                  </h3>
                  <p className="text-[#7A6E5E] text-sm leading-relaxed">
                    유사한 연속 사진 중 가장 잘 나온 1장을 자동으로 골라줍니다
                  </p>
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
                  <h3 className="text-lg font-serif text-[#2D1E0E] mb-2">
                    원본 보존
                  </h3>
                  <p className="text-[#7A6E5E] text-sm leading-relaxed">
                    원본은 절대 삭제하지 않습니다. 중복 파일만 선택적으로 제거합니다
                  </p>
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
            3단계로 끝나는 사진 정리
          </h2>

          {/* Steps Container */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-[#7B66B2] rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 flex-shrink-0">
                1
              </div>
              <div className="text-2xl mb-2 text-center">📁</div>
              <h3 className="text-lg font-serif text-[#2D1E0E] mb-2 text-center">
                폴더 선택
              </h3>
              <p className="text-[#7A6E5E] text-sm text-center leading-relaxed">
                정리할 폴더와 저장할 폴더를 지정합니다
              </p>
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
              <h3 className="text-lg font-serif text-[#2D1E0E] mb-2 text-center">
                AI 분석
              </h3>
              <p className="text-[#7A6E5E] text-sm text-center leading-relaxed">
                AI가 자동으로 중복·인물·날짜를 분석합니다
              </p>
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
              <h3 className="text-lg font-serif text-[#2D1E0E] mb-2 text-center">
                결과 확인
              </h3>
              <p className="text-[#7A6E5E] text-sm text-center leading-relaxed">
                제안된 결과를 확인하고 원하는 것만 적용합니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Before/After Section */}
      <section className="py-16 px-4 sm:py-24 bg-[#F5F0FF]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-serif text-[#2D1E0E] mb-12 text-center">
            정리 전 vs 정리 후
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before */}
            <div>
              <div className="relative mb-4">
                <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  정리 전
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
                  정리 후
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

      {/* CTA Section */}
      <section
        id="cta-section"
        className="py-16 px-4 sm:py-24 bg-gradient-to-br from-[#F5F0FF] to-[#EDE7F8]"
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#2D1E0E] mb-4">
            지금 바로 무료로 시작하세요
          </h2>

          <p className="text-lg text-[#7A6E5E] mb-8">
            Google 계정 하나로 시작, 신용카드 불필요
          </p>

          <button
            onClick={navigateToLogin}
            className="px-8 py-4 bg-[#5A9460] text-white rounded-lg font-semibold text-lg hover:bg-[#4d7a50] transition-colors inline-flex items-center gap-2 mb-6"
          >
            Google로 무료 시작
            <ArrowRight size={20} />
          </button>

          <p className="text-sm text-[#7A6E5E]">
            AI 스마트 분류는 완전 무료입니다
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SmartSortPage;
