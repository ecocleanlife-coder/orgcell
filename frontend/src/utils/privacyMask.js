/**
 * privacyMask.js — 비공개 인물 이름 마스킹
 *
 * privacyLevel === 'private' 인물:
 * - 성만 표시: "이○○"
 * - 또는 관계 표시: "이한봉의 부"
 *
 * @param {string} displayName - 원본 표시 이름
 * @param {string} privacyLevel - 'public' | 'family' | 'private'
 * @param {object} options
 * @param {string} options.relationLabel - 관계 라벨 (예: "이한봉의 부")
 * @param {boolean} options.isCurrentUserFamily - 현재 사용자가 가족인지
 * @returns {string} 마스킹된 이름
 */
export function maskName(displayName, privacyLevel, options = {}) {
    const { relationLabel, isCurrentUserFamily = false } = options;

    // public 또는 family(가족 멤버)면 원본 표시
    if (privacyLevel === 'public') return displayName;
    if (privacyLevel === 'family' && isCurrentUserFamily) return displayName;
    if (privacyLevel !== 'private' && privacyLevel !== 'family') return displayName;

    // family인데 가족 아닌 경우 or private → 마스킹
    // 관계 라벨이 있으면 우선 사용
    if (relationLabel) return relationLabel;

    // 성만 표시: "이○○"
    if (!displayName) return '○○';

    // 한글 이름: 첫 글자(성) + ○○
    const firstChar = displayName.charAt(0);
    const isKorean = /[\uAC00-\uD7AF]/.test(firstChar);

    if (isKorean) {
        return `${firstChar}○○`;
    }

    // 영문 이름: 첫 글자 + ***
    return `${firstChar}***`;
}

/**
 * 마스킹된 이니셜
 */
export function maskInitials(initials, privacyLevel, isCurrentUserFamily = false) {
    if (privacyLevel === 'public') return initials;
    if (privacyLevel === 'family' && isCurrentUserFamily) return initials;
    return '○';
}
