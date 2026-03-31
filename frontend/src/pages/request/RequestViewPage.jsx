import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';

const PHASE = { LOADING: 'loading', SLIDESHOW: 'slideshow', CTA: 'cta', UPLOAD: 'upload', DONE: 'done' };
const SLIDE_DURATION = 4000;
const FADE_MS = 1500;

export default function RequestViewPage() {
    const { token } = useParams();
    const navigate = useNavigate();

    const [phase, setPhase] = useState(PHASE.LOADING);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    // slideshow
    const [slideIdx, setSlideIdx] = useState(0);
    const [fadeClass, setFadeClass] = useState('opacity-100');
    const timerRef = useRef(null);
    const slideCountRef = useRef(0);

    // upload
    const [uploaderName, setUploaderName] = useState('');
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadCount, setUploadCount] = useState(0);
    const fileInputRef = useRef(null);

    // 1. 요청 정보 조회
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await axios.get(`/api/request/${token}`);
                if (cancelled) return;
                setData(res.data.data);
                if (res.data.data.photos?.length > 0) {
                    setPhase(PHASE.SLIDESHOW);
                } else {
                    setPhase(PHASE.CTA);
                }
            } catch (err) {
                if (!cancelled) setError(err.response?.data?.message || '요청을 찾을 수 없습니다');
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    // 2. 슬라이드쇼 자동 전환
    const advanceSlide = useCallback(() => {
        if (!data?.photos?.length) return;
        slideCountRef.current += 1;

        if (slideCountRef.current >= data.photos.length) {
            clearInterval(timerRef.current);
            setPhase(PHASE.CTA);
            return;
        }

        setFadeClass('opacity-0');
        setTimeout(() => {
            setSlideIdx((prev) => (prev + 1) % data.photos.length);
            setFadeClass('opacity-100');
        }, FADE_MS);
    }, [data]);

    useEffect(() => {
        if (phase !== PHASE.SLIDESHOW) return;
        timerRef.current = setInterval(advanceSlide, SLIDE_DURATION);
        return () => clearInterval(timerRef.current);
    }, [phase, advanceSlide]);

    // 터치/클릭으로 다음
    const handleSlideTap = () => {
        if (phase !== PHASE.SLIDESHOW) return;
        clearInterval(timerRef.current);
        advanceSlide();
        timerRef.current = setInterval(advanceSlide, SLIDE_DURATION);
    };

    // 5초 후 슬라이드쇼 스킵 버튼
    const [showSkip, setShowSkip] = useState(false);
    useEffect(() => {
        if (phase !== PHASE.SLIDESHOW) return;
        const t = setTimeout(() => setShowSkip(true), 5000);
        return () => clearTimeout(t);
    }, [phase]);

    // 파일 선택
    const handleFiles = (e) => {
        const selected = Array.from(e.target.files || []).slice(0, 10);
        setFiles(selected);
    };

    // 업로드 제출
    const handleUpload = async () => {
        if (!uploaderName.trim() || files.length === 0) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('uploader_name', uploaderName.trim());
            files.forEach((f) => fd.append('photos', f));
            await axios.post(`/api/request/${token}/upload`, fd);
            setUploadCount(files.length);
            setPhase(PHASE.DONE);
        } catch (err) {
            alert(err.response?.data?.message || '업로드에 실패했습니다');
        } finally {
            setUploading(false);
        }
    };

    // ─── Error ───
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ background: '#1a1a1a' }}>
                <div className="text-center text-white px-6">
                    <p style={{ fontSize: 48, marginBottom: 16 }}>😢</p>
                    <p style={{ fontSize: 18, fontFamily: 'Georgia, serif' }}>{error}</p>
                </div>
            </div>
        );
    }

    // ─── Loading ───
    if (phase === PHASE.LOADING || !data) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ background: '#1a1a1a' }}>
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
            </div>
        );
    }

    const photos = data.photos || [];
    const currentPhoto = photos[slideIdx];

    return (
        <div className="min-h-screen relative" style={{ background: '#1a1a1a', fontFamily: 'Georgia, serif' }}>
            <Helmet>
                <title>{data.museumName} — 사진 요청</title>
            </Helmet>

            {/* ═══ SLIDESHOW ═══ */}
            {phase === PHASE.SLIDESHOW && currentPhoto && (
                <div
                    className="fixed inset-0 z-10 flex items-center justify-center cursor-pointer"
                    style={{ background: '#000' }}
                    onClick={handleSlideTap}
                >
                    <img
                        src={currentPhoto.url}
                        alt=""
                        className={`max-w-full max-h-full object-contain transition-opacity ${fadeClass}`}
                        style={{ transitionDuration: `${FADE_MS}ms` }}
                    />

                    {/* 하단 정보 */}
                    <div className="absolute bottom-0 left-0 right-0 p-6"
                        style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                        <div className="flex justify-between items-end max-w-lg mx-auto">
                            <div className="text-white/60 text-xs">
                                {currentPhoto.exhibition_title}
                            </div>
                            <div className="text-right">
                                <div className="text-white/80 text-sm font-bold">{data.museumName}</div>
                                <div className="text-white/50 text-xs">{data.requesterName}</div>
                            </div>
                        </div>
                    </div>

                    {/* 진행 바 */}
                    <div className="absolute top-0 left-0 right-0 flex gap-1 p-2">
                        {photos.map((_, i) => (
                            <div key={i} className="h-0.5 flex-1 rounded-full"
                                style={{ background: i <= slideIdx ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)' }} />
                        ))}
                    </div>

                    {/* 스킵 버튼 */}
                    {showSkip && (
                        <button
                            className="absolute top-4 right-4 text-white/50 text-sm px-3 py-1 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}
                            onClick={(e) => { e.stopPropagation(); clearInterval(timerRef.current); setPhase(PHASE.CTA); }}
                        >
                            건너뛰기
                        </button>
                    )}
                </div>
            )}

            {/* ═══ CTA 감동 문구 ═══ */}
            {phase === PHASE.CTA && (
                <div className="fixed inset-0 z-20 flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.85)', animation: 'rvpFadeIn 1s ease' }}>
                    <div className="text-center px-8 max-w-md">
                        <h1 className="text-white mb-6" style={{
                            fontSize: 'clamp(22px, 5.5vw, 32px)',
                            fontWeight: 700, lineHeight: 1.4,
                        }}>
                            {data.requesterName}님이 당신의 추억을<br />
                            이 박물관에 더해주길 바랍니다 🙏
                        </h1>

                        <p className="mb-10" style={{
                            fontSize: 'clamp(14px, 3.5vw, 17px)',
                            color: 'rgba(255,255,255,0.55)', lineHeight: 1.7,
                        }}>
                            당신이 가진 사진 한 장이<br />
                            우리 가족의 역사가 됩니다
                        </p>

                        <div className="flex flex-col gap-3 items-center">
                            <button
                                onClick={() => setPhase(PHASE.UPLOAD)}
                                className="active:scale-[0.97]"
                                style={{
                                    width: '100%', maxWidth: 280, height: 56,
                                    borderRadius: 16,
                                    background: 'linear-gradient(135deg, #4CAF50, #3D9B42)',
                                    color: '#fff', fontSize: 18, fontWeight: 700,
                                    border: 'none', cursor: 'pointer',
                                    boxShadow: '0 4px 20px rgba(76,175,80,0.35)',
                                }}
                            >
                                📷 사진 올리기
                            </button>

                            {data.subdomain && (
                                <button
                                    onClick={() => navigate(`/${data.subdomain}`)}
                                    style={{
                                        background: 'none', border: 'none',
                                        color: 'rgba(255,255,255,0.4)', fontSize: 14,
                                        cursor: 'pointer', padding: '8px 0',
                                    }}
                                >
                                    박물관 더 둘러보기
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ UPLOAD FORM ═══ */}
            {phase === PHASE.UPLOAD && (
                <div className="fixed inset-0 z-30 flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.9)', animation: 'rvpFadeIn 0.5s ease' }}>
                    <div className="w-full max-w-sm mx-4 rounded-2xl p-6"
                        style={{ background: '#2a2a2a', border: '1px solid #3a3a3a' }}>

                        <h2 className="text-white text-center mb-6" style={{ fontSize: 20, fontWeight: 700 }}>
                            사진 올리기
                        </h2>

                        {/* 이름 입력 */}
                        <div className="mb-4">
                            <label className="block text-white/60 text-sm mb-1.5">보내는 분 이름</label>
                            <input
                                type="text"
                                value={uploaderName}
                                onChange={(e) => setUploaderName(e.target.value)}
                                placeholder="이름을 입력해주세요"
                                maxLength={50}
                                className="w-full px-4 py-3 rounded-xl text-white"
                                style={{ background: '#1a1a1a', border: '1px solid #444', fontSize: 15 }}
                            />
                        </div>

                        {/* 파일 선택 */}
                        <div className="mb-5">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/heic"
                                multiple
                                onChange={handleFiles}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-4 rounded-xl text-center"
                                style={{
                                    background: '#1a1a1a', border: '2px dashed #555',
                                    color: files.length > 0 ? '#4CAF50' : 'rgba(255,255,255,0.4)',
                                    fontSize: 15, cursor: 'pointer',
                                }}
                            >
                                {files.length > 0
                                    ? `📷 ${files.length}장 선택됨`
                                    : '📁 사진 선택 (최대 10장)'}
                            </button>

                            {/* 미리보기 */}
                            {files.length > 0 && (
                                <div className="grid grid-cols-5 gap-1.5 mt-3">
                                    {files.map((f, i) => (
                                        <div key={i} className="aspect-square rounded-lg overflow-hidden"
                                            style={{ background: '#1a1a1a' }}>
                                            <img
                                                src={URL.createObjectURL(f)}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 올리기 버튼 */}
                        <button
                            onClick={handleUpload}
                            disabled={uploading || !uploaderName.trim() || files.length === 0}
                            className="w-full py-3.5 rounded-xl text-white font-bold text-base disabled:opacity-40"
                            style={{
                                background: 'linear-gradient(135deg, #4CAF50, #3D9B42)',
                                border: 'none', cursor: 'pointer',
                            }}
                        >
                            {uploading ? '올리는 중...' : '올리기'}
                        </button>

                        {/* 뒤로 */}
                        <button
                            onClick={() => setPhase(PHASE.CTA)}
                            className="w-full mt-3 py-2 text-center"
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer' }}
                        >
                            ← 돌아가기
                        </button>
                    </div>
                </div>
            )}

            {/* ═══ DONE ═══ */}
            {phase === PHASE.DONE && (
                <div className="fixed inset-0 z-40 flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.9)', animation: 'rvpFadeIn 0.6s ease' }}>
                    <div className="text-center px-8 max-w-sm">
                        <p style={{ fontSize: 56, marginBottom: 16 }}>😊</p>
                        <h2 className="text-white mb-3" style={{ fontSize: 24, fontWeight: 700 }}>
                            감사해요
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>
                            사진 {uploadCount}장이 전달되었습니다.<br />
                            {data.requesterName}님께 전달됩니다.
                        </p>
                        <p className="mb-8" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.6 }}>
                            당신도 가족 박물관을 만들어보세요
                        </p>

                        <button
                            onClick={() => navigate('/onboarding/start')}
                            className="active:scale-[0.97]"
                            style={{
                                width: '100%', maxWidth: 260, height: 52,
                                borderRadius: 14,
                                background: 'linear-gradient(135deg, #4CAF50, #3D9B42)',
                                color: '#fff', fontSize: 16, fontWeight: 700,
                                border: 'none', cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(76,175,80,0.3)',
                            }}
                        >
                            내 박물관 만들기 →
                        </button>

                        {data.subdomain && (
                            <button
                                onClick={() => navigate(`/${data.subdomain}`)}
                                style={{
                                    display: 'block', margin: '16px auto 0',
                                    background: 'none', border: 'none',
                                    color: 'rgba(255,255,255,0.35)', fontSize: 13,
                                    cursor: 'pointer',
                                }}
                            >
                                {data.museumName} 둘러보기
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ─── 애니메이션 ─── */}
            <style>{`
                @keyframes rvpFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
