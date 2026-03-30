import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function FamilySearchCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('처리 중...');

    useEffect(() => {
        const code = searchParams.get('code');
        if (!code) {
            setStatus('인증 코드가 없습니다.');
            return;
        }

        axios.post('/api/familysearch/callback', { code })
            .then(() => {
                setStatus('FamilySearch 연결 완료!');
                setTimeout(() => navigate(-1), 1500);
            })
            .catch(err => {
                console.error('FS callback error:', err);
                setStatus('연결에 실패했습니다. 다시 시도해주세요.');
            });
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF7' }}>
            <div className="bg-white rounded-2xl border border-[#E8E3D8] p-8 text-center max-w-sm">
                <h2 className="text-[20px] font-bold text-[#3D2008] mb-3">FamilySearch</h2>
                <p className="text-[15px] text-[#5A5A4A]">{status}</p>
            </div>
        </div>
    );
}
