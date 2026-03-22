import React, { useState } from 'react';
import axios from 'axios';
import { Mail, ArrowRight, Loader, UserCheck, UserPlus } from 'lucide-react';

const T = {
    ko: {
        or: '또는',
        toggleBtn: '이메일/문자로 1초만에 시작하기',
        placeholder: '이메일 주소 입력',
        invalidEmail: '유효한 이메일을 입력해주세요.',
        sending: '전송 중...',
        submitBtn: '보안 링크 받기',
        footer: '비밀번호 없이 링크 하나로 가족 가계도로 안전하게 입장합니다.',
        successTitle: '이메일을 확인해주세요!',
        successMsg1: '주소로',
        successMsg2: '보안 로그인 링크를 보내드렸습니다.',
        successMsg3: '이 창을 닫고 메일함의 링크를 클릭해주세요.',
        failMsg: '로그인 링크 전송에 실패했습니다. 다시 시도해주세요.',
        existsTitle: '이미 가입된 이메일입니다',
        existsMsg: '으로 이미 가입되어 있습니다.',
        existsLogin: '기존 이메일로 로그인하기',
        existsOther: '다른 이메일로 시작하기',
    },
    en: {
        or: 'or',
        toggleBtn: 'Start with email in 1 second',
        placeholder: 'Enter email address',
        invalidEmail: 'Please enter a valid email.',
        sending: 'Sending...',
        submitBtn: 'Get secure link',
        footer: 'Sign in securely with a single link — no password needed.',
        successTitle: 'Check your email!',
        successMsg1: 'to',
        successMsg2: 'A secure login link has been sent.',
        successMsg3: 'Close this window and click the link in your inbox.',
        failMsg: 'Failed to send login link. Please try again.',
        existsTitle: 'Email already registered',
        existsMsg: 'is already registered.',
        existsLogin: 'Log in with this email',
        existsOther: 'Use a different email',
    },
    ja: {
        or: 'または',
        toggleBtn: 'メールで1秒で始める',
        placeholder: 'メールアドレスを入力',
        invalidEmail: '有効なメールアドレスを入力してください。',
        sending: '送信中...',
        submitBtn: 'セキュアリンクを取得',
        footer: 'パスワード不要 — リンク1つで安全にログインできます。',
        successTitle: 'メールを確認してください！',
        successMsg1: '宛に',
        successMsg2: 'セキュアログインリンクを送信しました。',
        successMsg3: 'このウィンドウを閉じ、受信トレイのリンクをクリックしてください。',
        failMsg: 'ログインリンクの送信に失敗しました。再度お試しください。',
        existsTitle: '登録済みのメールアドレスです',
        existsMsg: 'は既に登録されています。',
        existsLogin: 'このメールでログイン',
        existsOther: '別のメールで始める',
    },
    'zh-CN': {
        or: '或',
        toggleBtn: '通过邮件1秒开始',
        placeholder: '输入邮箱地址',
        invalidEmail: '请输入有效的邮箱地址。',
        sending: '发送中...',
        submitBtn: '获取安全链接',
        footer: '无需密码，通过一个链接安全登录。',
        successTitle: '请查看您的邮箱！',
        successMsg1: '已向',
        successMsg2: '发送了安全登录链接。',
        successMsg3: '请关闭此窗口并点击邮箱中的链接。',
        failMsg: '发送登录链接失败，请重试。',
        existsTitle: '邮箱已注册',
        existsMsg: '已经注册。',
        existsLogin: '使用此邮箱登录',
        existsOther: '使用其他邮箱',
    },
    es: {
        or: 'o',
        toggleBtn: 'Empieza con email en 1 segundo',
        placeholder: 'Ingresa tu correo electrónico',
        invalidEmail: 'Por favor ingresa un correo válido.',
        sending: 'Enviando...',
        submitBtn: 'Obtener enlace seguro',
        footer: 'Inicia sesión de forma segura con un solo enlace — sin contraseña.',
        successTitle: '¡Revisa tu correo!',
        successMsg1: 'a',
        successMsg2: 'Se ha enviado un enlace de inicio de sesión seguro.',
        successMsg3: 'Cierra esta ventana y haz clic en el enlace de tu bandeja.',
        failMsg: 'Error al enviar el enlace. Inténtalo de nuevo.',
        existsTitle: 'Correo ya registrado',
        existsMsg: 'ya está registrado.',
        existsLogin: 'Iniciar sesión con este correo',
        existsOther: 'Usar otro correo',
    },
};

function getLang() {
    const stored = localStorage.getItem('orgcell-lang');
    if (stored && T[stored]) return stored;
    const nav = navigator.language || 'ko';
    if (T[nav]) return nav;
    if (nav.startsWith('zh')) return 'zh-CN';
    if (nav.startsWith('ja')) return 'ja';
    if (nav.startsWith('es')) return 'es';
    if (nav.startsWith('en')) return 'en';
    return 'ko';
}

export default function MagicLinkAuth() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error, exists
    const [errorMessage, setErrorMessage] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [maskedEmail, setMaskedEmail] = useState('');

    const t = T[getLang()] || T.ko;

    const sendMagicLink = async (targetEmail) => {
        setStatus('loading');
        setErrorMessage('');

        try {
            const { data } = await axios.post('/api/auth/magic-link/request', { email: targetEmail.trim() });

            if (data.exists) {
                setMaskedEmail(data.maskedEmail || targetEmail);
                setStatus('exists');
            } else {
                setStatus('success');
            }
        } catch (err) {
            setStatus('error');
            setErrorMessage(err.response?.data?.message || t.failMsg);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !email.includes('@')) {
            setErrorMessage(t.invalidEmail);
            return;
        }
        await sendMagicLink(email);
    };

    const handleExistsLogin = async () => {
        // 기존 이메일로 로그인 — magic link 전송 후 success 표시
        setStatus('loading');
        try {
            await axios.post('/api/auth/magic-link/request', { email: email.trim() });
            setStatus('success');
        } catch (err) {
            setStatus('error');
            setErrorMessage(err.response?.data?.message || t.failMsg);
        }
    };

    const handleExistsOther = () => {
        setEmail('');
        setMaskedEmail('');
        setStatus('idle');
        setErrorMessage('');
    };

    // 이미 가입된 이메일 안내
    if (status === 'exists') {
        return (
            <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-6 text-center animate-fade-in">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserCheck className="text-amber-600" size={24} />
                </div>
                <h3 className="text-lg font-bold text-amber-900 mb-2">{t.existsTitle}</h3>
                <p className="text-sm text-amber-700 mb-5">
                    <span className="font-semibold">{maskedEmail}</span> {t.existsMsg}
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleExistsLogin}
                        className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 transition-all"
                    >
                        <Mail className="mr-2 h-4 w-4" /> {t.existsLogin}
                    </button>
                    <button
                        onClick={handleExistsOther}
                        className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-bold text-amber-700 bg-white border border-amber-300 hover:bg-amber-50 transition-all"
                    >
                        <UserPlus className="mr-2 h-4 w-4" /> {t.existsOther}
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center animate-fade-in">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="text-emerald-600" size={24} />
                </div>
                <h3 className="text-lg font-bold text-emerald-900 mb-2">{t.successTitle}</h3>
                <p className="text-sm text-emerald-700 leading-relaxed">
                    <span className="font-semibold">{email}</span> {t.successMsg1}<br />
                    {t.successMsg2}<br />
                    {t.successMsg3}
                </p>
            </div>
        );
    }

    return (
        <div className="w-full mt-6">
            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white dark:bg-gray-800 text-gray-500 font-medium">{t.or}</span>
                </div>
            </div>

            {!showForm ? (
                <button
                    onClick={() => setShowForm(true)}
                    className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all"
                >
                    <Mail className="mr-2 h-5 w-5 text-gray-500" /> {t.toggleBtn}
                </button>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-3 animate-fade-in-up">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t.placeholder}
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                            disabled={status === 'loading'}
                            autoFocus
                        />
                    </div>
                    {errorMessage && (
                        <p className="text-sm text-red-600 dark:text-red-400 text-left pl-1 animate-pulse">
                            {errorMessage}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={status === 'loading' || !email.trim()}
                        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-all"
                    >
                        {status === 'loading' ? (
                            <>
                                <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" /> {t.sending}
                            </>
                        ) : (
                            <>
                                {t.submitBtn} <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </button>
                    <p className="mt-3 text-xs text-center text-gray-500 dark:text-gray-400">
                        {t.footer}
                    </p>
                </form>
            )}
        </div>
    );
}
