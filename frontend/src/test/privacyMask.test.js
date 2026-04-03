import { describe, it, expect } from 'vitest';
import { maskName, maskInitials } from '../utils/privacyMask';

describe('maskName', () => {
    it('public → 원본 표시', () => {
        expect(maskName('이한봉', 'public')).toBe('이한봉');
    });

    it('family + 가족 → 원본 표시', () => {
        expect(maskName('이한봉', 'family', { isCurrentUserFamily: true })).toBe('이한봉');
    });

    it('family + 비가족 → 마스킹', () => {
        expect(maskName('이한봉', 'family', { isCurrentUserFamily: false })).toBe('이○○');
    });

    it('private 한글 → 성○○', () => {
        expect(maskName('이한봉', 'private')).toBe('이○○');
        expect(maskName('공우영', 'private')).toBe('공○○');
        expect(maskName('김', 'private')).toBe('김○○');
    });

    it('private 영문 → 첫글자***', () => {
        expect(maskName('John Lambert', 'private')).toBe('J***');
        expect(maskName('Daniel Lee', 'private')).toBe('D***');
    });

    it('private + relationLabel → 관계 라벨 우선', () => {
        expect(maskName('이순호', 'private', { relationLabel: '이한봉의 부' })).toBe('이한봉의 부');
    });

    it('빈 이름 → ○○', () => {
        expect(maskName('', 'private')).toBe('○○');
    });

    it('undefined privacyLevel → 원본', () => {
        expect(maskName('이한봉', undefined)).toBe('이한봉');
    });
});

describe('maskInitials', () => {
    it('public → 원본', () => {
        expect(maskInitials('이한', 'public')).toBe('이한');
    });

    it('private → ○', () => {
        expect(maskInitials('이한', 'private')).toBe('○');
    });

    it('family + 가족 → 원본', () => {
        expect(maskInitials('이한', 'family', true)).toBe('이한');
    });

    it('family + 비가족 → ○', () => {
        expect(maskInitials('이한', 'family', false)).toBe('○');
    });
});
