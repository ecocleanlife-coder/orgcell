import React, { useState } from 'react';
import { ShieldAlert, LogIn, MessageSquare, Image as ImageIcon, Video, Phone, Users, Plus, Upload, Link2, Send, ChevronRight, Download } from 'lucide-react';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import AdBanner from '../../components/common/AdBanner';
import FamilyBanner from '../../components/common/FamilyBanner';
import useUiStore from '../../store/uiStore';
import { getT } from '../../i18n/translations';
import { useNavigate } from 'react-router-dom';

const MOCK_MESSAGES = [
    { id: 1, sender: 'Mom', text: 'Hi family! Welcome to our new digital museum! 👋', time: '10:00 AM' },
    { id: 2, sender: 'Me', text: 'Looks great! I will upload the Hawaii trip photos here.', time: '10:05 AM' },
    { id: 3, sender: 'Dad', text: 'Can I upload videos too?', time: '10:15 AM' }
];

const MOCK_ALBUMS = [
    { id: 1, title: '2025 Summer Hawaii', photoCount: 247, type: 'group' },
    { id: 2, title: 'Grandma’s 80th', photoCount: 120, type: 'group' },
];

export default function FamilyDomainDashboard() {
    const lang = useUiStore((s) => s.lang);
    const t = getT('familyWebsite', lang);
    const lt = getT('landing', lang);
    const dt = getT('liveSharing', lang);
    const navigate = useNavigate();

    const [showConsent, setShowConsent] = useState(true);
    const [view, setView] = useState('chat'); // 'chat' or 'albums'
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState(MOCK_MESSAGES);
    const [downloadConfirm, setDownloadConfirm] = useState(false);

    const handleSendMessage = () => {
        if (!chatInput.trim()) return;
        setMessages([...messages, { id: Date.now(), sender: 'Me', text: chatInput.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        setChatInput('');
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-20">
            <FamilyBanner />
            {/* Nav Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users size={24} className="text-emerald-600 dark:text-emerald-400" />
                        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
                            Smith Family Domain
                        </h1>
                    </div>
                    <LanguageSwitcher />
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)]">
                {/* Left Column: Chat */}
                <div className="w-full md:w-1/3 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                        <h2 className="font-bold flex items-center gap-2"><MessageSquare size={18} /> Family Chat</h2>
                        <div className="flex gap-2 text-gray-500">
                            <Phone size={18} className="cursor-pointer hover:text-emerald-500 transition-colors" />
                            <Video size={18} className="cursor-pointer hover:text-emerald-500 transition-colors" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col">
                        {messages.map(m => (
                            <div key={m.id} className={`flex flex-col ${m.sender === 'Me' ? 'items-end' : 'items-start'}`}>
                                <span className="text-[10px] text-gray-500 mb-1 ml-1">{m.sender}</span>
                                <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${m.sender === 'Me' ? 'bg-emerald-500 text-white rounded-tr-none' : 'bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-tl-none'}`}>
                                    {m.text}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1">{m.time}</span>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex gap-2">
                        <button className="p-2 text-gray-400 hover:text-emerald-500 rounded-full transition-colors"><Link2 size={20} /></button>
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Type a message..." className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2 outline-none text-sm dark:text-white" />
                        <button onClick={handleSendMessage} className="p-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-full transition-colors"><Send size={18} /></button>
                    </div>
                </div>

                {/* Right Column: Shared Photos */}
                <div className="w-full md:w-2/3 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-3"><ImageIcon size={24} className="text-blue-500" /> Shared Photos</h2>
                        <button className="bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-100 transition-colors">
                            <Plus size={16} /> New Album
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {MOCK_ALBUMS.map(album => (
                            <button key={album.id} onClick={() => setDownloadConfirm(true)} className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 text-left hover:border-blue-300 transition-all group flex items-start gap-4">
                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                                    <ImageIcon size={28} />
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <h3 className="font-bold text-gray-900 dark:text-white truncate text-lg group-hover:text-blue-600 transition-colors">{album.title}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{album.photoCount} photos</p>
                                </div>
                                <ChevronRight className="text-gray-300 group-hover:text-blue-500 mt-2" />
                            </button>
                        ))}
                    </div>

                    <div className="mt-auto pt-6">
                        <AdBanner />
                    </div>
                </div>
            </main>

            {/* Admin Privacy Consent Modal */}
            {showConsent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative border border-gray-100 dark:border-gray-700 text-center animate-fade-in-up">
                        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-amber-50 dark:border-amber-900/10">
                            <ShieldAlert size={36} className="text-amber-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{lt.adminConsentTitle}</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                            {lt.adminConsentDesc}
                        </p>
                        <button onClick={() => setShowConsent(false)}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/25 transition-all outline-none flex items-center justify-center gap-2">
                            <LogIn size={20} /> {lt.adminConsentAccept}
                        </button>
                    </div>
                </div>
            )}

            {/* Download Destination Modal */}
            {downloadConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-fade-in-up">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white"><Download size={20} className="text-emerald-500" /> {dt.downloadOptionsTitle}</h3>
                        <div className="space-y-3">
                            <button onClick={() => setDownloadConfirm(false)} className="w-full text-left p-4 rounded-xl border-2 border-transparent hover:border-emerald-500 bg-gray-50 dark:bg-gray-900 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-bold transition-all text-gray-800 dark:text-gray-200">
                                📱 {dt.downloadOptionsDevice}
                            </button>
                            <button onClick={() => setDownloadConfirm(false)} className="w-full text-left p-4 rounded-xl border-2 border-transparent hover:border-emerald-500 bg-gray-50 dark:bg-gray-900 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-bold transition-all text-gray-800 dark:text-gray-200">
                                ☁️ {dt.downloadOptionsFolder}
                            </button>
                            <button onClick={() => setDownloadConfirm(false)} className="w-full text-left p-4 rounded-xl border-2 border-transparent hover:border-emerald-500 bg-gray-50 dark:bg-gray-900 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-bold transition-all text-gray-800 dark:text-gray-200">
                                ✨ {dt.downloadOptionsBoth}
                            </button>
                        </div>
                        <button onClick={() => setDownloadConfirm(false)} className="w-full mt-4 py-3 text-gray-500 hover:text-gray-700 font-bold">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
