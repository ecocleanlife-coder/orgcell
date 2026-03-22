import { describe, it, expect } from 'vitest';

// 날짜 범위 유효성 검사 유틸
function validateDateRange(startDate, endDate) {
    if (!startDate) return { valid: false, error: 'start_date is required' };
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return { valid: false, error: 'Invalid start_date' };

    if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) return { valid: false, error: 'Invalid end_date' };
        if (end < start) return { valid: false, error: 'end_date must be after start_date' };
    }
    return { valid: true };
}

describe('Calendar Date Validation', () => {
    it('should reject missing start_date', () => {
        const result = validateDateRange(null, null);
        expect(result.valid).toBe(false);
    });

    it('should accept valid single date', () => {
        const result = validateDateRange('2026-03-21', null);
        expect(result.valid).toBe(true);
    });

    it('should accept valid date range', () => {
        const result = validateDateRange('2026-05-10', '2026-05-15');
        expect(result.valid).toBe(true);
    });

    it('should reject end_date before start_date', () => {
        const result = validateDateRange('2026-05-10', '2026-05-05');
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/end_date/);
    });

    it('should accept same start and end date', () => {
        const result = validateDateRange('2026-05-10', '2026-05-10');
        expect(result.valid).toBe(true);
    });

    it('should reject invalid date string', () => {
        const result = validateDateRange('not-a-date', null);
        expect(result.valid).toBe(false);
    });
});

describe('Lunar Calendar — 2024 Seollal', () => {
    it('should verify 2024 Seollal is February 10', () => {
        // 음력 2024년 1월 1일 = 양력 2024년 2월 10일
        // lunar-javascript 라이브러리 직접 테스트
        const { Solar } = require('lunar-javascript');
        const solar = Solar.fromYmd(2024, 2, 10);
        const lunar = solar.getLunar();
        expect(lunar.getMonth()).toBe(1);
        expect(lunar.getDay()).toBe(1);
    });

    it('should verify 2024 Chuseok is September 17', () => {
        const { Solar } = require('lunar-javascript');
        const solar = Solar.fromYmd(2024, 9, 17);
        const lunar = solar.getLunar();
        expect(lunar.getMonth()).toBe(8);
        expect(lunar.getDay()).toBe(15);
    });
});
