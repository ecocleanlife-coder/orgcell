/**
 * Visibility 관련 유틸리티 및 미들웨어
 * 프론트엔드 hooks/useVisibility.js와 동일한 로직
 */

const VALID_VISIBILITY = ['public', 'family', 'private'];

/**
 * visibility 값을 검증하고 기본값 반환
 * @param {string} vis - 입력값
 * @param {string} fallback - 기본값 (default: 'private')
 * @returns {string} 검증된 visibility
 */
function normalizeVisibility(vis, fallback = 'private') {
    return VALID_VISIBILITY.includes(vis) ? vis : fallback;
}

/**
 * 열람 가능 여부 판단
 * @param {'public'|'family'|'private'} visibility - 콘텐츠 공개범위
 * @param {'owner'|'family'|'public'} userRole - 사용자 역할
 * @returns {boolean}
 */
function canView(visibility, userRole) {
    if (userRole === 'owner') return true;
    if (visibility === 'public') return true;
    if (visibility === 'family' && userRole === 'family') return true;
    return false;
}

/**
 * Express 미들웨어: req.body.visibility를 검증/정규화
 * 사용: router.post('/...', validateVisibility('family'), controller)
 */
function validateVisibility(fallback = 'private') {
    return (req, res, next) => {
        if (req.body && req.body.visibility !== undefined) {
            req.body.visibility = normalizeVisibility(req.body.visibility, fallback);
        }
        if (req.query && req.query.visibility !== undefined) {
            req.query.visibility = normalizeVisibility(req.query.visibility, fallback);
        }
        next();
    };
}

module.exports = {
    VALID_VISIBILITY,
    normalizeVisibility,
    canView,
    validateVisibility,
};
