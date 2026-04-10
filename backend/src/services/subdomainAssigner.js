// subdomainAssigner.js
// §26-1-1: Subdomain 자동배정 서비스
//
// 배정 결과 형식:
//   한국인 + 본관 확정:  LEE006-3
//   한국인 + 본관 미확정: LEE-1
//   외국인:              LAMBERT-2
//
// seq_counter는 FOR UPDATE 락으로 atomic 채번

const db = require('../config/db');

/**
 * Subdomain 자동배정 진입점
 * @param {object} opts
 * @param {string} opts.surnameKo   - 한글 성씨 (예: '이')
 * @param {string} [opts.bonGwanKo] - 한글 본관 (예: '덕수'), 없으면 미확정
 * @param {string} [opts.surnameEn] - 영문 성씨 (외국인 전용, 예: 'LAMBERT')
 * @param {string} [opts.nationality] - 'KR' | 기타. 기본 'KR'
 * @returns {Promise<string>} 배정된 subdomain (예: 'LEE006-3')
 */
async function assignSubdomain({ surnameKo, bonGwanKo = null, surnameEn = null, nationality = 'KR' }) {
    if (nationality !== 'KR') {
        const en = (surnameEn || surnameKo || 'UNKNOWN').toUpperCase().replace(/[^A-Z]/g, '');
        return _assignForeign(en);
    }
    return _assignKorean(surnameKo, bonGwanKo);
}

// ── 한국인 ─────────────────────────────────────────────────────────────────

async function _assignKorean(surnameKo, bonGwanKo) {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        let row;
        if (bonGwanKo) {
            // 본관 확정 row 조회 + 락
            const res = await client.query(
                `SELECT id, surname_en, code, seq_counter
                 FROM korean_surnames
                 WHERE surname_ko = $1 AND bon_gwan_ko = $2
                 FOR UPDATE`,
                [surnameKo, bonGwanKo]
            );
            if (res.rows.length > 0) {
                row = res.rows[0];
            } else {
                // DB 미등록 본관 → 새 row 동적 삽입
                row = await _insertNewBonGwan(client, surnameKo, bonGwanKo);
            }
        } else {
            // 본관 미확정 row (code IS NULL)
            const res = await client.query(
                `SELECT id, surname_en, code, seq_counter
                 FROM korean_surnames
                 WHERE surname_ko = $1 AND code IS NULL
                 FOR UPDATE`,
                [surnameKo]
            );
            if (res.rows.length > 0) {
                row = res.rows[0];
            } else {
                // 시드에 없는 성씨 — 미확정 row 신규 생성
                row = await _insertNoParenthesisRow(client, surnameKo);
            }
        }

        // seq_counter 증가
        const newSeq = row.seq_counter + 1;
        await client.query(
            'UPDATE korean_surnames SET seq_counter = $1 WHERE id = $2',
            [newSeq, row.id]
        );

        await client.query('COMMIT');

        // 결과 조합
        if (row.code) {
            return `${row.surname_en}${row.code}-${newSeq}`;  // LEE006-3
        } else {
            return `${row.surname_en}-${newSeq}`;             // LEE-1
        }
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function _insertNewBonGwan(client, surnameKo, bonGwanKo) {
    // 해당 surname의 기존 code 중 최대값 조회 후 +1
    const maxRes = await client.query(
        `SELECT MAX(code::INTEGER) AS max_code, MAX(surname_en) AS surname_en
         FROM korean_surnames
         WHERE surname_ko = $1 AND code IS NOT NULL`,
        [surnameKo]
    );
    const maxCode = maxRes.rows[0].max_code || 0;
    const surnameEn = maxRes.rows[0].surname_en || _romanizeSurname(surnameKo);
    const newCode = String(maxCode + 1).padStart(3, '0');

    const ins = await client.query(
        `INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, code, seq_counter)
         VALUES ($1, $2, $3, $4, 0)
         RETURNING id, surname_en, code, seq_counter`,
        [surnameKo, surnameEn, bonGwanKo, newCode]
    );
    return ins.rows[0];
}

async function _insertNoParenthesisRow(client, surnameKo) {
    const surnameEn = _romanizeSurname(surnameKo);
    const ins = await client.query(
        `INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, code, seq_counter)
         VALUES ($1, $2, NULL, NULL, 0)
         ON CONFLICT DO NOTHING
         RETURNING id, surname_en, code, seq_counter`,
        [surnameKo, surnameEn]
    );
    if (ins.rows.length > 0) return ins.rows[0];
    // 동시 삽입 경합 → 재조회
    const sel = await client.query(
        `SELECT id, surname_en, code, seq_counter
         FROM korean_surnames
         WHERE surname_ko = $1 AND code IS NULL FOR UPDATE`,
        [surnameKo]
    );
    return sel.rows[0];
}

// ── 외국인 ─────────────────────────────────────────────────────────────────

async function _assignForeign(surnameEn) {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // UPSERT + 락
        await client.query(
            `INSERT INTO foreign_surnames (surname_en, seq_counter)
             VALUES ($1, 0)
             ON CONFLICT (surname_en) DO NOTHING`,
            [surnameEn]
        );
        const res = await client.query(
            `SELECT id, seq_counter FROM foreign_surnames
             WHERE surname_en = $1 FOR UPDATE`,
            [surnameEn]
        );
        const row = res.rows[0];
        const newSeq = row.seq_counter + 1;
        await client.query(
            'UPDATE foreign_surnames SET seq_counter = $1 WHERE id = $2',
            [newSeq, row.id]
        );

        await client.query('COMMIT');
        return `${surnameEn}-${newSeq}`;  // LAMBERT-2
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// ── 본관 확정 → subdomain 일괄변환 ──────────────────────────────────────────

/**
 * 본관 미확정(LEE-1) → 확정(LEE006-M) 으로 전환
 * - family_sites.subdomain 업데이트
 * - 하위 oc_id 경로 prefix 일괄변환
 * - bon_gwan_confirmed = true
 *
 * @param {number} siteId
 * @param {string} surnameKo
 * @param {string} bonGwanKo
 * @returns {Promise<{oldSubdomain: string, newSubdomain: string}>}
 */
async function confirmBonGwan(siteId, surnameKo, bonGwanKo) {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 현재 사이트 subdomain + 본관 상태 조회
        const siteRes = await client.query(
            `SELECT subdomain, bon_gwan_confirmed, subdomain_prefix
             FROM family_sites WHERE id = $1 FOR UPDATE`,
            [siteId]
        );
        if (siteRes.rows.length === 0) throw new Error('Site not found');
        const site = siteRes.rows[0];

        if (site.bon_gwan_confirmed) {
            throw new Error('본관이 이미 확정되어 있습니다.');
        }

        // 새 subdomain 채번
        const newSubdomain = await _assignKorean(surnameKo, bonGwanKo);
        const newPrefix = newSubdomain.replace(/-\d+$/, '');
        const oldSubdomain = site.subdomain;

        // family_sites 업데이트
        await client.query(
            `UPDATE family_sites
             SET subdomain = $1, subdomain_prefix = $2, bon_gwan_confirmed = TRUE
             WHERE id = $3`,
            [newSubdomain, newPrefix, siteId]
        );

        // persons.oc_id 경로 prefix 일괄변환
        // 형식: 'LEE-1/s1/d2/...' → 'LEE006-3/s1/d2/...'
        if (oldSubdomain) {
            await client.query(
                `UPDATE persons
                 SET oc_id = $1 || substring(oc_id FROM length($2) + 1)
                 WHERE site_id = $3
                   AND oc_id LIKE $4`,
                [newSubdomain, oldSubdomain, siteId, oldSubdomain + '%']
            );
        }

        await client.query('COMMIT');
        return { oldSubdomain, newSubdomain };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// ── 유틸 ───────────────────────────────────────────────────────────────────

// 간단 로마자 매핑 (DB 미등록 성씨 폴백용)
const ROMANIZE_MAP = {
    '가':'GA','강':'KANG','고':'KO','곽':'KWAK','구':'KOO','권':'KWON',
    '김':'KIM','남':'NAM','노':'RO','류':'RYU','문':'MOON','민':'MIN',
    '박':'PARK','배':'BAE','백':'BAEK','서':'SEO','성':'SUNG','손':'SON',
    '송':'SONG','신':'SHIN','심':'SHIM','안':'AHN','양':'YANG','오':'OH',
    '우':'WOO','유':'YOO','윤':'YOON','이':'LEE','임':'LIM','장':'JANG',
    '전':'JEON','정':'JUNG','조':'CHO','주':'JU','차':'CHA','최':'CHOI',
    '하':'HA','한':'HAN','허':'HEO','홍':'HONG','황':'HWANG',
};

function _romanizeSurname(surnameKo) {
    if (ROMANIZE_MAP[surnameKo]) return ROMANIZE_MAP[surnameKo];
    // ASCII 알파벳만 허용 — 미등록 한글은 'UNKNOWN'으로 폴백 (잘못된 subdomain 방지)
    const ascii = surnameKo.toUpperCase().replace(/[^A-Z]/g, '');
    return ascii.length > 0 ? ascii : 'UNKNOWN';
}

/**
 * 성씨 + 본관 조회 (프론트 자동완성용)
 * @param {string} surnameKo
 * @returns {Promise<Array<{bon_gwan_ko, bon_gwan_en, code}>>}
 */
async function getBonGwanList(surnameKo) {
    const res = await db.query(
        `SELECT bon_gwan_ko, bon_gwan_en, code
         FROM korean_surnames
         WHERE surname_ko = $1 AND code IS NOT NULL
         ORDER BY population_rank ASC NULLS LAST`,
        [surnameKo]
    );
    return res.rows;
}

/**
 * seq_counter 1 감소 (박물관 생성 실패 시 롤백용)
 * @param {string} subdomain - 반환된 subdomain (예: 'LEE011-5')
 */
async function rollbackSeqCounter(subdomain) {
    if (!subdomain) return;
    // LEE011-5 → surnameEn='LEE011', seq=5  /  LEE-3 → surnameEn='LEE', seq=3
    const match = subdomain.toUpperCase().match(/^([A-Z0-9]+)-(\d+)$/);
    if (!match) return;
    const [, prefix, seqStr] = match;
    const seq = parseInt(seqStr, 10);
    if (seq <= 0) return;

    try {
        // korean_surnames (code 포함 형식: LEE011)  또는 code IS NULL 형식: LEE
        const codeMatch = prefix.match(/^([A-Z]+)(\d{3})$/);
        if (codeMatch) {
            const [, surnameEn, code] = codeMatch;
            await db.query(
                `UPDATE korean_surnames SET seq_counter = GREATEST(seq_counter - 1, 0)
                 WHERE surname_en = $1 AND code = $2 AND seq_counter = $3`,
                [surnameEn, code, seq]
            );
        } else {
            // 본관 미확정 (code IS NULL) or 외국인
            await db.query(
                `UPDATE korean_surnames SET seq_counter = GREATEST(seq_counter - 1, 0)
                 WHERE surname_en = $1 AND code IS NULL AND seq_counter = $2`,
                [prefix, seq]
            );
            // 외국인 테이블 시도
            await db.query(
                `UPDATE foreign_surnames SET seq_counter = GREATEST(seq_counter - 1, 0)
                 WHERE surname_en = $1 AND seq_counter = $2`,
                [prefix, seq]
            );
        }
    } catch (err) {
        console.error('[subdomainAssigner] rollbackSeqCounter failed:', err.message);
    }
}

module.exports = { assignSubdomain, confirmBonGwan, getBonGwanList, rollbackSeqCounter };
