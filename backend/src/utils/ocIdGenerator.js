const crypto = require('crypto');

// 혼동 방지: O/0, I/1, L 제외 (30자)
const CHARS = '23456789ABCDEFGHJKNPQRSTUVWXYZ';
const ID_LENGTH = 5;

// 언어 → 국가코드 매핑
const LANG_COUNTRY = {
    ko: 'KR',
    ja: 'JP',
    zh: 'CN',
    'zh-CN': 'CN',
    'zh-TW': 'TW',
};

function generateRandomPart() {
    const bytes = crypto.randomBytes(ID_LENGTH);
    let result = '';
    for (let i = 0; i < ID_LENGTH; i++) {
        result += CHARS[bytes[i] % CHARS.length];
    }
    return result;
}

/**
 * 국가코드 결정
 * @param {string} lang - Accept-Language 또는 사용자 언어 설정
 * @param {string} geoCountry - GeoIP 국가코드 (CloudFlare CF-IPCountry 등)
 * @returns {string} 2자리 국가코드
 */
function resolveCountryCode(lang, geoCountry) {
    if (lang) {
        const primary = lang.split(',')[0].split(';')[0].trim().toLowerCase();
        const base = primary.split('-')[0];
        if (LANG_COUNTRY[primary]) return LANG_COUNTRY[primary];
        if (LANG_COUNTRY[base]) return LANG_COUNTRY[base];
        // 영어/스페인어 → 접속지 IP 기반
        if ((base === 'en' || base === 'es') && geoCountry) {
            return geoCountry.toUpperCase();
        }
    }
    return geoCountry ? geoCountry.toUpperCase() : 'XX';
}

/**
 * oc_id 생성 (중복 시 최대 5회 재시도)
 * @param {object} pool - PostgreSQL pool
 * @param {string} countryCode - 2자리 국가코드
 * @returns {string} 예: KR-A3K7B
 */
async function generateOcId(pool, countryCode = 'XX') {
    const cc = (countryCode || 'XX').toUpperCase().slice(0, 2);
    for (let attempt = 0; attempt < 5; attempt++) {
        const id = `${cc}-${generateRandomPart()}`;
        const { rows } = await pool.query(
            'SELECT 1 FROM persons WHERE oc_id = $1 LIMIT 1',
            [id]
        );
        if (rows.length === 0) return id;
    }
    throw new Error('oc_id 생성 실패: 5회 시도 후 모두 중복');
}

/**
 * 기존 인물에 oc_id 일괄 부여
 * @param {object} pool - PostgreSQL pool
 * @param {string} defaultCountry - 기본 국가코드
 */
async function backfillOcIds(pool, defaultCountry = 'KR') {
    const { rows } = await pool.query(
        'SELECT id, birth_country, residence_country FROM persons WHERE oc_id IS NULL'
    );
    for (const row of rows) {
        const cc = row.birth_country || row.residence_country || defaultCountry;
        const ocId = await generateOcId(pool, cc);
        await pool.query('UPDATE persons SET oc_id = $1 WHERE id = $2', [ocId, row.id]);
    }
    return rows.length;
}

module.exports = { generateOcId, resolveCountryCode, backfillOcIds };
