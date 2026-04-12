'use strict';

/**
 * treeController.js — GET /api/tree/:subdomain
 *
 * §19 트리 레이아웃 API:
 *   백엔드가 §22/§23/§24 계산 후 x,y 좌표 + 연결선 반환.
 *   프론트엔드는 렌더링만 담당.
 */

const db = require('../config/db');
const { buildTreeLayout } = require('../services/treeLayoutEngine');

// ─── 쿼리 헬퍼 ────────────────────────────────────────────────────────────────

// subdomain → {siteId, userId} 조회
async function getSiteBySubdomain(subdomain) {
  const { rows } = await db.query(
    `SELECT id, user_id FROM family_sites WHERE LOWER(subdomain) = $1 AND status = 'active'`,
    [subdomain.toLowerCase()]
  );
  return rows[0] || null;
}

// 관장 person 조회 (site 소유자 + match_status=linked)
async function getCurator(siteId, userId) {
  const { rows } = await db.query(
    `SELECT id, person_id, oc_id, name, first_name, last_name, name_en, name_suffix, gender,
            birth_date, birth_year, death_date, death_year,
            is_deceased, birth_lunar, death_lunar,
            photo_url, bio1, bio2, bio3,
            name_legal_last, name_legal_first, name_other,
            bon_gwan, father_first_name, father_last_name,
            mother_first_name, mother_last_name,
            match_status
     FROM persons
     WHERE site_id = $1
       AND user_id = $2
       AND match_status = 'linked'
     LIMIT 1`,
    [siteId, userId]
  );
  return rows[0] || null;
}

// 사이트 전체 인물 조회
async function getAllPersons(siteId) {
  const { rows } = await db.query(
    `SELECT p.id, p.person_id, p.oc_id, p.name, p.first_name, p.last_name, p.name_en, p.name_suffix,
            p.gender, p.birth_date, p.birth_year, p.death_date, p.death_year,
            p.is_deceased, p.birth_lunar, p.death_lunar,
            p.photo_url, p.bio1, p.bio2, p.bio3,
            p.name_legal_last, p.name_legal_first, p.name_other,
            p.bon_gwan, p.father_first_name, p.father_last_name,
            p.mother_first_name, p.mother_last_name,
            p.parent1_id, p.parent2_id, p.spouse_id,
            p.match_status, p.privacy_level
     FROM persons p
     WHERE p.site_id = $1
     ORDER BY p.id ASC`,
    [siteId]
  );

  // OPS path 조회 (person_paths 테이블 없으면 무시)
  const varIds = rows.map(p => p.person_id || p.oc_id).filter(Boolean);
  if (varIds.length > 0) {
    try {
      const { rows: pathRows } = await db.query(
        `SELECT person_id, path FROM person_paths
         WHERE person_id = ANY($1) AND is_canonical = TRUE`,
        [varIds]
      );
      const pathMap = new Map(pathRows.map(r => [r.person_id, r.path]));
      for (const p of rows) {
        const vId = p.person_id || p.oc_id;
        if (vId) p.ops_path = pathMap.get(vId) || null;
        p.oc_id = vId || String(p.id);
      }
    } catch {
      // person_paths 테이블 없는 경우 무시
    }
  }

  return rows;
}

// 사이트 전체 관계 조회 (활성 관계만)
async function getAllRelations(siteId) {
  const { rows } = await db.query(
    `SELECT id, person1_id, person2_id, relation_type, is_active
     FROM person_relations
     WHERE site_id = $1 AND is_active = TRUE
     ORDER BY id ASC`,
    [siteId]
  );

  // persons 직접 컬럼(parent1_id/parent2_id/spouse_id)을 relations로도 보완
  // → persons 쿼리에서 추가로 보강 (아래 mergePersonColumns 참고)
  return rows;
}

// persons.parent1_id / parent2_id / spouse_id → person_relations 보완
// (정규화 전 데이터 호환용)
async function mergePersonColumnRelations(persons, existingRels, siteId) {
  const relSet = new Set(
    existingRels.map(r => `${r.person1_id}-${r.person2_id}-${r.relation_type}`)
  );
  const extraRels = [];

  for (const p of persons) {
    for (const parentId of [p.parent1_id, p.parent2_id]) {
      if (!parentId) continue;
      const key = `${parentId}-${p.id}-parent`;
      if (!relSet.has(key)) {
        extraRels.push({ id: null, person1_id: parentId, person2_id: p.id, relation_type: 'parent', is_active: true });
        relSet.add(key);
      }
    }
    if (p.spouse_id) {
      const k1 = `${p.id}-${p.spouse_id}-spouse`;
      const k2 = `${p.spouse_id}-${p.id}-spouse`;
      if (!relSet.has(k1) && !relSet.has(k2)) {
        extraRels.push({ id: null, person1_id: p.id, person2_id: p.spouse_id, relation_type: 'spouse', is_active: true });
        relSet.add(k1);
      }
    }
  }

  return [...existingRels, ...extraRels];
}

// ─── GET /api/tree/:subdomain ──────────────────────────────────────────────────
exports.getTreeLayout = async (req, res) => {
  try {
    const { subdomain } = req.params;

    // 사이트 조회
    const site = await getSiteBySubdomain(subdomain);
    if (!site) {
      return res.status(404).json({ success: false, message: '박물관을 찾을 수 없습니다.' });
    }

    // 관장 조회
    const curator = await getCurator(site.id, site.user_id);
    if (!curator) {
      return res.status(404).json({ success: false, message: '관장 인물이 등록되지 않았습니다.' });
    }

    // 인물 + 관계 조회
    const [persons, rawRels] = await Promise.all([
      getAllPersons(site.id),
      getAllRelations(site.id),
    ]);

    // 컬럼 기반 관계 보완
    const relations = await mergePersonColumnRelations(persons, rawRels, site.id);

    // §22/§23/§24 레이아웃 계산
    const layout = buildTreeLayout(curator.id, persons, relations);

    res.set({ 'Cache-Control': 'no-cache, no-store, must-revalidate' });
    res.json({
      success:  true,
      subdomain,
      curatorId: curator.oc_id || String(curator.id),
      ...layout,
    });
  } catch (err) {
    console.error('getTreeLayout error:', err);
    res.status(500).json({ success: false, message: '트리 레이아웃 계산 실패', detail: err.message });
  }
};