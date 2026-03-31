import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function DriveCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('Google Drive 연결 중...');
    const checkDriveStatus = useAuthStore(state => state.checkDriveStatus);

    useEffect(() => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        // 연결 완료 후 돌아갈 경로 (sessionStorage에 저장된 값 또는 /home)
        const returnPath = sessionStorage.getItem('orgcell_drive_return') || '/home';

        if (error) {
            toast.error('Google Drive 연결이 거부되었습니다.');
            sessionStorage.removeItem('orgcell_drive_return');
            navigate(returnPath, { replace: true });
            return;
        }

        if (code) {
            axios.post('/api/drive/callback', { code })
                .then(res => {
                    if (res.data.success) {
                        toast.success('Google Drive가 성공적으로 연결되었습니다!');
                        checkDriveStatus();
                        sessionStorage.removeItem('orgcell_drive_return');
                        navigate(returnPath, { replace: true });
                    } else {
                        throw new Error(res.data.message || '연결 실패');
                    }
                })
                .catch(err => {
                    console.error('Drive callback error', err);
                    toast.error('Google Drive 연결 중 오류가 발생했습니다.');
                    setStatus('연결 실패. 잠시 후 다시 시도해주세요.');
                    setTimeout(() => {
                        sessionStorage.removeItem('orgcell_drive_return');
                        navigate(returnPath, { replace: true });
                    }, 3000);
                });
        } else {
            sessionStorage.removeItem('orgcell_drive_return');
            navigate(returnPath, { replace: true });
        }
    }, [searchParams, navigate, checkDriveStatus]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 text-center">
                <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
                <h2 className="text-xl font-bold dark:text-white">{status}</h2>
                <p className="text-gray-500 mt-2 text-sm">잠시만 기다려주세요...</p>
            </div>
        </div>
    );
}
