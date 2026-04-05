/**
 * buildTree.js — VISION.md v2.0 레고 블록 표준 준수
 *
 * persons[] + person_relations[] → { nodes[], links[], mainId, constants }
 *
 * 핵심 원칙:
 * - 240px 그리드 (220px 블록 + 20px 간격)
 * - 부부 간격 = 0 (붙어서 박스, center-to-center = CARD_W = 220)
 * - Y축: 조상↑(+280) 자손↓(-280), 본인=0
 * - X축: 남편형제→좌, 아내형제→우
 * - Z축: 타가문 레이어 (0/1/2)
 * - DB generation 사용 금지 → 관계 기반 BFS depth
 */

// ── 레고 표준 상수 (ORGCELL_CODING_RULES.md §2) ─────────────
const SLOT_W = 240;     // 한 사람 슬롯 = 220px + 20px 간격
const Y_GAP = 280;      // 세대 간 수직 간격 = 220px + 60px
const CARD_W = 220;     // 카드 실제 폭
const CARD_H = 220;     // 카드 실제 높이
const CARD_GAP = 20;    // 카드 사이 간격 (부부 제외)

// ── 표시 범위 상수 (ORGCELL_CODING_RULES.md §22) ────────────
const DISPLAY_MAX_ANCESTOR_DEPTH = 2; // 조부모(depth=2)까지만 화면 표시

// ── 유틸 ──────────────────────────────────────────

function normalizeGender(g) {
    if (!g) return 'M';
    const lower = String(g).toLowerCase();
    if (lower === 'f' || lower === 'female') return 'F';
    return 'M';
}

function isKoreanName(name) {
    return /[\uAC00-\uD7A3]/.test(name);
}

function parseName(name) {
    if (!name) return { displayName: '?', firstName: '?', lastName: '' };
    const trimmed = name.trim();
    if (isKoreanName(trimmed)) {
        return {
            displayName: trimmed,
            firstName: trimmed.slice(1) || trimmed,
            lastName: trimmed.charAt(0),
        };
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
        return {
            displayName: trimmed,
            firstName: parts.slice(0, -1).join(' '),
            lastName: parts[parts.length - 1],
        };
    }
    return { displayName: trimmed, firstName: trimmed, lastName: '' };
}

function getInitials(name) {
    if (!name) return '?';
    if (isKoreanName(name)) return name.slice(0, 2);
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

// ── 관계 맵 구축 ─────────────────────────────────

function buildMaps(persons, relations) {
    const idSet = new Set(persons.map(p => String(p.id)));
    const parentOf = {};
    const childrenOf = {};
    const spousesOf = {};
    const birthParentOf = {};  // 입양아 → 친부모 (birth-parent)
    const birthChildOf = {};   // 친부모 → 입양아 (역방향)
    const birthParentSet = new Set(); // 친부모 ID (가문전환 대상)

    for (const rel of relations) {
        const p1 = String(rel.person1_id);
        const p2 = String(rel.person2_id);
        if (!idSet.has(p1) || !idSet.has(p2)) continue;

        if (rel.relation_type === 'parent' || rel.relation_type === 'parent_child') {
            if (!parentOf[p2]) parentOf[p2] = [];
            if (!parentOf[p2].includes(p1)) parentOf[p2].push(p1);
            if (!childrenOf[p1]) childrenOf[p1] = [];
            if (!childrenOf[p1].includes(p2)) childrenOf[p1].push(p2);
        }

        if (rel.relation_type === 'spouse') {
            if (!spousesOf[p1]) spousesOf[p1] = [];
            if (!spousesOf[p1].includes(p2)) spousesOf[p1].push(p2);
            if (!spousesOf[p2]) spousesOf[p2] = [];
            if (!spousesOf[p2].includes(p1)) spousesOf[p2].push(p1);
        }

        // birth-parent 관계: person1=친부모, person2=입양아
        if (rel.relation_type === 'birth-parent') {
            birthParentSet.add(p1);
            if (!birthParentOf[p2]) birthParentOf[p2] = [];
            if (!birthParentOf[p2].includes(p1)) birthParentOf[p2].push(p1);
            if (!birthChildOf[p1]) birthChildOf[p1] = [];
            if (!birthChildOf[p1].includes(p2)) birthChildOf[p1].push(p2);
        }

        if (rel.relation_type === 'sibling') {
            const parents1 = parentOf[p1] || [];
            const parents2 = parentOf[p2] || [];
            if (parents1.length > 0 && parents2.length === 0) {
                parentOf[p2] = [...parents1];
                for (const pid of parents1) {
                    if (!childrenOf[pid]) childrenOf[pid] = [];
                    if (!childrenOf[pid].includes(p2)) childrenOf[pid].push(p2);
                }
            } else if (parents2.length > 0 && parents1.length === 0) {
                parentOf[p1] = [...parents2];
                for (const pid of parents2) {
                    if (!childrenOf[pid]) childrenOf[pid] = [];
                    if (!childrenOf[pid].includes(p1)) childrenOf[pid].push(p1);
                }
            }
        }
    }

    return { parentOf, childrenOf, spousesOf, birthParentOf, birthChildOf, birthParentSet };
}

// ── 연결된 노드 필터 (BFS) ──────────────────────

function filterConnected(personIds, maps, mainId) {
    const mainStr = String(mainId);
    if (!personIds.includes(mainStr)) return personIds;

    const { parentOf, childrenOf, spousesOf, birthParentOf, birthChildOf } = maps;
    const visited = new Set();
    const queue = [mainStr];

    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current)) continue;
        visited.add(current);
        const neighbors = [
            ...(parentOf[current] || []),
            ...(childrenOf[current] || []),
            ...(spousesOf[current] || []),
            ...(birthParentOf[current] || []),
            ...(birthChildOf[current] || []),
        ];
        for (const n of neighbors) {
            if (!visited.has(n) && personIds.includes(n)) queue.push(n);
        }
    }

    return visited.size > 0 ? [...visited] : personIds;
}

// ── mainId 결정 ─────────────────────────────────

function pickMainId(persons) {
    if (!persons || persons.length === 0) return null;
    const gen1 = persons.filter(p => p.generation === 1);
    if (gen1.length > 0) {
        gen1.sort((a, b) => a.id - b.id);
        return String(gen1[0].id);
    }
    const roots = persons.filter(p => !p.parent1_id);
    if (roots.length > 0) return String(roots[0].id);
    return String(persons[0].id);
}

// ── depth 계산 (관계 기반 BFS, DB generation 사용 금지) ──

function computeDepth(mainId, maps) {
    const { parentOf, childrenOf, spousesOf } = maps;
    const depth = {};
    depth[mainId] = 0;
    const queue = [mainId];
    const visited = new Set([mainId]);

    while (queue.length > 0) {
        const current = queue.shift();
        const d = depth[current];

        // 배우자 → 같은 depth
        for (const sid of (spousesOf[current] || [])) {
            if (!visited.has(sid)) {
                visited.add(sid);
                depth[sid] = d;
                queue.push(sid);
            }
        }

        // 부모 → depth + 1 (위로)
        for (const pid of (parentOf[current] || [])) {
            if (!visited.has(pid)) {
                visited.add(pid);
                depth[pid] = d + 1;
                queue.push(pid);
            }
        }

        // 자녀 → depth - 1 (아래로)
        for (const cid of (childrenOf[current] || [])) {
            if (!visited.has(cid)) {
                visited.add(cid);
                depth[cid] = d - 1;
                queue.push(cid);
            }
        }
    }

    return depth;
}

// ── 표시 여부 분류 ────────────────────────────────────
// centerId 부부만 양쪽 가문이 X/Y에 펼쳐지고,
// 나머지 배우자들의 가문(부모/형제)은 숨김 (z=1).

function classifyZ(mainId, maps, depthMap, byId) {
    const { parentOf, childrenOf, spousesOf } = maps;
    const z = {};

    // 혈족 추적: parent-child 링크만 따라감 (spouse 안 따라감)
    // 조상 → 조상의 자녀(형제) → 후손까지 포함
    function getBloodRelatives(startId) {
        const blood = new Set();

        // 위로: 조상 추적
        function traceUp(id) {
            blood.add(id);
            for (const pid of (parentOf[id] || [])) {
                if (!blood.has(pid)) traceUp(pid);
            }
        }

        // 아래로: 후손 추적
        function traceDown(id) {
            blood.add(id);
            for (const cid of (childrenOf[id] || [])) {
                if (!blood.has(cid)) traceDown(cid);
            }
        }

        // 1. 본인 → 조상까지 위로
        traceUp(startId);

        // 2. 모든 조상의 자녀(형제) + 그 후손까지 아래로
        const ancestors = new Set(blood);
        for (const anc of ancestors) {
            for (const cid of (childrenOf[anc] || [])) {
                if (!blood.has(cid)) traceDown(cid);
            }
        }

        return blood;
    }

    // centerId + spouse의 혈족 = Z0
    const centerBlood = getBloodRelatives(mainId);
    const mainSpouse = (spousesOf[mainId] || [])[0] || null;
    const spouseBlood = mainSpouse ? getBloodRelatives(mainSpouse) : new Set();

    // 양쪽 혈족 합집합
    const allZ0Blood = new Set([...centerBlood, ...spouseBlood]);

    for (const id of allZ0Blood) {
        z[id] = 0;
    }

    // 혈족의 배우자 → 카드는 Z0에 보이되, 그 배우자의 가문은 Z1
    for (const id of allZ0Blood) {
        for (const sp of (spousesOf[id] || [])) {
            if (z[sp] === undefined) z[sp] = 0;
        }
    }

    // 나머지: Z=1 (다른 가문 — 폴더 뒤에 접힘)
    for (const id of Object.keys(depthMap)) {
        if (z[id] === undefined) z[id] = 1;
    }

    return z;
}


// ── 직계 조상 ID 집합 (mainId/spouseId 기준, maxDepth 세대까지) ──
function getDirectAncestorIds(mainId, spouseId, maps, maxDepth) {
    const direct = new Set();
    function trace(id, depth) {
        if (depth > maxDepth) return;
        direct.add(id);
        for (const sp of (maps.spousesOf[id] || [])) direct.add(sp);
        for (const pid of (maps.parentOf[id] || [])) trace(pid, depth + 1);
    }
    trace(mainId, 0);
    if (spouseId) trace(spouseId, 0);
    return direct;
}

// ── 표시 범위 필터 (§22) ─────────────────────────────────────
// depth ≥ 3 (증조부모 이상) → z=1 (숨김)
// depth === 2 중 직계 조부모 아닌 노드 (조부모 형제) → z=1 (숨김)
function applyDisplayRange(zMap, depthMap, directAncestors) {
    const result = {};
    for (const id of Object.keys(zMap)) {
        result[id] = zMap[id];
        if (result[id] !== 0) continue; // 이미 숨김 상태면 그대로
        const depth = depthMap[id] || 0;
        if (depth >= DISPLAY_MAX_ANCESTOR_DEPTH + 1) {
            result[id] = 1; // 증조부모 이상 숨김
        } else if (depth === DISPLAY_MAX_ANCESTOR_DEPTH && !directAncestors.has(id)) {
            result[id] = 1; // 조부모 세대이지만 직계 아님 (조부모 형제) 숨김
        }
    }
    return result;
}

// ── 노드 데이터 생성 ────────────────────────────

function buildNodeData(person) {
    const { displayName, firstName, lastName } = parseName(person.name);
    const gender = normalizeGender(person.gender);

    const birthYear = person.birth_date
        ? new Date(person.birth_date).getUTCFullYear()
        : person.birth_year || null;
    const deathYear = person.death_date
        ? new Date(person.death_date).getUTCFullYear()
        : person.death_year || null;

    const birthPrefix = person.birth_lunar ? '음 ' : '';
    const isDeceased = person.is_deceased || !!person.death_date;
    let dateLabel = '';
    if (birthYear && deathYear) {
        dateLabel = `${birthPrefix}${birthYear} ~ ${deathYear}`;
    } else if (birthYear && isDeceased) {
        dateLabel = `${birthPrefix}${birthYear} ~`;
    }

    return {
        displayName,
        firstName,
        lastName,
        gender,
        initials: getInitials(person.name),
        birthday: person.birth_date || '',
        avatar: person.photo_url || '',
        photoPosition: person.photo_position || { x: 50, y: 50 },
        dateLabel,
        isDeceased,
        birthLunar: person.birth_lunar || false,
        deathLunar: person.death_lunar || false,
        ocId: person.oc_id || '',
        fsPersonId: person.fs_person_id || '',
        privacyLevel: person.privacy_level || 'family',
        privacyVariant: person.privacy_variant || null,
        isRefused: person.is_refused || false,
        relationLabel: person.relation_label || '',
    };
}

// ── 형제 식별 ───────────────────────────────────

/**
 * personId의 형제 목록 (같은 부모 공유자 중 본인 제외)
 * 출생순 정렬
 */
function getSiblings(personId, maps, byId) {
    const parents = maps.parentOf[personId] || [];
    const sibSet = new Set();
    for (const pid of parents) {
        for (const cid of (maps.childrenOf[pid] || [])) {
            if (cid !== personId) sibSet.add(cid);
        }
    }
    const sibs = [...sibSet];
    sibs.sort((a, b) => {
        const pA = byId[a];
        const pB = byId[b];
        const dA = pA?.birth_date ? new Date(pA.birth_date).getTime() : Infinity;
        const dB = pB?.birth_date ? new Date(pB.birth_date).getTime() : Infinity;
        if (dA !== dB) return dA - dB;
        return Number(a) - Number(b);
    });
    return sibs;
}

// ── CoupleBlock 레이아웃 ────────────────────────

/**
 * 중심축 대칭 + 재귀 서브트리 압축 레이아웃
 *
 * 1. mainId 부부를 X=0 중앙에 고정
 * 2. 서브트리 너비를 재귀 계산하여 겹침 방지
 * 3. 자녀를 부모 중심에 대칭 배치
 * 4. 형제는 자녀 영역 바깥에 배치
 * 5. 조상은 자손 범위 중심에 배치
 */
function layoutCoupleBlock(mainId, maps, byId, depthMap, connectedIds) {
    const positions = {};
    const connSet = new Set(connectedIds);
    const { spousesOf, parentOf, childrenOf } = maps;
    // 부부는 간격 0으로 붙어있으므로 center-to-center = CARD_W (SLOT_W 아님)
    const HALF = CARD_W / 2;

    // ── 유틸 ──
    function getSpouse(id) {
        return (spousesOf[id] || []).find(s => connSet.has(s)) || null;
    }

    function getChildrenSorted(coupleIds) {
        const childSet = new Set();
        for (const pid of coupleIds) {
            for (const cid of (childrenOf[pid] || [])) {
                if (connSet.has(cid)) childSet.add(cid);
            }
        }
        return [...childSet].sort((a, b) => {
            const dA = byId[a]?.birth_date ? new Date(byId[a].birth_date).getTime() : Infinity;
            const dB = byId[b]?.birth_date ? new Date(byId[b].birth_date).getTime() : Infinity;
            return dA !== dB ? dA - dB : Number(a) - Number(b);
        });
    }

    // ── 재귀 서브트리 너비 (슬롯 단위) ──
    const stCache = {};
    function subtreeSlots(personId) {
        if (stCache[personId] !== undefined) return stCache[personId];
        const sp = getSpouse(personId);
        const selfSlots = sp ? 2 : 1;
        const coupleIds = sp ? [personId, sp] : [personId];
        const children = getChildrenSorted(coupleIds);

        const placed = new Set();
        let childTotal = 0;
        for (const cid of children) {
            if (placed.has(cid)) continue;
            const cSp = getSpouse(cid);
            if (cSp && !placed.has(cSp)) {
                childTotal += subtreeSlots(cid);
                placed.add(cid);
                placed.add(cSp);
            } else {
                childTotal += subtreeSlots(cid);
                placed.add(cid);
            }
        }

        const result = Math.max(selfSlots, childTotal);
        stCache[personId] = result;
        if (sp) stCache[sp] = result;
        return result;
    }

    // ── 재귀 하향 배치 (본인 + 모든 후손) ──
    function placeDescTree(personId, centerX, y) {
        if (positions[personId]) return;
        const sp = getSpouse(personId);

        // 자신 + 배우자 배치
        if (sp && !positions[sp]) {
            const m = byId[personId]?.gender === 'M' ? personId : sp;
            const f = byId[personId]?.gender === 'M' ? sp : personId;
            positions[m] = { x: centerX - HALF, y };
            positions[f] = { x: centerX + HALF, y };
        } else {
            positions[personId] = { x: centerX, y };
        }

        // 자녀 슬롯 계산 + 배치
        const coupleIds = sp ? [personId, sp] : [personId];
        const children = getChildrenSorted(coupleIds);
        if (children.length === 0) return;

        const slots = [];
        const placed = new Set();
        for (const cid of children) {
            if (placed.has(cid)) continue;
            const cSp = getSpouse(cid);
            if (cSp && !placed.has(cSp)) {
                slots.push({ id: cid, width: subtreeSlots(cid) });
                placed.add(cid);
                placed.add(cSp);
            } else {
                slots.push({ id: cid, width: subtreeSlots(cid) });
                placed.add(cid);
            }
        }

        const totalW = slots.reduce((s, sl) => s + sl.width, 0);
        let startX = centerX - (totalW * SLOT_W) / 2;

        for (const slot of slots) {
            const slotCenter = startX + (slot.width * SLOT_W) / 2;
            placeDescTree(slot.id, slotCenter, y - Y_GAP);
            startX += slot.width * SLOT_W;
        }
    }

    // ── 1단계: 메인 부부 + 후손 배치 (X=0 중심) ──
    placeDescTree(mainId, 0, 0);

    // ── 2단계: 형제 배치 (자손 영역 밖에) ──
    const husbandId = byId[mainId]?.gender === 'M' ? mainId : getSpouse(mainId);
    const wifeId = byId[mainId]?.gender === 'M' ? getSpouse(mainId) : mainId;

    function placeSiblingsOf(personId, direction) {
        if (!personId) return;
        const sibs = getSiblings(personId, maps, byId).filter(s => connSet.has(s) && !positions[s]);
        if (sibs.length === 0) return;

        for (const sibId of sibs) {
            if (positions[sibId]) continue;
            const width = subtreeSlots(sibId);

            // Y=0(형제 행)의 X만 기준으로 삼아 자녀 확산 영향 차단
            const sameYXs = Object.entries(positions)
                .filter(([, pos]) => pos.y === 0)
                .map(([, pos]) => pos.x);
            const refXs = sameYXs.length > 0 ? sameYXs : Object.values(positions).map(p => p.x);
            const edge = direction === -1
                ? Math.min(...refXs) - SLOT_W
                : Math.max(...refXs) + SLOT_W;

            const sibCenter = direction === -1
                ? edge - ((width - 1) * SLOT_W) / 2
                : edge + ((width - 1) * SLOT_W) / 2;

            placeDescTree(sibId, sibCenter, 0);
        }
    }

    placeSiblingsOf(husbandId, -1);
    placeSiblingsOf(wifeId, 1);

    // ── 3단계: 조상 배치 (양가 분리, 자손 범위 중심 기준) ──
    function placeAncestorsUp(personId, side) {
        // side: 'left' or 'right' — 양가 겹침 방지용
        if (!personId || !positions[personId]) return;

        const allParents = (parentOf[personId] || []).filter(p => connSet.has(p));
        const unplacedParents = allParents.filter(p => !positions[p]);

        if (unplacedParents.length > 0) {
            // 본인 + 형제의 X 범위
            const sibs = getSiblings(personId, maps, byId).filter(s => connSet.has(s) && positions[s]);
            const groupIds = [personId, ...sibs].filter(id => positions[id]);
            const groupXs = groupIds.map(id => positions[id].x);

            let centerX;
            if (sibs.length > 0) {
                centerX = (Math.min(...groupXs) + Math.max(...groupXs)) / 2;
            } else {
                centerX = positions[personId].x + (side === 'left' ? -HALF : HALF);
            }

            const depth = (depthMap[personId] || 0) + 1;
            const y = depth * Y_GAP;

            // 같은 y에 배치된 노드와 겹침 방지
            const sameYXs = Object.values(positions).filter(p => p.y === y).map(p => p.x);
            if (sameYXs.length > 0) {
                const wouldOverlap = sameYXs.some(ox =>
                    Math.abs(ox - (centerX - HALF)) < SLOT_W * 0.8 ||
                    Math.abs(ox - (centerX + HALF)) < SLOT_W * 0.8
                );
                if (wouldOverlap) {
                    const edge = side === 'left'
                        ? Math.min(...sameYXs) - SLOT_W
                        : Math.max(...sameYXs) + SLOT_W;
                    centerX = side === 'left' ? edge - HALF : edge + HALF;
                }
            }

            const father = unplacedParents.find(p => byId[p]?.gender === 'M');
            const mother = unplacedParents.find(p => byId[p]?.gender === 'F');

            if (father && mother) {
                positions[father] = { x: centerX - HALF, y };
                positions[mother] = { x: centerX + HALF, y };
            } else {
                positions[unplacedParents[0]] = { x: centerX, y };
            }
        }

        // 재귀: 배치된 부모를 통해 위로 계속
        for (const pid of allParents) {
            if (positions[pid]) placeAncestorsUp(pid, side);
        }
    }

    // 메인 부부의 부모를 먼저 배치
    // 남편측 부모 → 왼쪽, 아내측 부모 → 오른쪽
    function placeDirectParents(personId, side) {
        if (!personId) return;
        const parents = (parentOf[personId] || []).filter(p => connSet.has(p) && !positions[p]);
        if (parents.length === 0) return;

        // 본인 + 형제 범위
        const sibs = getSiblings(personId, maps, byId).filter(s => connSet.has(s) && positions[s]);
        const groupIds = [personId, ...sibs].filter(id => positions[id]);
        const groupXs = groupIds.map(id => positions[id].x);

        let centerX;
        if (sibs.length > 0) {
            centerX = (Math.min(...groupXs) + Math.max(...groupXs)) / 2;
        } else {
            centerX = positions[personId].x + (side === 'left' ? -HALF : HALF);
        }

        const depth = (depthMap[personId] || 0) + 1;
        const y = depth * Y_GAP;

        // 겹침 방지
        const sameYXs = Object.values(positions).filter(p => p.y === y).map(p => p.x);
        if (sameYXs.length > 0) {
            const wouldOverlap = sameYXs.some(ox =>
                Math.abs(ox - (centerX - HALF)) < SLOT_W * 0.8 ||
                Math.abs(ox - (centerX + HALF)) < SLOT_W * 0.8
            );
            if (wouldOverlap) {
                const edge = side === 'left'
                    ? Math.min(...sameYXs) - SLOT_W
                    : Math.max(...sameYXs) + SLOT_W;
                centerX = side === 'left' ? edge - HALF : edge + HALF;
            }
        }

        const father = parents.find(p => byId[p]?.gender === 'M');
        const mother = parents.find(p => byId[p]?.gender === 'F');

        if (father && mother) {
            positions[father] = { x: centerX - HALF, y };
            positions[mother] = { x: centerX + HALF, y };
        } else {
            positions[parents[0]] = { x: centerX, y };
        }
    }

    // 메인 부부의 부모 배치
    if (husbandId) placeDirectParents(husbandId, 'left');
    if (wifeId) placeDirectParents(wifeId, 'right');

    // 메인 부모를 경유해서 조부모까지 올라감
    const mainParents = (parentOf[mainId] || []).filter(p => connSet.has(p));
    for (const pid of mainParents) {
        if (!positions[pid]) continue;
        const pGender = byId[pid]?.gender;
        const side = pGender === 'M' ? 'left' : 'right';
        placeAncestorsUp(pid, side);
    }

    // 배우자의 부모도 경유
    const spouseId = getSpouse(mainId);
    if (spouseId) {
        const spouseParents = (parentOf[spouseId] || []).filter(p => connSet.has(p));
        for (const pid of spouseParents) {
            if (!positions[pid]) continue;
            const side = byId[spouseId]?.gender === 'M' ? 'left' : 'right';
            placeAncestorsUp(pid, side);
        }
    }

    // ── 4단계: 부모의 형제(삼촌/이모)만 배치 ──
    // §22: 부모(depth=1)의 형제까지만 표시. 조부모(depth=2) 형제는 숨김.
    // maxPersonDepth: personId의 depth가 이 값 이상이면 형제 배치 중단
    function placeAncestorSiblings(personId, maxPersonDepth) {
        if (!personId) return;
        const personDepth = depthMap[personId] || 0;
        if (personDepth >= maxPersonDepth) return; // 부모 세대(depth=1) 도달 시 중단

        const parents = (parentOf[personId] || []).filter(p => connSet.has(p) && positions[p]);

        for (const pid of parents) {
            const pSibs = getSiblings(pid, maps, byId).filter(s => connSet.has(s) && !positions[s]);
            if (pSibs.length > 0) {
                const parentX = positions[pid].x;
                const direction = parentX <= 0 ? -1 : 1;
                const parentY = positions[pid].y;

                for (const sibId of pSibs) {
                    if (positions[sibId]) continue;
                    const width = subtreeSlots(sibId);

                    // 같은 Y 행의 X만 기준으로 (자녀 행이 영향 주지 않도록)
                    const sameYXs = Object.entries(positions)
                        .filter(([, pos]) => pos.y === parentY)
                        .map(([, pos]) => pos.x);
                    const refXs = sameYXs.length > 0 ? sameYXs : Object.values(positions).map(p => p.x);
                    const edge = direction === -1
                        ? Math.min(...refXs) - SLOT_W
                        : Math.max(...refXs) + SLOT_W;

                    const sibCenter = direction === -1
                        ? edge - ((width - 1) * SLOT_W) / 2
                        : edge + ((width - 1) * SLOT_W) / 2;

                    placeDescTree(sibId, sibCenter, parentY);
                }
            }
            placeAncestorSiblings(pid, maxPersonDepth);
        }
    }

    // 남편/아내 side 각각 처리 (mainId 성별 무관하게 양가 모두 커버)
    // maxPersonDepth=1: depth<1 (=depth 0)인 personId의 부모만 형제 배치 → 삼촌/이모(depth=1)까지
    if (husbandId) placeAncestorSiblings(husbandId, 1);
    if (wifeId && wifeId !== husbandId) placeAncestorSiblings(wifeId, 1);

    // ── 5단계: 겹침 해소 (같은 Y에서 X 간격 < MIN_GAP 시 밀어내기) ──
    const MIN_GAP = SLOT_W; // 200px 최소 간격 (180px 카드 + 20px 간격)

    // 부모-자손 관계를 따라 서브트리 전체를 deltaX만큼 이동
    function shiftSubtree(personId, deltaX, visited) {
        if (visited.has(personId)) return;
        visited.add(personId);
        if (!positions[personId]) return;
        positions[personId].x += deltaX;

        // 배우자도 이동
        const sp = (spousesOf[personId] || []).find(s => connSet.has(s) && positions[s]);
        if (sp && !visited.has(sp)) {
            visited.add(sp);
            positions[sp].x += deltaX;
        }

        // 자녀 + 자녀의 서브트리 재귀 이동
        const coupleIds = sp ? [personId, sp] : [personId];
        for (const pid of coupleIds) {
            for (const cid of (childrenOf[pid] || [])) {
                if (connSet.has(cid)) shiftSubtree(cid, deltaX, visited);
            }
        }
    }

    // 최대 10회 반복 (수렴할 때까지)
    for (let pass = 0; pass < 10; pass++) {
        let anyShifted = false;

        // Y 그룹별로 노드 수집
        const byY = {};
        for (const [id, pos] of Object.entries(positions)) {
            const yKey = Math.round(pos.y);
            if (!byY[yKey]) byY[yKey] = [];
            byY[yKey].push({ id, x: pos.x });
        }

        for (const yKey of Object.keys(byY)) {
            const row = byY[yKey];
            if (row.length < 2) continue;
            row.sort((a, b) => a.x - b.x);

            for (let i = 0; i < row.length - 1; i++) {
                const gap = row[i + 1].x - row[i].x;
                if (gap < MIN_GAP) {
                    const pushAmount = MIN_GAP - gap;
                    // 오른쪽 노드 + 그 서브트리 전체를 밀어내기
                    const visited = new Set();
                    shiftSubtree(row[i + 1].id, pushAmount, visited);
                    anyShifted = true;
                    // 이 row의 나머지도 갱신
                    for (let j = i + 1; j < row.length; j++) {
                        row[j].x = positions[row[j].id].x;
                    }
                }
            }
        }

        if (!anyShifted) break;
    }

    return positions;
}

// ── 링크 생성 ────────────────────────────────────

function buildLinks(connectedIds, maps) {
    const { parentOf, spousesOf } = maps;
    const links = [];
    const seen = new Set();
    const idSet = new Set(connectedIds);

    for (const id of connectedIds) {
        const parents = (parentOf[id] || []).filter(p => idSet.has(p));
        for (const pid of parents) {
            const key = `parent:${pid}:${id}`;
            if (!seen.has(key)) {
                links.push({ source: pid, target: id, type: 'parent' });
                seen.add(key);
            }
        }

        const spouses = (spousesOf[id] || []).filter(s => idSet.has(s));
        for (const sid of spouses) {
            const key = `spouse:${[id, sid].sort().join(':')}`;
            if (!seen.has(key)) {
                links.push({ source: id, target: sid, type: 'spouse' });
                seen.add(key);
            }
        }
    }

    return links;
}

// ── 트리 검증 함수 ──────────────────────────────
/**
 * buildTree 결과 검증
 * - 규칙서 §2: 그리드 200px, 세대간격 220px
 * - 규칙서 §3: 남좌여우, 배우자 인접
 *
 * @param {Array} nodes - buildTree 출력 nodes (x, y, data.name, data.gender)
 * @param {Array} links - buildTree 출력 links (type: 'spouse'|'parent', source, target)
 * @returns {string[]} 오류 메시지 배열 (빈 배열 = 통과)
 */
function validateTree(nodes, links) {
    const errors = [];

    // z=0 (화면에 보이는 노드만 검사)
    const z0 = nodes.filter(n => n.z === 0);
    const nodesMap = {};
    for (const n of nodes) nodesMap[n.id] = n;

    // 부부 쌍 집합 (부부는 CARD_W=220 간격, 나머지는 SLOT_W=240 최소)
    const spouseLinks = links.filter(l => l.type === 'spouse');
    const spousePairSet = new Set(spouseLinks.map(l => [l.source, l.target].sort().join(':')));

    // 1. 겹침/간격 검사 (§22 §23: 최소 20px 간격)
    for (let i = 0; i < z0.length; i++) {
        for (let j = i + 1; j < z0.length; j++) {
            if (Math.round(z0[i].y) !== Math.round(z0[j].y)) continue;
            const key = [z0[i].id, z0[j].id].sort().join(':');
            const isSpouse = spousePairSet.has(key);
            const dist = Math.abs(z0[i].x - z0[j].x);
            const minDist = isSpouse ? CARD_W : SLOT_W; // 부부: 220, 나머지: 240(=220+20)
            if (dist < minDist) {
                errors.push(`간격 오류: ${z0[i].data.name}과 ${z0[j].data.name} (간격: ${dist}px, 최소: ${minDist}px)`);
            }
        }
    }

    // 2. 부부 인접 검사 (x 차이 = CARD_W = 220px, 부부는 간격 0으로 붙어있음)
    for (const l of spouseLinks) {
        const a = nodesMap[l.source];
        const b = nodesMap[l.target];
        if (a && b && Math.abs(a.x - b.x) !== CARD_W) {
            errors.push(`부부 간격 오류: ${a.data.name}과 ${b.data.name} (간격: ${Math.abs(a.x - b.x)}px, 기대: ${CARD_W}px)`);
        }
    }

    // 3. 남좌여우 검사 (남성 x < 여성 x)
    for (const l of spouseLinks) {
        const a = nodesMap[l.source];
        const b = nodesMap[l.target];
        if (!a || !b) continue;
        const male   = a.data.gender === 'M' ? a : b;
        const female = a.data.gender === 'M' ? b : a;
        if (male.data.gender === 'M' && female.data.gender === 'F' && male.x > female.x) {
            errors.push(`남좌여우 위반: ${male.data.name}이 오른쪽에 있음 (남x=${male.x}, 녀x=${female.x})`);
        }
    }

    // 4. 세대 간격 검사 (부모 y = 자녀 y + Y_GAP = 220)
    const parentLinks = links.filter(l => l.type === 'parent');
    for (const l of parentLinks) {
        const parent = nodesMap[l.source];
        const child  = nodesMap[l.target];
        if (parent && child && parent.y !== child.y + Y_GAP) {
            errors.push(`세대간격 오류: ${parent.data.name}→${child.data.name} (부모y=${parent.y}, 자녀y=${child.y}, 기대차=${Y_GAP})`);
        }
    }

    if (errors.length > 0) {
        console.error('=== 트리 검증 실패 ===', errors);
    } else {
        console.log('=== 트리 검증 통과 ===');
    }
    return errors;
}

// ── 메인 함수 ────────────────────────────────────

/**
 * @param {Array} persons - DB persons 배열
 * @param {Array} relations - DB person_relations 배열
 * @param {string|number|null} overrideMainId - mainId 강제 지정
 * @returns {{ nodes, links, mainId, constants }}
 */
export function buildTree(persons, relations, overrideMainId = null) {
    if (!persons || persons.length === 0) {
        return { nodes: [], links: [], mainId: null, constants: { SLOT_W, Y_GAP, CARD_W, CARD_GAP } };
    }

    const byId = {};
    for (const p of persons) {
        byId[String(p.id)] = { ...p, gender: normalizeGender(p.gender) };
    }

    let maps = buildMaps(persons, relations || []);
    const mainId = overrideMainId ? String(overrideMainId) : pickMainId(persons);
    console.log('[buildTree] mainId:', mainId, '(override:', overrideMainId, ')');

    // 가문전환 시 centerId 부부의 부모가 없으면 임시 부모 생성
    if (overrideMainId) {
        const centerSpouse = (maps.spousesOf[mainId] || [])[0] || null;
        for (const pid of [mainId, centerSpouse].filter(Boolean)) {
            const hasParents = (maps.parentOf[pid] || []).length > 0;
            if (!hasParents) {
                const person = byId[pid];
                const surname = (person?.name || '').charAt(0);
                const fatherId = `_tmp_father_${pid}`;
                const motherId = `_tmp_mother_${pid}`;
                const fatherName = surname ? `${person.name}의 아버지` : '아버지';
                const motherName = surname ? `${person.name}의 어머니` : '어머니';
                const cc = person?.oc_id ? person.oc_id.split('-')[0] : 'KR';

                byId[fatherId] = { id: fatherId, name: fatherName, gender: 'M', oc_id: '', _temp: true };
                byId[motherId] = { id: motherId, name: motherName, gender: 'F', oc_id: '', _temp: true };
                persons = [...persons, byId[fatherId], byId[motherId]];

                const newRels = [
                    { person1_id: fatherId, person2_id: motherId, relation_type: 'spouse' },
                    { person1_id: fatherId, person2_id: pid, relation_type: 'parent' },
                    { person1_id: motherId, person2_id: pid, relation_type: 'parent' },
                ];
                relations = [...(relations || []), ...newRels];
                maps = buildMaps(persons, relations);
            }
        }
    }

    // 연결된 노드만 필터
    const allIds = persons.map(p => String(p.id));
    const connectedIds = filterConnected(allIds, maps, mainId);

    // 관계 기반 depth (DB generation 무시)
    const depthMap = computeDepth(mainId, maps);

    // Z축 분류 — 가문전환 여부 무관, 항상 classifyZ 실행
    const rawZMap = classifyZ(mainId, maps, depthMap, byId);

    // §22 표시 범위 필터: 직계 조부모까지만 표시, 증조부모+ 숨김
    const mainSpouseId = (maps.spousesOf[mainId] || [])[0] || null;
    const directAncestors = getDirectAncestorIds(mainId, mainSpouseId, maps, DISPLAY_MAX_ANCESTOR_DEPTH);
    const zMap = applyDisplayRange(rawZMap, depthMap, directAncestors);

    // CoupleBlock 레이아웃
    const positions = layoutCoupleBlock(mainId, maps, byId, depthMap, connectedIds);

    // 노드 조립
    const nodes = connectedIds.map(id => {
        const person = byId[id];
        const pos = positions[id] || { x: 0, y: (depthMap[id] || 0) * Y_GAP };
        const depth = depthMap[id] ?? 0;
        const zLevel = zMap[id] ?? 1;

        return {
            id,
            x: pos.x,
            y: pos.y,
            depth,
            z: zLevel,
            data: buildNodeData(person),
            rels: {
                parents: (maps.parentOf[id] || []).filter(p => connectedIds.includes(p)),
                spouses: (maps.spousesOf[id] || []).filter(s => connectedIds.includes(s)),
                children: (maps.childrenOf[id] || []).filter(c => connectedIds.includes(c)),
            },
        };
    });

    const links = buildLinks(connectedIds, maps);

    validateTree(nodes, links);

    return {
        nodes,
        links,
        mainId,
        constants: { SLOT_W, Y_GAP, CARD_W, CARD_GAP },
    };
}

// 개별 export (테스트용)
export {
    normalizeGender,
    parseName,
    getInitials,
    isKoreanName,
    buildMaps,
    filterConnected,
    pickMainId,
    computeDepth,
    classifyZ,
    buildNodeData,
    getSiblings,
    SLOT_W,
    Y_GAP,
    CARD_W,
    CARD_H,
    CARD_GAP,
};
