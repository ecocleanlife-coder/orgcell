import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
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
            Orgcell &gt; 실시간 사진 공유
          </div>

          {/* Tagline Pill */}
          <div className="inline-block bg-white px-4 py-2 rounded-full border border-[#E0E0E0] mb-6">
            <span className="text-sm">📸 이 순간을 함께</span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight mb-6">
            지금 찍은 사진을<br />가족 모두에게 바로
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-[#7A6E5E] mb-8 max-w-2xl">
            QR 코드 하나로 연결, 클릭 한 번으로 전송. 이벤트가 끝나기 전에 모든 가족이 같은 추억을 나눕니다
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <button
              onClick={handleStartFree}
              className="px-8 py-3 bg-[#5A9460] text-white rounded-lg font-semibold hover:bg-[#4a7a50] transition-colors"
            >
              무료로 시작하기
            </button>
            <button
              onClick={() => smoothScroll('how-it-works')}
              className="px-8 py-3 border-2 border-[#4B7DB8] text-[#4B7DB8] rounded-lg font-semibold hover:bg-[#4B7DB8] hover:text-white transition-colors"
            >
              어떻게 작동하나요?
            </button>
          </div>

          {/* Stats Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-[#E0E0E0]">
              <p className="font-semibold text-[#0E1E2A]">연결 시간 &lt; 30초</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-[#E0E0E0]">
              <p className="font-semibold text-[#0E1E2A]">동시 참여 무제한</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-[#E0E0E0]">
              <p className="font-semibold text-[#0E1E2A]">24시간 자동 삭제</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="bg-white py-20 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 text-center">
            이런 순간에 쓰세요
          </h2>
          <p className="text-center text-[#7A6E5E] mb-12">
            가족의 특별한 순간을 더 가깝게 함께합니다
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Family Gatherings */}
            <div className="border-l-4 border-yellow-400 pl-6 py-4">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="font-serif text-xl font-bold mb-3">가족 모임</h3>
              <p className="text-[#7A6E5E]">
                명절, 생일파티... 모인 가족 모두가 같은 사진을 나눠 가집니다
              </p>
            </div>

            {/* Group Travel */}
            <div className="border-l-4 border-blue-400 pl-6 py-4">
              <div className="text-4xl mb-3">✈️</div>
              <h3 className="font-serif text-xl font-bold mb-3">단체 여행</h3>
              <p className="text-[#7A6E5E]">
                하와이, 베트남 여행... 누군가 찍은 멋진 사진을 전원이 다운받습니다
              </p>
            </div>

            {/* Weddings & Events */}
            <div className="border-l-4 border-pink-400 pl-6 py-4">
              <div className="text-4xl mb-3">💍</div>
              <h3 className="font-serif text-xl font-bold mb-3">결혼식·행사</h3>
              <p className="text-[#7A6E5E]">
                하객들이 찍은 사진을 주인공이 한 번에 모읍니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-[#F0F5FF] py-20 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 text-center">
            실시간 공유의 모든 것
          </h2>
          <p className="text-center text-[#7A6E5E] mb-12">
            모든 기능이 한 곳에서 구현됩니다
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-[#E0E0E0]">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <QrCode className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold mb-2">QR/코드 입장</h3>
                  <p className="text-[#7A6E5E]">
                    초대 코드나 QR 스캔으로 클릭 한 번 입장. 로그인 불필요
                  </p>
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
                  <h3 className="font-serif text-lg font-bold mb-2">AI 얼굴 필터</h3>
                  <p className="text-[#7A6E5E]">
                    내가 나온 사진만 골라서 받기. AI가 자동으로 찾아줍니다
                  </p>
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
                  <h3 className="font-serif text-lg font-bold mb-2">실시간 라이브 피드</h3>
                  <p className="text-[#7A6E5E]">
                    누군가 사진을 올리면 즉시 모든 참여자 화면에 나타납니다
                  </p>
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
                  <h3 className="font-serif text-lg font-bold mb-2">이모티콘 반응</h3>
                  <p className="text-[#7A6E5E]">
                    하트, 웃음... 사진에 감정을 바로 표현하세요
                  </p>
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
                  <h3 className="font-serif text-lg font-bold mb-2">스마트 푸시 알림</h3>
                  <p className="text-[#7A6E5E]">
                    "아빠가 5장 공유했습니다" 알림이 실시간으로
                  </p>
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
                  <h3 className="font-serif text-lg font-bold mb-2">24시간 자동 삭제</h3>
                  <p className="text-[#7A6E5E]">
                    이벤트 종료 후 24시간 뒤 서버에서 완전 삭제
                  </p>
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
            세 단계로 시작하는 공유
          </h2>
          <p className="text-center text-[#7A6E5E] mb-12">
            간단한 단계로 가족과 추억을 나눕니다
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="text-5xl font-bold text-[#4B7DB8] mb-4">1</div>
              <div className="text-2xl mb-6">🔗</div>
              <h3 className="font-serif text-xl font-bold mb-4">코드 생성</h3>
              <ul className="space-y-3 text-[#7A6E5E]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>공유 제목 입력 (예: "2025 하와이 가족여행")</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>참여 코드 또는 QR 코드 생성</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>이메일·카카오·문자로 가족에게 전송</span>
                </li>
              </ul>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="text-5xl font-bold text-[#4B7DB8] mb-4">2</div>
              <div className="text-2xl mb-6">📸</div>
              <h3 className="font-serif text-xl font-bold mb-4">사진 선택</h3>
              <ul className="space-y-3 text-[#7A6E5E]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>전송할 사진 선택</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>AI로 내가 나온 사진 자동 필터</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>공유 전까지 상대방은 볼 수 없음 (개인정보 보호)</span>
                </li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="text-5xl font-bold text-[#4B7DB8] mb-4">3</div>
              <div className="text-2xl mb-6">✅</div>
              <h3 className="font-serif text-xl font-bold mb-4">모두가 받아가기</h3>
              <ul className="space-y-3 text-[#7A6E5E]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>확인 후 전송</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>각자 원하는 사진 선택해서 다운로드</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span>자신의 폴더 또는 기기에 저장</span>
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
            개별 공유 vs 단체 공유
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Individual Sharing */}
            <div className="bg-white rounded-lg p-8 border-l-4 border-[#4B7DB8] shadow-sm">
              <h3 className="font-serif text-2xl font-bold mb-6 text-[#4B7DB8]">
                개별 공유
              </h3>
              <p className="text-sm text-[#7A6E5E] font-semibold mb-6 uppercase tracking-wide">
                1:1 또는 소수
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <ArrowRight size={20} className="text-[#4B7DB8] mt-1 flex-shrink-0" />
                  <span className="text-[#0E1E2A]">특정 사람에게만 보내고 싶을 때</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight size={20} className="text-[#4B7DB8] mt-1 flex-shrink-0" />
                  <span className="text-[#0E1E2A]">사진을 미리 선택 후 상대 확인</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight size={20} className="text-[#4B7DB8] mt-1 flex-shrink-0" />
                  <span className="text-[#0E1E2A]">얼굴 인식으로 맞춤 전송</span>
                </li>
              </ul>
            </div>

            {/* Group Sharing */}
            <div className="bg-white rounded-lg p-8 border-l-4 border-[#5A9460] shadow-sm">
              <h3 className="font-serif text-2xl font-bold mb-6 text-[#5A9460]">
                단체 공유
              </h3>
              <p className="text-sm text-[#7A6E5E] font-semibold mb-6 uppercase tracking-wide">
                이벤트
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <ArrowRight size={20} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span className="text-[#0E1E2A]">10명, 100명도 한 번에</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight size={20} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span className="text-[#0E1E2A]">이벤트 앨범 생성</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight size={20} className="text-[#5A9460] mt-1 flex-shrink-0" />
                  <span className="text-[#0E1E2A]">전원이 올리고 전원이 받기</span>
                </li>
              </ul>
            </div>
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
            다음 가족 모임, 사진 공유는 Orgcell로
          </h2>
          <p className="text-lg text-gray-200 mb-8">
            오늘 찍은 사진을 오늘 나누세요. Google 계정만 있으면 됩니다
          </p>
          <button
            onClick={handleStartFree}
            className="px-8 py-4 bg-[#5A9460] text-white rounded-lg font-semibold hover:bg-[#4a7a50] transition-colors mb-4"
          >
            Google로 무료 시작
          </button>
          <p className="text-sm text-gray-300">
            실시간 공유는 완전 무료입니다
          </p>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LiveSharingPage;
