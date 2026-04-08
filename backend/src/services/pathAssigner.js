/**
 * pathAssigner.js — OPS §26-1 인물 경로 자동 배정
 *
 * anchor의 canonical path를 기준으로 relation_key에 따라
 * 새 인물의 OPS path를 결정하고 person_paths에 저장한다.
 *
 * 경로 규칙 (§26-1):
 *   부(父)        → {anchor}/f
 *   모(母)        → {anchor}/m
 *   친부(입양)    → {anchor}/bf
 *   친모(입양)    → {anchor}/bm
 *   아들          → {anchor}/s1, s2, s3 ...  (생성 순서)
 *   딸            → {anchor}/d1, d2, d3 ...
 *   형/제(남형제) → {anchor}/b1, b2, b3 ...
 *   자매(여형제)  → {anchor}/si1, si2, si3 ...
 *   아내(배우자)  → {anchor}/w
 *   남편(배우자)  → {anchor}/h
 */

const UNIQUE_SEGMENTS = {
  father:         'f',
  mother:         'm',
  'birth-father': 'bf',
  'birth-mother': 'bm',
  spouse_wife:    'w',
  spouse_husband: 'h',
};

const NUMBERED_PREFIXES = {
  son:      's',
  daughter: 'd',
  hyeong:   'b',   // 형 (남자 형제)
  je:       'b',   // 제 (남자 형제 — b2, b3 ...)
  sister:   'si',  // 자매
};

/**
 * anchor 인물의 canonical path 조회
 */
async function getAnchorPath(db, anchorPersonId) {
  const { rows } = await db.query(
    `SELECT path FROM person_paths WHERE person_id = $1 AND is_canonical = TRUE LIMIT 1`,
    [anchorPersonId]
  );
  return rows[0]?.path || null;
}

/**
 * 번호형 path 다음 번호 결정
 * 예: prefix='s', anchorPath='lee' → 기존 lee/s1 있으면 lee/s2
 */
async function nextNumberedPath(db, anchorPath, prefix) {
  const { rows } = await db.query(
    `SELECT path FROM person_paths
     WHERE path ~ $1
     ORDER BY path ASC`,
    [`^${anchorPath}/${prefix}[0-9]+$`]
  );
  return `${anchorPath}/${prefix}${rows.length + 1}`;
}

/**
 * OPS path 배정 및 person_paths 저장
 *
 * @param {object} db        - DB pool/client
 * @param {string} newPersonId   - 새로 생성된 person_id
 * @param {string} anchorPersonId - 기준 인물 person_id
 * @param {string} relationKey    - 'father' | 'mother' | 'son' | 'daughter' | 'hyeong' | 'je' | 'sister' | 'birth-father' | 'birth-mother' | 'spouse_wife' | 'spouse_husband'
 * @param {string} createdBy     - 등록한 관장 person_id
 * @returns {string} 배정된 path
 */
async function assignPath(db, newPersonId, anchorPersonId, relationKey, createdBy = null) {
  const anchorPath = await getAnchorPath(db, anchorPersonId);
  if (!anchorPath) {
    throw new Error(`anchor ${anchorPersonId}의 canonical path가 없습니다`);
  }

  let assignedPath;

  if (UNIQUE_SEGMENTS[relationKey] !== undefined) {
    // 고유 path (부/모/배우자 등)
    assignedPath = `${anchorPath}/${UNIQUE_SEGMENTS[relationKey]}`;
  } else if (NUMBERED_PREFIXES[relationKey] !== undefined) {
    // 번호형 path (아들/딸/형제 등)
    assignedPath = await nextNumberedPath(db, anchorPath, NUMBERED_PREFIXES[relationKey]);
  } else {
    throw new Error(`알 수 없는 relation_key: ${relationKey}`);
  }

  // person_paths 삽입 (중복 시 기존 유지)
  await db.query(
    `INSERT INTO person_paths (path, person_id, is_canonical, created_by)
     VALUES ($1, $2, TRUE, $3)
     ON CONFLICT (path) DO NOTHING`,
    [assignedPath, newPersonId, createdBy]
  );

  return assignedPath;
}

/**
 * 관장(curator) canonical path 배정 — 박물관 생성 시 호출
 * path = subdomain (예: 'lee')
 */
async function assignCuratorPath(db, personId, subdomain, createdBy = null) {
  await db.query(
    `INSERT INTO person_paths (path, person_id, is_canonical, created_by)
     VALUES ($1, $2, TRUE, $3)
     ON CONFLICT (path) DO NOTHING`,
    [subdomain, personId, createdBy]
  );
  return subdomain;
}

module.exports = { assignPath, assignCuratorPath, getAnchorPath };
