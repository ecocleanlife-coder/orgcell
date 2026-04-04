import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
    const navigate = useNavigate();

    return (
        <footer style={{ background: '#2A1C0E', color: '#C8B99A' }}>
            <div className="max-w-[1040px] mx-auto px-6 py-14">
                <div className="grid md:grid-cols-4 gap-10 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-2">
                        <div className="flex items-baseline gap-1 mb-3">
                            <span
                                className="text-[28px] font-black text-white"
                                style={{ fontFamily: 'Georgia, serif' }}
                            >
                                Orgcell
                            </span>
                            <span className="text-[18px] font-bold" style={{ color: '#C8A040' }}>.com</span>
                        </div>
                        <p className="text-[13.5px] leading-relaxed mb-4" style={{ color: '#A89880' }}>
                            가족의 추억을 AI가 자동으로 정리하고,<br />
                            영원히 함께할 수 있는 유산박물관을 만들어 드립니다.
                        </p>
                        <p className="text-[12px] italic" style={{ color: '#7A6E5E', fontFamily: 'Georgia, serif' }}>
                            "Family can be together forever"
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-[12px]" style={{ color: '#7A6E5E' }}>
                            <ShieldCheck size={14} className="text-green-500 flex-shrink-0" />
                            원본 사진은 Google Drive에만 저장됩니다. 서버 저장 없음.
                        </div>
                    </div>

                    {/* Services */}
                    <div>
                        <h4 className="text-[12px] font-bold uppercase tracking-widest mb-4" style={{ color: '#7A6E5E' }}>
                            서비스
                        </h4>
                        <ul className="space-y-2.5">
                            {[
                                { label: 'AI 스마트 분류', path: '/smart-sort' },
                                { label: '$10 가족 웹사이트', path: '/family-website' },
                                { label: '실시간 사진 공유', path: '/live-sharing' },
                            ].map(item => (
                                <li key={item.path}>
                                    <button
                                        onClick={() => navigate(item.path)}
                                        className="text-[13.5px] hover:text-white transition cursor-pointer"
                                        style={{ color: '#A89880' }}
                                    >
                                        {item.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-[12px] font-bold uppercase tracking-widest mb-4" style={{ color: '#7A6E5E' }}>
                            안내
                        </h4>
                        <ul className="space-y-2.5">
                            {[
                                { label: '개인정보 처리방침', path: '/privacy' },
                                { label: '이용약관', path: '/terms' },
                            ].map(item => (
                                <li key={item.path}>
                                    <button
                                        onClick={() => navigate(item.path)}
                                        className="text-[13.5px] hover:text-white transition cursor-pointer"
                                        style={{ color: '#A89880' }}
                                    >
                                        {item.label}
                                    </button>
                                </li>
                            ))}
                            <li className="text-[13.5px]" style={{ color: '#A89880' }}>
                                <a href="mailto:ecocleanlife@gmail.com" className="hover:text-white transition">
                                    고객지원
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div
                    className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px]"
                    style={{ borderTop: '1px solid #3A2A18', color: '#5A4E3E' }}
                >
                    <span>© 2026 Orgcell. All rights reserved.</span>
                    <span className="flex items-center gap-1">
                        Made with <Heart size={11} className="text-red-400" fill="currentColor" /> for families worldwide
                    </span>
                </div>
            </div>
        </footer>
    );
}
