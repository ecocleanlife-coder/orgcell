import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { Menu, X, LogOut } from 'lucide-react';

const NAV_LINKS = [
    { label: '홈', path: '/home', emoji: '🏠' },
    { label: '박물관', path: '/museums', emoji: '🏛️' },
    { label: 'AI 분류', path: '/smart-sort', emoji: '🖼️' },
    { label: '실시간 공유', path: '/live-sharing', emoji: '💬' },
];

const HEADER_HEIGHT = 64;

export default function MainLayout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated, logout } = useAuthStore();
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div style={{ backgroundColor: '#FAFAF7', minHeight: '100vh', fontFamily: 'Georgia, "Noto Serif KR", serif' }}>
            {/* Fixed Header */}
            <header
                className="fixed top-0 left-0 right-0 z-50 transition-all duration-200"
                style={{
                    height: HEADER_HEIGHT,
                    background: scrolled ? 'rgba(250,250,247,0.97)' : '#FAFAF7',
                    borderBottom: scrolled ? '1px solid #E8E3D8' : '1px solid transparent',
                    boxShadow: scrolled ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
                    backdropFilter: 'blur(8px)',
                }}
            >
                <div className="max-w-[1100px] mx-auto px-5 h-full flex items-center justify-between">
                    {/* Logo */}
                    <button
                        onClick={() => navigate(isAuthenticated ? '/home' : '/')}
                        className="flex items-baseline gap-0.5 select-none cursor-pointer"
                        style={{ background: 'none', border: 'none', padding: 0 }}
                    >
                        <span
                            className="text-[26px] font-black leading-none"
                            style={{ color: '#3D2008', fontFamily: 'Georgia, serif' }}
                        >
                            Orgcell
                        </span>
                        <span
                            className="text-[17px] font-bold leading-none"
                            style={{ color: '#C8A040', fontFamily: 'Georgia, serif' }}
                        >
                            .com
                        </span>
                    </button>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        {NAV_LINKS.map(link => (
                            <button
                                key={link.path}
                                onClick={() => navigate(link.path)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13.5px] font-semibold transition-all cursor-pointer"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: location.pathname === link.path ? '#3D2008' : '#7A6E5E',
                                    backgroundColor: location.pathname === link.path ? '#EDE7D9' : 'transparent',
                                    fontFamily: 'Georgia, serif',
                                }}
                            >
                                <span className="text-[15px]">{link.emoji}</span>
                                {link.label}
                            </button>
                        ))}
                    </nav>

                    {/* Desktop Right — User Info */}
                    <div className="hidden md:flex items-center gap-3">
                        {isAuthenticated && user ? (
                            <>
                                {user.picture && (
                                    <img
                                        src={user.picture}
                                        alt=""
                                        className="w-8 h-8 rounded-full object-cover"
                                        style={{ border: '2px solid #E8E3D8' }}
                                    />
                                )}
                                <span className="text-[13px] font-semibold" style={{ color: '#5A5A4A' }}>
                                    {user.name || '사용자'}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer transition-all hover:bg-[#EDE7D9]"
                                    style={{ background: 'none', border: '1px solid #D1D1CB', color: '#7A6E5E' }}
                                >
                                    <LogOut size={13} />
                                    로그아웃
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => navigate('/')}
                                className="px-5 py-2 rounded-full text-[13.5px] font-bold text-white cursor-pointer hover:brightness-110"
                                style={{ background: 'linear-gradient(135deg, #5A9460, #4A7F4A)', border: 'none' }}
                            >
                                시작하기
                            </button>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 rounded-lg cursor-pointer"
                        style={{ color: '#3D2008', background: 'none', border: 'none' }}
                        onClick={() => setMenuOpen(v => !v)}
                    >
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </header>

            {/* Mobile Menu Dropdown */}
            {menuOpen && (
                <div
                    className="fixed top-16 left-0 right-0 z-40 md:hidden px-5 pb-5 pt-2 space-y-1"
                    style={{ background: '#FAFAF7', borderBottom: '1px solid #E8E3D8', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                >
                    {NAV_LINKS.map(link => (
                        <button
                            key={link.path}
                            onClick={() => navigate(link.path)}
                            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-[14px] font-semibold transition cursor-pointer"
                            style={{
                                color: '#3D2008',
                                background: location.pathname === link.path ? '#EDE7D9' : 'transparent',
                                border: 'none',
                                fontFamily: 'Georgia, serif',
                            }}
                        >
                            <span>{link.emoji}</span> {link.label}
                        </button>
                    ))}
                    {isAuthenticated && user && (
                        <div className="pt-2 flex items-center justify-between px-4">
                            <div className="flex items-center gap-2">
                                {user.picture && (
                                    <img src={user.picture} alt="" className="w-7 h-7 rounded-full object-cover" />
                                )}
                                <span className="text-[13px] font-semibold" style={{ color: '#5A5A4A' }}>
                                    {user.name || '사용자'}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-[13px] font-semibold cursor-pointer"
                                style={{ color: '#7A6E5E', background: 'none', border: 'none' }}
                            >
                                로그아웃
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content — padded below fixed header */}
            <main style={{ paddingTop: HEADER_HEIGHT }}>
                {children}
            </main>
        </div>
    );
}
