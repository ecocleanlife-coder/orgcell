'use strict';

/**
 * treeLayoutEngine.js — §22/§23/§24 기반 트리 레이아웃 계산 엔진
 *
 * family-chart 라이브러리 사용 금지 (§19)
 * z=1 인물은 어떠한 경우에도 응답 nodes에 포함하지 않음 (§22 철칙)
 */

// ─── §24 레이아웃 상수 ─────────────────────────────────────────────────────────
const C = {
  CARD_WIDTH:       220,    // §24-1: CoupleBlock 440 / 2
  COUPLE_WIDTH:     440,    // §24-1
  HALF_CARD:        110,    // 220 / 2
  CARD_HEIGHT:      140,    // 규칙서 미명시 → 엔진 기본값, 프론트 override 가능
  ROW_GAP:          280,    // Q1 확정
  SIBLING_GAP:      260,    // §23: 남편 형제 왼쪽 / 아내 형제 오른쪽 260px씩
  CHILD_BLOCK_STEP: 500,    // Q2 확정: COUPLE_WIDTH(440) + GAP(60)
  PARENT_X:        -300,    // §24-2: 관장 부모, 형제 없을 때
  PARENT_IN_LAW_X:  300,    // §24-2: 배우자 부모, 형제 없을 때
  OPACITY_DEEP:     0.3,    // §22: 증손주(depth=3) opacity
};

// ─── 관계 헬퍼 ─────────────────────────────────────────────────────────────────

// 활성 배우자 ID 반환
function getSpouseId(personId, rels) {
  const r = rels.find(r =>
    r.relation_type === 'spouse' &&
    (r.person1_id === personId || r.person2_id === personId)
  );
  return r ? (r.person1_id === personId ? r.person2_id : r.person1_id) : null;
}

// 자녀 ID 배열 (person1=부모, person2=자녀)
function getChildrenIds(personId, rels) {
  return rels
    .filter(r =>
      (r.relation_type === 'parent' || r.relation_type === 'parent-child') &&
      r.person1_id === personId
    )
    .map(r => r.person2_id);
}

// 부모 ID 배열 (최대 2명)
function getParentIds(personId, rels) {
  return rels
    .filter(r =>
      (r.relation_type === 'parent' || r.relation_type === 'parent-child') &&
      r.person2_id === personId
    )
    .map(r => r.person1_id);
}

// 형제/자매 ID 배열
function getSiblingIds(personId, rels) {
  return rels
    .filter(r =>
      (r.relation_type === 'sibling' || r.relation_type === 'half_sibling') &&
      (r.person1_id === personId || r.person2_id === personId)
    )
    .map(r => r.person1_id === personId ? r.person2_id : r.person1_id);
}

// 생년월일 오름차순 정렬 (§23: 자녀 순서)
function sortByBirth(persons) {
  return [...persons].sort((a, b) => {
    const da = a.birth_date ? new Date(a.birth_date) : null;
    const db = b.birth_date ? new Date(b.birth_date) : null;
    if (da && db) return da - db;
    if (da) return -1;
    if (db) return 1;
    return (a.birth_year || 9999) - (b.birth_year || 9999);
  });
}

// 산술 평균
function avg(arr) {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

// ─── §22 z=0 분류 ──────────────────────────────────────────────────────────────
function classifyZ0(curatorId, personById, rels) {
  const z0Set    = new Set();
  const depthMap = new Map(); // personId(DB int) → generation
  const roleMap  = new Map();

  function markZ0(id, depth, role) {
    if (!personById.has(id)) return;
    z0Set.add(id);
    if (!depthMap.has(id)) depthMap.set(id, depth);
    if (!roleMap.has(id))  roleMap.set(id, role);
  }

  // 1. 관장 본인
  markZ0(curatorId, 0, 'curator');

  // 2. 관장 배우자
  const spouseId = getSpouseId(curatorId, rels);
  if (spouseId) markZ0(spouseId, 0, 'curator-spouse');

  // 3. 자녀 + 배우자 + 증손주까지 (depth 1~3)
  const queue = [{ ids: [...new Set([
    ...getChildrenIds(curatorId, rels),
    ...(spouseId ? getChildrenIds(spouseId, rels) : []),
  ])], depth: 1 }];

  while (queue.length > 0) {
    const { ids, depth } = queue.shift();
    if (depth > 3) continue;
    const roleBase = depth === 1 ? 'child' : depth === 2 ? 'grandchild' : 'great-grandchild';
    for (const cId of ids) {
      markZ0(cId, depth, roleBase);
      const cSp = getSpouseId(cId, rels);
      if (cSp) markZ0(cSp, depth, `${roleBase}-spouse`);
      if (depth < 3) {
        const grandIds = [...new Set([
          ...getChildrenIds(cId, rels),
          ...(cSp ? getChildrenIds(cSp, rels) : []),
        ])];
        if (grandIds.length) queue.push({ ids: grandIds, depth: depth + 1 });
      }
    }
  }

  // 4. 관장 형제 + 배우자
  const curatorSibIds = getSiblingIds(curatorId, rels).filter(id => personById.has(id));
  for (const sId of curatorSibIds) {
    markZ0(sId, 0, 'sibling');
    const sSp = getSpouseId(sId, rels);
    if (sSp) markZ0(sSp, 0, 'sibling-spouse');
  }

  // 5. 관장 배우자의 형제 + 배우자
  const spouseSibIds = spouseId
    ? getSiblingIds(spouseId, rels).filter(id => personById.has(id))
    : [];
  for (const sId of spouseSibIds) {
    markZ0(sId, 0, 'spouse-sibling');
    const sSp = getSpouseId(sId, rels);
    if (sSp) markZ0(sSp, 0, 'spouse-sibling-spouse');
  }

  // 6. 관장 부모
  for (const pId of getParentIds(curatorId, rels)) markZ0(pId, -1, 'parent');

  // 7. 관장 배우자 부모
  if (spouseId) {
    for (const pId of getParentIds(spouseId, rels)) markZ0(pId, -1, 'parent-in-law');
  }

  return { z0Set, depthMap, roleMap, spouseId, curatorSibIds, spouseSibIds };
}

// ─── 남좌여우 배치 (§23) ────────────────────────────────────────────────────────
// 반환: { leftOffset, rightOffset } — blockCenterX 기준 각 카드의 offset
function coupleOffsets(personA, personB) {
  if (!personB) return { aOffset: 0, bOffset: null };
  // 여성이 오른쪽(+HALF_CARD), 남성이 왼쪽(-HALF_CARD)
  const aIsRight = personA.gender === 'female';
  return {
    aOffset: aIsRight ? C.HALF_CARD : -C.HALF_CARD,
    bOffset: aIsRight ? -C.HALF_CARD : C.HALF_CARD,
  };
}

// ─── 노드 포맷 ────────────────────────────────────────────────────────────────
function makeNode(person, x, y, depth, role, coupleId, coupleRole, coupleBlockX, opacity, animOrder) {
  return {
    id:           person.id,
    personId:     person.oc_id || person.person_id || String(person.id),
    name:         person.name,
    nameEn:       person.name_en     || null,
    nameSuffix:   person.name_suffix || null,
    gender:       person.gender      || null,
    birthDate:    person.birth_date  || null,
    birthYear:    person.birth_year  || null,
    deathDate:    person.death_date  || null,
    deathYear:    person.death_year  || null,
    isDeceased:   person.is_deceased || false,
    photoUrl:     person.photo_url   || null,
    bio1:         person.bio1        || null,
    bio2:         person.bio2        || null,
    bio3:         person.bio3        || null,
    opsPath:      person.ops_path    || null,
    matchStatus:  person.match_status || null,
    x,
    y,
    z:            0,
    depth,
    role,
    coupleId,
    coupleRole,       // 'left' | 'right' | 'single'
    coupleBlockX,
    opacity,
    animOrder,
  };
}

// ─── §23/§24 노드 배치 ────────────────────────────────────────────────────────
function buildNodes(curatorId, personById, rels, z0Set, depthMap, roleMap, spouseId, curatorSibIds, spouseSibIds) {
  const nodes  = [];
  let   order  = 1;
  let   coupleSeq = 0;
  const mkCId  = (tag) => `couple-${tag}-${++coupleSeq}`;

  function push(person, x, y, depth, role, coupleId, coupleRole, blockX, opacity = 1.0) {
    nodes.push(makeNode(person, x, y, depth, role, coupleId, coupleRole, blockX, opacity, order++));
  }

  const curator = personById.get(curatorId);
  const spouse  = spouseId ? personById.get(spouseId) : null;

  // ── 1. 관장 부부 (Y=0) ──────────────────────────────────────────────────────
  if (spouse) {
    const { aOffset, bOffset } = coupleOffsets(curator, spouse);
    push(curator, aOffset, 0, 0, 'curator',        'couple-main', aOffset < 0 ? 'left' : 'right', 0);
    push(spouse,  bOffset, 0, 0, 'curator-spouse', 'couple-main', bOffset < 0 ? 'left' : 'right', 0);
  } else {
    push(curator, 0, 0, 0, 'curator', 'couple-main', 'single', 0);
  }

  // 관장/배우자 개인 카드 X (§23 CRITICAL 연결선 기준)
  const curatorCardX = spouse ? (curator.gender === 'female' ? C.HALF_CARD : -C.HALF_CARD) : 0;
  const spouseCardX  = spouse ? (curator.gender === 'female' ? -C.HALF_CARD : C.HALF_CARD) : null;

  // ── 2. 관장 자녀 → 손자 → 증손주 (BFS, §22 순서) ───────────────────────────
  const rootChildIds = [...new Set([
    ...getChildrenIds(curatorId, rels),
    ...(spouseId ? getChildrenIds(spouseId, rels) : []),
  ])].filter(id => personById.has(id) && z0Set.has(id));

  const bfsQueue = [{ childIds: rootChildIds, depth: 1, parentY: 0, parentBlockX: 0 }];

  while (bfsQueue.length > 0) {
    const { childIds, depth, parentY, parentBlockX } = bfsQueue.shift();
    const children = sortByBirth(childIds.map(id => personById.get(id)));
    const N = children.length;
    const y = parentY + C.ROW_GAP;
    const opacity = depth >= 3 ? C.OPACITY_DEEP : 1.0;

    for (let i = 0; i < N; i++) {
      const child    = children[i];
      const blockX   = parentBlockX + (i - (N - 1) / 2) * C.CHILD_BLOCK_STEP;
      const cSpouseId = getSpouseId(child.id, rels);
      const cSpouse   = (cSpouseId && z0Set.has(cSpouseId)) ? personById.get(cSpouseId) : null;
      const cId       = mkCId(`d${depth}c${i}`);

      if (cSpouse) {
        const { aOffset, bOffset } = coupleOffsets(child, cSpouse);
        push(child,   blockX + aOffset, y, depth, roleMap.get(child.id)   || 'child',       cId, aOffset < 0 ? 'left' : 'right', blockX, opacity);
        push(cSpouse, blockX + bOffset, y, depth, roleMap.get(cSpouse.id) || 'child-spouse', cId, bOffset < 0 ? 'left' : 'right', blockX, opacity);
      } else {
        push(child, blockX, y, depth, roleMap.get(child.id) || 'child', cId, 'single', blockX, opacity);
      }

      if (depth < 3) {
        const grandIds = [...new Set([
          ...getChildrenIds(child.id, rels),
          ...(cSpouseId ? getChildrenIds(cSpouseId, rels) : []),
        ])].filter(id => personById.has(id) && z0Set.has(id));
        if (grandIds.length) bfsQueue.push({ childIds: grandIds, depth: depth + 1, parentY: y, parentBlockX: blockX });
      }
    }
  }

  // ── 3. 관장 형제 (Y=0, 관장 왼쪽 §23) ──────────────────────────────────────
  const sortedCurSibs = sortByBirth(curatorSibIds.map(id => personById.get(id)));
  for (let i = 0; i < sortedCurSibs.length; i++) {
    const sib       = sortedCurSibs[i];
    const sibCardX  = curatorCardX - C.SIBLING_GAP * (i + 1);
    const sSpouseId = getSpouseId(sib.id, rels);
    const sSpouse   = (sSpouseId && z0Set.has(sSpouseId)) ? personById.get(sSpouseId) : null;
    const cId       = mkCId(`cursib${i}`);

    if (sSpouse) {
      const { aOffset, bOffset } = coupleOffsets(sib, sSpouse);
      const blockX = sib.gender === 'female' ? sibCardX - C.HALF_CARD : sibCardX + C.HALF_CARD;
      // sibCardX = blockX + aOffset → blockX = sibCardX - aOffset
      const bX = sibCardX - aOffset;
      push(sib,    sibCardX,      0, 0, roleMap.get(sib.id)    || 'sibling',       cId, aOffset < 0 ? 'left' : 'right', bX);
      push(sSpouse, bX + bOffset, 0, 0, roleMap.get(sSpouse.id) || 'sibling-spouse', cId, bOffset < 0 ? 'left' : 'right', bX);
    } else {
      push(sib, sibCardX, 0, 0, roleMap.get(sib.id) || 'sibling', cId, 'single', sibCardX);
    }
  }

  // ── 4. 배우자 형제 (Y=0, 배우자 오른쪽 §23) ─────────────────────────────────
  const sortedSpSibs = sortByBirth(spouseSibIds.map(id => personById.get(id)));
  for (let i = 0; i < sortedSpSibs.length; i++) {
    const sib       = sortedSpSibs[i];
    const sibCardX  = (spouseCardX ?? 0) + C.SIBLING_GAP * (i + 1);
    const sSpouseId = getSpouseId(sib.id, rels);
    const sSpouse   = (sSpouseId && z0Set.has(sSpouseId)) ? personById.get(sSpouseId) : null;
    const cId       = mkCId(`spsib${i}`);

    if (sSpouse) {
      const { aOffset, bOffset } = coupleOffsets(sib, sSpouse);
      const bX = sibCardX - aOffset;
      push(sib,    sibCardX,      0, 0, roleMap.get(sib.id)    || 'spouse-sibling',       cId, aOffset < 0 ? 'left' : 'right', bX);
      push(sSpouse, bX + bOffset, 0, 0, roleMap.get(sSpouse.id) || 'spouse-sibling-spouse', cId, bOffset < 0 ? 'left' : 'right', bX);
    } else {
      push(sib, sibCardX, 0, 0, roleMap.get(sib.id) || 'spouse-sibling', cId, 'single', sibCardX);
    }
  }

  // ── 5. 관장 부모 (Y=-280) ───────────────────────────────────────────────────
  const curParentIds = getParentIds(curatorId, rels).filter(id => personById.has(id) && z0Set.has(id));
  if (curParentIds.length > 0) {
    // §2/§24-2: 부모 중심 = 자녀들(관장+형제) X 평균, 없으면 -300
    const childXs = [curatorCardX, ...sortedCurSibs.map((s, i) => curatorCardX - C.SIBLING_GAP * (i + 1))];
    const pCenterX = sortedCurSibs.length > 0 ? Math.round(avg(childXs)) : C.PARENT_X;
    const parents  = curParentIds.map(id => personById.get(id));
    const father   = parents.find(p => p.gender !== 'female') || parents[0];
    const mother   = parents.find(p => p.gender === 'female' && p !== father);

    if (mother) {
      push(father, pCenterX - C.HALF_CARD, -C.ROW_GAP, -1, 'parent', 'couple-curator-parents', 'left',  pCenterX);
      push(mother, pCenterX + C.HALF_CARD, -C.ROW_GAP, -1, 'parent', 'couple-curator-parents', 'right', pCenterX);
    } else {
      push(father, pCenterX, -C.ROW_GAP, -1, 'parent', 'couple-curator-parents', 'single', pCenterX);
    }
  }

  // ── 6. 배우자 부모 (Y=-280) ─────────────────────────────────────────────────
  if (spouseId) {
    const spParentIds = getParentIds(spouseId, rels).filter(id => personById.has(id) && z0Set.has(id));
    if (spParentIds.length > 0) {
      const childXs  = [(spouseCardX ?? 0), ...sortedSpSibs.map((s, i) => (spouseCardX ?? 0) + C.SIBLING_GAP * (i + 1))];
      const pCenterX = sortedSpSibs.length > 0 ? Math.round(avg(childXs)) : C.PARENT_IN_LAW_X;
      const parents  = spParentIds.map(id => personById.get(id));
      const father   = parents.find(p => p.gender !== 'female') || parents[0];
      const mother   = parents.find(p => p.gender === 'female' && p !== father);

      if (mother) {
        push(father, pCenterX - C.HALF_CARD, -C.ROW_GAP, -1, 'parent-in-law', 'couple-spouse-parents', 'left',  pCenterX);
        push(mother, pCenterX + C.HALF_CARD, -C.ROW_GAP, -1, 'parent-in-law', 'couple-spouse-parents', 'right', pCenterX);
      } else {
        push(father, pCenterX, -C.ROW_GAP, -1, 'parent-in-law', 'couple-spouse-parents', 'single', pCenterX);
      }
    }
  }

  return { nodes, curatorCardX, spouseCardX };
}

// ─── §23 연결선 계산 ───────────────────────────────────────────────────────────
function buildConnectors(nodes, curatorCardX, spouseCardX, rels) {
  const HALF_H = C.CARD_HEIGHT / 2; // 70px
  let seq = 0;

  // CoupleBlock 메타 (center X, Y)
  const coupleMap = new Map();
  for (const n of nodes) {
    if (!coupleMap.has(n.coupleId)) coupleMap.set(n.coupleId, { xs: [], y: n.y, ids: [], coupleId: n.coupleId });
    coupleMap.get(n.coupleId).xs.push(n.x);
    coupleMap.get(n.coupleId).ids.push(n.id);
  }
  const coupleMeta = new Map();
  for (const [cId, m] of coupleMap) {
    coupleMeta.set(cId, { centerX: Math.round(avg(m.xs)), y: m.y, coupleId: cId, personIds: m.ids });
  }

  // 부모→자녀 일반 연결선 (curator parents 제외 — CRITICAL 처리)
  const CRITICAL_COUPLES = new Set(['couple-curator-parents', 'couple-spouse-parents']);
  const parentToChildren = new Map(); // parentCoupleId → Set<childCoupleId>
  const nodeById = new Map(nodes.map(n => [n.id, n]));

  for (const n of nodes) {
    if (n.depth <= 0) continue;
    const parentIds = rels.filter(r =>
      (r.relation_type === 'parent' || r.relation_type === 'parent-child') &&
      r.person2_id === n.id
    ).map(r => r.person1_id);

    for (const pId of parentIds) {
      const pNode = nodeById.get(pId);
      if (!pNode || CRITICAL_COUPLES.has(pNode.coupleId)) continue;
      if (!parentToChildren.has(pNode.coupleId)) parentToChildren.set(pNode.coupleId, new Set());
      parentToChildren.get(pNode.coupleId).add(n.coupleId);
    }
  }

  const connectors = [];

  // 일반 parent-to-children
  for (const [parentCoupleId, childCoupleIdSet] of parentToChildren) {
    const pm = coupleMeta.get(parentCoupleId);
    if (!pm) continue;
    const childMetas = [...childCoupleIdSet]
      .map(id => coupleMeta.get(id)).filter(Boolean)
      .sort((a, b) => a.centerX - b.centerX);
    if (!childMetas.length) continue;

    const fromY = pm.y + HALF_H;
    const toY   = childMetas[0].y - HALF_H;
    connectors.push({
      id:            `conn-${++seq}`,
      type:          'parent-to-children',
      parentCoupleId,
      fromX:         pm.centerX,        // §23: 부부박스 아래 중간
      fromY,
      toY,
      midY:          Math.round((fromY + toY) / 2),
      childAnchors:  childMetas.map(cm => ({ coupleId: cm.coupleId, anchorX: cm.centerX })),
    });
  }

  // §23 CRITICAL: 관장 부모 → 관장 개인 카드 중앙
  const curParentMeta = coupleMeta.get('couple-curator-parents');
  const curNode       = nodes.find(n => n.role === 'curator');
  if (curParentMeta && curNode) {
    const fromY = curParentMeta.y + HALF_H;
    const toY   = curNode.y - HALF_H;
    connectors.push({
      id:             `conn-${++seq}`,
      type:           'parent-to-child-individual',  // §23 CRITICAL
      parentCoupleId: 'couple-curator-parents',
      childCoupleId:  'couple-main',
      fromX:          curParentMeta.centerX,
      fromY,
      toX:            curatorCardX,   // 관장 개인 카드 중앙 (부부박스 중앙 아님)
      toY,
      midY:           Math.round((fromY + toY) / 2),
    });
  }

  // §23 CRITICAL: 배우자 부모 → 배우자 개인 카드 중앙
  const spParentMeta = coupleMeta.get('couple-spouse-parents');
  const spNode       = nodes.find(n => n.role === 'curator-spouse');
  if (spParentMeta && spNode && spouseCardX !== null) {
    const fromY = spParentMeta.y + HALF_H;
    const toY   = spNode.y - HALF_H;
    connectors.push({
      id:             `conn-${++seq}`,
      type:           'parent-to-child-individual',  // §23 CRITICAL
      parentCoupleId: 'couple-spouse-parents',
      childCoupleId:  'couple-main',
      fromX:          spParentMeta.centerX,
      fromY,
      toX:            spouseCardX,    // 배우자 개인 카드 중앙
      toY,
      midY:           Math.round((fromY + toY) / 2),
    });
  }

  return connectors;
}

// ─── 메인 엔진 ────────────────────────────────────────────────────────────────
function buildTreeLayout(curatorId, persons, relations) {
  if (!curatorId) throw new Error('curatorId required');

  const personById = new Map(persons.map(p => [p.id, p]));
  if (!personById.has(curatorId)) throw new Error(`Curator id=${curatorId} not found`);

  // §22 z=0/z=1 분류
  const { z0Set, depthMap, roleMap, spouseId, curatorSibIds, spouseSibIds } =
    classifyZ0(curatorId, personById, relations);

  // §22 [철칙]: z=1 인물 수 집계 (응답에 포함 금지)
  const z1Count = persons.filter(p => !z0Set.has(p.id)).length;

  // §23/§24 배치 계산 (z=0만)
  const { nodes, curatorCardX, spouseCardX } =
    buildNodes(curatorId, personById, relations, z0Set, depthMap, roleMap, spouseId, curatorSibIds, spouseSibIds);

  // §23 연결선
  const connectors = buildConnectors(nodes, curatorCardX, spouseCardX, relations);

  return {
    nodes,
    connectors,
    meta: {
      curatorId,
      totalZ0:   nodes.length,
      totalZ1:   z1Count,
      constants: C,
    },
  };
}

module.exports = { buildTreeLayout, LAYOUT_CONSTANTS: C };
