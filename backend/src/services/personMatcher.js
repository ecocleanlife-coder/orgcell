/**
 * personMatcher.js — OPS §26-3 자동 통합 정책 (선점 원칙)
 *
 * 새 인물 등록 또는 신규 가입 시 자동 호출.
 * 먼저 생성된 person_id가 canonical — 나중 path는 alias로 흡수.
 *
 * 매칭 우선순위:
 *   1. [최강] 부모 2명 모두 일치 → 이름 달라도 자동 통합
 *   2. [강력] 형제 2명 이상 일치 → 자동 통합
 *   3. [일반] 이름 + 생년월일 + 보조 1개 이상 → 자동 통합
 *   4. [보류] 이름 + 생년월일만 일치 → match_status = 'pending'
 */

const db = require('../config/db');

// ─────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────

/**
 * 신규 인물 등록/가입 시 호출.
 * @param {object} candidate - 매칭 대상 인물 데이터
 * @param {string} candidate.person_id      - 신규 person_id
 * @param {string} candidate.name
 * @param {string} [candidate.birth_date]   - 'YYYY-MM-DD'
 * @param {string} [candidate.gender]
 * @param {string} [candidate.phone]
 * @param {string} [candidate.email]
 * @param {string} [candidate.new_path]     - 등록 시 부여된 경로
 * @param {string} [candidate.created_by]   - 등록한 관장 person_id
 * @returns {{ action: 'merged'|'pending'|'none', canonical_id?: string }}
 */
async function matchAndMerge(candidate) {
  const existing = await findCandidates(candidate);
  if (existing.length === 0) return { action: 'none' };

  // 우선순위 1: 부모 2명 모두 일치
  const byParents = await matchByBothParents(candidate, existing);
  if (byParents) return merge(byParents, candidate);

  // 우선순위 2: 형제 2명 이상 일치
  const bySiblings = await matchBySiblings(candidate, existing);
  if (bySiblings) return merge(bySiblings, candidate);

  // 우선순위 3: 이름 + 생년월일 + 보조 1개 이상
  const byGeneral = matchByGeneral(candidate, existing);
  if (byGeneral) return merge(byGeneral, candidate);

  // 우선순위 4: 이름 + 생년월일만 → 보류
  const byNameDate = existing.find(
    (p) => p.name === candidate.name && p.birth_date === candidate.birth_date
  );
  if (byNameDate) {
    await setPending(candidate.person_id);
    return { action: 'pending', canonical_id: byNameDate.person_id };
  }

  return { action: 'none' };
}

// ─────────────────────────────────────────────
// 내부 함수
// ─────────────────────────────────────────────

/** 이름 또는 생년월일 기준으로 1차 후보군 조회 */
async function findCandidates(candidate) {
  const { rows } = await db.query(
    `SELECT p.person_id, p.name, p.birth_date, p.gender, p.phone, p.email
     FROM persons p
     WHERE p.person_id <> $1
       AND p.match_status <> 'pending'
       AND (p.name = $2 OR p.birth_date = $3)`,
    [candidate.person_id, candidate.name, candidate.birth_date]
  );
  return rows;
}

/** 우선순위 1: 부모 2명 모두 일치하는 기존 인물 탐색 */
async function matchByBothParents(candidate, existingList) {
  // candidate의 부모 person_id 목록
  const { rows: candidateParents } = await db.query(
    `SELECT pr.person_id_b AS parent_id
     FROM person_relations pr
     WHERE pr.person_id_a = $1 AND pr.relation_type = 'parent-child'`,
    [candidate.person_id]
  );
  if (candidateParents.length < 2) return null;

  const parentIds = candidateParents.map((r) => r.parent_id);

  for (const existing of existingList) {
    const { rows: existingParents } = await db.query(
      `SELECT pr.person_id_b AS parent_id
       FROM person_relations pr
       WHERE pr.person_id_a = $1 AND pr.relation_type = 'parent-child'`,
      [existing.person_id]
    );
    const existingParentIds = existingParents.map((r) => r.parent_id);
    const matchCount = parentIds.filter((id) => existingParentIds.includes(id)).length;
    if (matchCount >= 2) return existing;
  }
  return null;
}

/** 우선순위 2: 형제 2명 이상 일치하는 기존 인물 탐색 */
async function matchBySiblings(candidate, existingList) {
  const { rows: candidateSiblings } = await db.query(
    `SELECT pr.person_id_b AS sibling_id
     FROM person_relations pr
     WHERE pr.person_id_a = $1 AND pr.relation_type = 'sibling'`,
    [candidate.person_id]
  );
  if (candidateSiblings.length < 2) return null;

  const siblingIds = candidateSiblings.map((r) => r.sibling_id);

  for (const existing of existingList) {
    const { rows: existingSiblings } = await db.query(
      `SELECT pr.person_id_b AS sibling_id
       FROM person_relations pr
       WHERE pr.person_id_a = $1 AND pr.relation_type = 'sibling'`,
      [existing.person_id]
    );
    const existingSiblingIds = existingSiblings.map((r) => r.sibling_id);
    const matchCount = siblingIds.filter((id) => existingSiblingIds.includes(id)).length;
    if (matchCount >= 2) return existing;
  }
  return null;
}

/** 우선순위 3: 이름 + 생년월일 + 보조 1개 이상 */
function matchByGeneral(candidate, existingList) {
  return existingList.find((p) => {
    if (p.name !== candidate.name || p.birth_date !== candidate.birth_date) return false;
    const auxiliaryMatches = [
      candidate.gender && p.gender === candidate.gender,
      candidate.phone  && p.phone  === candidate.phone,
      candidate.email  && p.email  === candidate.email,
    ];
    return auxiliaryMatches.some(Boolean);
  }) || null;
}

/**
 * 통합 실행 — 선점 원칙: 먼저 생성된 person_id 유지
 * 나중 path는 alias로 person_paths에 추가
 */
async function merge(canonical, latecomer) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // latecomer의 path를 canonical의 alias로 등록
    if (latecomer.new_path) {
      await client.query(
        `INSERT INTO person_paths (path, person_id, is_canonical, created_by)
         VALUES ($1, $2, FALSE, $3)
         ON CONFLICT (path) DO NOTHING`,
        [latecomer.new_path, canonical.person_id, latecomer.created_by]
      );
    }

    // latecomer person_relations 이전 (canonical person_id로 교체)
    await client.query(
      `UPDATE person_relations SET person_id_a = $1 WHERE person_id_a = $2`,
      [canonical.person_id, latecomer.person_id]
    );
    await client.query(
      `UPDATE person_relations SET person_id_b = $1 WHERE person_id_b = $2`,
      [canonical.person_id, latecomer.person_id]
    );

    // latecomer person 레코드 삭제 (cascade로 person_paths도 정리됨)
    await client.query(
      `DELETE FROM persons WHERE person_id = $1`,
      [latecomer.person_id]
    );

    // 양측 관장에게 알림 저장
    await notifyMerge(client, canonical, latecomer);

    await client.query('COMMIT');
    return { action: 'merged', canonical_id: canonical.person_id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** match_status를 'pending'으로 설정 */
async function setPending(personId) {
  await db.query(
    `UPDATE persons SET match_status = 'pending' WHERE person_id = $1`,
    [personId]
  );
}

/** 통합 후 양측 관장에게 알림 저장 */
async function notifyMerge(client, canonical, latecomer) {
  const payload = {
    canonical_id: canonical.person_id,
    merged_id:    latecomer.person_id,
    merged_path:  latecomer.new_path,
    merged_name:  latecomer.name,
  };

  // canonical 관장 알림
  await client.query(
    `INSERT INTO notifications (recipient_person_id, type, payload)
     VALUES ($1, 'merge_alert', $2)`,
    [canonical.person_id, JSON.stringify(payload)]
  );

  // latecomer 등록자(관장)에게도 알림 (created_by가 있을 경우)
  if (latecomer.created_by && latecomer.created_by !== canonical.person_id) {
    await client.query(
      `INSERT INTO notifications (recipient_person_id, type, payload)
       VALUES ($1, 'merge_alert', $2)`,
      [latecomer.created_by, JSON.stringify(payload)]
    );
  }
}

module.exports = { matchAndMerge };
