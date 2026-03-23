import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function OneDriveCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('OneDrive 연결 중...');

    useEffect(() => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
            toast.error('OneDrive 연결이 거부되었습니다.');
            navigate('/family-setup', { replace: true });
            return;
        }

        if (code) {
            axios.post('/api/onedrive/callback', { code })
                .then(res => {
                    if (res.data.success) {
                        toast.success('OneDrive가 성공적으로 연결되었습니다!');
                        navigate('/family-setup', { replace: true });
                    } else {
                        throw new Error(res.data.message || '연결 실패');
                    }
                })
                .catch(err => {
                    console.error('OneDrive callback error', err);
                    toast.error('OneDrive 연결 중 오류가 발생했습니다.');
                    setStatus('연결 실패. 잠시 후 다시 시도해주세요.');
                    setTimeout(() => navigate('/family-setup', { replace: true }), 3000);
                });
        } else {
            navigate('/family-setup', { replace: true });
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF7' }}>
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center" style={{ border: '1px solid #e8e0d0' }}>
                <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
                <h2 className="text-xl font-bold text-[#3D2008]">{status}</h2>
                <p className="text-[#7A6E5E] mt-2 text-sm">잠시만 기다려주세요...</p>
            </div>
        </div>
    );
}
