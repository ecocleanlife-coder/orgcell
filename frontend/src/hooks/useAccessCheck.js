/**
 * useAccessCheck.js — 전시관 접근 권한 확인 훅
 *
 * 인물의 privacy 설정에 따라 접근 가능 여부를 API로 확인
 * - granted: 접근 가능
 * - denied: 접근 불가 (요청 가능)
 * - pending: 요청 대기 중
 * - refused: 완전 비공개 (요청 불가)
 */
import { useState, useCallback } from 'react';
import axios from 'axios';

export default function useAccessCheck(siteId) {
    const [checking, setChecking] = useState(false);
    const [accessResult, setAccessResult] = useState(null);

    const checkAccess = useCallback(async (personId) => {
        if (!siteId || !personId) return null;
        setChecking(true);
        try {
            const res = await axios.get(`/api/access/${siteId}/${personId}/check`);
            const result = res.data?.data || { access: 'denied', level: 'unknown' };
            setAccessResult(result);
            return result;
        } catch (err) {
            console.error('[useAccessCheck] check failed:', err);
            setAccessResult({ access: 'denied', level: 'error' });
            return { access: 'denied', level: 'error' };
        } finally {
            setChecking(false);
        }
    }, [siteId]);

    const requestAccess = useCallback(async (personId, message = '') => {
        if (!siteId || !personId) return null;
        try {
            const res = await axios.post(`/api/access/${siteId}/${personId}/request`, {
                message,
                requestType: 'view',
            });
            setAccessResult({ access: 'pending', level: 'requested' });
            return res.data?.data || null;
        } catch (err) {
            console.error('[useAccessCheck] request failed:', err);
            return null;
        }
    }, [siteId]);

    const clearAccess = useCallback(() => {
        setAccessResult(null);
    }, []);

    return { checking, accessResult, checkAccess, requestAccess, clearAccess };
}
