import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function AuthLayout({ children }) {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div style={{ backgroundColor: '#FAFAF7', minHeight: '100vh' }}>
            <header
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 28px',
                    backgroundColor: '#fff',
                    borderBottom: '1px solid #E8E3D8',
                    fontFamily: 'Georgia, serif',
                }}
            >
                <div
                    onClick={() => navigate('/home')}
                    style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#3D2008',
                        cursor: 'pointer',
                        letterSpacing: '-0.5px',
                    }}
                >
                    Orgcell
                    <span style={{ color: '#C8A040', fontSize: '1.1rem', marginLeft: 1 }}>.com</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {user?.picture && (
                        <img
                            src={user.picture}
                            alt=""
                            style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }}
                        />
                    )}
                    <span style={{ fontSize: '0.9rem', color: '#5A5A4A' }}>
                        {user?.name || '사용자'}님
                    </span>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '5px 14px',
                            borderRadius: 20,
                            border: '1px solid #3D2008',
                            background: 'transparent',
                            color: '#3D2008',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                        }}
                    >
                        로그아웃
                    </button>
                </div>
            </header>
            <main>{children}</main>
        </div>
    );
}
