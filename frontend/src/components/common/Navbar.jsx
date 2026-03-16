import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import useAuthStore from '../../store/authStore';
import { Menu, X } from 'lucide-react';

export default function Navbar({ onCtaClick }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const token = useAuthStore(s => s.token);
    const logout = useAuthStore(s => s.logout);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    const NAV_LINKS = [
        { label: t('navbar.smartSort'), path: '/smart-sort', emoji: '🖼️' },
        { label: t('navbar.familyWebsite'), path: '/family-website', emoji: '🏛️' },
        { label: t('navbar.liveSharing'), path: '/live-sharing', emoji: '💬' },
    ];

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const handleCta = () => {
        if (token) {
            navigate('/');
        } else if (onCtaClick) {
            onCtaClick();
        } else {
            navigate('/');
            setTimeout(() => {
                document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
        setMenuOpen(false);
    };

    return (
        <nav
            className="sticky top-0 z-50 transition-all duration-200"
            style={{
                background: scrolled ? 'rgba(250,250,247,0.97)' : '#FAFAF7',
                borderBottom: scrolled ? '1px solid #E8E3D8' : '1px solid transparent',
                boxShadow: scrolled ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
                backdropFilter: 'blur(8px)',
            }}
        >
            <div className="max-w-[1040px] mx-auto px-5 h-16 flex items-center justify-between">
                {/* Logo */}
                <button
                    onClick={() => navigate('/')}
                    className="flex items-baseline gap-1 select-none cursor-pointer"
                >
                    <span
                        className="text-[26px] font-black text-[#3D2008] leading-none"
                        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                        Orgcell
                    </span>
                    <span
                        className="text-[17px] font-bold text-[#8a7040] leading-none"
                        style={{ fontFamily: 'Georgia, serif' }}
                    >
                        .com
                    </span>
                </button>

                {/* Desktop Nav Links */}
                <div className="hidden md:flex items-center gap-1">
                    {NAV_LINKS.map(link => (
                        <button
                            key={link.path}
                            onClick={() => navigate(link.path)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13.5px] font-semibold transition-all cursor-pointer"
                            style={{
                                color: location.pathname === link.path ? '#3D2008' : '#7A6E5E',
                                background: location.pathname === link.path ? '#EDE7D9' : 'transparent',
                            }}
                        >
                            <span className="text-[15px]">{link.emoji}</span>
                            {link.label}
                        </button>
                    ))}
                </div>

                {/* Desktop Right */}
                <div className="hidden md:flex items-center gap-3">
                    <LanguageSwitcher />
                    {token ? (
                        <button
                            onClick={logout}
                            className="text-[13px] font-semibold text-[#7A6E5E] hover:text-[#3D2008] transition cursor-pointer"
                        >
                            {t('navbar.logout')}
                        </button>
                    ) : (
                        <button
                            onClick={handleCta}
                            className="px-5 py-2 rounded-full text-[13.5px] font-bold text-white transition-all cursor-pointer hover:brightness-110 active:scale-95"
                            style={{ background: 'linear-gradient(135deg, #5A9460, #4A7F4A)' }}
                        >
                            {t('navbar.startFree')}
                        </button>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 rounded-lg text-[#3D2008] cursor-pointer"
                    onClick={() => setMenuOpen(v => !v)}
                >
                    {menuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
                <div
                    className="md:hidden px-5 pb-5 space-y-1"
                    style={{ background: '#FAFAF7', borderTop: '1px solid #E8E3D8' }}
                >
                    {NAV_LINKS.map(link => (
                        <button
                            key={link.path}
                            onClick={() => { navigate(link.path); setMenuOpen(false); }}
                            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-[14px] font-semibold text-[#3D2008] hover:bg-[#EDE7D9] transition cursor-pointer"
                        >
                            <span>{link.emoji}</span> {link.label}
                        </button>
                    ))}
                    <div className="pt-2 flex gap-2">
                        <div className="flex-1"><LanguageSwitcher /></div>
                        {!token && (
                            <button
                                onClick={handleCta}
                                className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-white cursor-pointer"
                                style={{ background: 'linear-gradient(135deg, #5A9460, #4A7F4A)' }}
                            >
                                {t('navbar.startFree')}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
