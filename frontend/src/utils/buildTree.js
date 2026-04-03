/**
 * buildTree.js — VISION.md v2.0 레고 블록 표준 준수
 *
 * persons[] + person_relations[] → { nodes[], links[], mainId, constants }
 *
 * 핵심 원칙:
 * - 220px 그리드 (180px 블록 + 40px 간격)
 * - Y축: 조상↑(+270) 자손↓(-270), 본인=0
 * - X축: 남편형제→좌, 아내형제→우
 * - Z축: 타가문 레이어 (0/1/2)
 * - DB generation 사용 금지 → 관계 기반 BFS depth
 */

// ── 레고 표준 상수 (VISION.md 2.2) ─────────────
const SLOT_W = 220;     // 한 사람 = 180px + 40px 간격
const Y_GAP = 270;      // 세대 간 수직 간격
const CARD_W = 180;     // 카드 실제 폭
const CARD_GAP = 40;    // 카드 사이 간격

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

    for (const rel of relations) {
        const p1 = String(rel.person1_id);
        const p2 = String(rel.person2_id);
        if (!idSet.has(p1) || !idSet.has(p2)) continue;

        if (rel.relation_type === 'parent') {
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

    return { parentOf, childrenOf, spousesOf };
}

// ── 연결된 노드 필터 (BFS) ──────────────────────

function filterConnected(personIds, maps, mainId) {
    const mainStr = String(mainId);
    if (!personIds.includes(mainStr)) return personIds;

    const { parentOf, childrenOf, spousesOf } = maps;
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

// ── Z축 분류 (VISION.md 3장) ────────────────────

function classifyZ(mainId, maps, depthMap, byId) {
    const { parentOf, childrenOf, spousesOf } = maps;
    const z = {};

    // main + main의 배우자 → Z=0
    z[mainId] = 0;
    const mainSpouse = (spousesOf[mainId] || [])[0] || null;
    if (mainSpouse) z[mainSpouse] = 0;

    // main의 부모/조부모 (직계 혈족) → Z=0
    function markAncestors(id) {
        for (const pid of (parentOf[id] || [])) {
            if (z[pid] === undefined) {
                z[pid] = 0;
                markAncestors(pid);
            }
        }
    }
    markAncestors(mainId);

    // main의 자녀/손자 (직계 후손) → Z=0
    function markDescendants(id) {
        for (const cid of (childrenOf[id] || [])) {
            if (z[cid] === undefined) {
                z[cid] = 0;
                markDescendants(cid);
            }
        }
    }
    markDescendants(mainId);
    if (mainSpouse) markDescendants(mainSpouse);

    // main의 형제 + 형제의 배우자 + 형제의 자녀 → Z=0
    const mainParents = parentOf[mainId] || [];
    for (const pid of mainParents) {
        for (const sib of (childrenOf[pid] || [])) {
            if (z[sib] === undefined) z[sib] = 0;
            // 형제의 배우자 → Z=0
            for (const sibSpouse of (spousesOf[sib] || [])) {
                if (z[sibSpouse] === undefined) z[sibSpouse] = 0;
            }
            // 형제의 자녀 (조카) → Z=0
            for (const nephew of (childrenOf[sib] || [])) {
                if (z[nephew] === undefined) z[nephew] = 0;
            }
        }
    }

    // 배우자의 형제 + 형제의 배우자 + 형제의 자녀 → Z=0
    if (mainSpouse) {
        const spouseParents = parentOf[mainSpouse] || [];
        for (const pid of spouseParents) {
            if (z[pid] === undefined) z[pid] = 0;
            for (const sib of (childrenOf[pid] || [])) {
                if (z[sib] === undefined) z[sib] = 0;
                for (const sibSpouse of (spousesOf[sib] || [])) {
                    if (z[sibSpouse] === undefined) z[sibSpouse] = 0;
                }
                for (const nephew of (childrenOf[sib] || [])) {
                    if (z[nephew] === undefined) z[nephew] = 0;
                }
            }
        }
    }

    // 자녀의 배우자 → Z=0
    const mainChildren = childrenOf[mainId] || [];
    for (const cid of mainChildren) {
        for (const cSpouse of (spousesOf[cid] || [])) {
            if (z[cSpouse] === undefined) z[cSpouse] = 0;
        }
    }

    // 나머지: Z=1 (직계가 아닌 인척)
    for (const id of Object.keys(depthMap)) {
        if (z[id] === undefined) z[id] = 1;
    }

    return z;
}

function zOpacity(zLevel) {
    if (zLevel === 0) return 1.0;
    if (zLevel === 1) return 0.4;
    return 0.15;
}

function zScale(zLevel) {
    if (zLevel === 0) return 1.0;
    if (zLevel === 1) return 0.85;
    return 0.7;
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
        fsPersonId: person.fs_person_id || '',
        privacyLevel: person.privacy_level || 'family',
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
 * 메인 부부를 중심으로 200px 그리드 X 배치
 * - 남편 형제 → 왼쪽 확장
 * - 아내 형제 → 오른쪽 확장
 * - 형제 배우자 → 커플블록화 (자동 밀림)
 */
function layoutCoupleBlock(mainId, maps, byId, depthMap, connectedIds) {
    const positions = {};  // id → { x, y }
    const connSet = new Set(connectedIds);
    const { spousesOf, parentOf, childrenOf } = maps;

    // 메인 커플
    const mainSpouse = (spousesOf[mainId] || []).find(s => connSet.has(s)) || null;

    // 메인 부부 배치: 남편 x=-HALF, 아내 x=+HALF
    const HALF = SLOT_W / 2;  // 커플 오프셋 (110px)
    const husbandId = byId[mainId]?.gender === 'M' ? mainId : mainSpouse;
    const wifeId = byId[mainId]?.gender === 'M' ? mainSpouse : mainId;

    if (husbandId) positions[husbandId] = { x: -HALF, y: 0 };
    if (wifeId) positions[wifeId] = { x: HALF, y: 0 };

    // ── 형제 배치 함수: 서브트리 너비 기반 배치 ──
    function placeSiblings(personId, direction, childXBound) {
        // direction: -1=왼쪽(남편측), +1=오른쪽(아내측)
        if (!personId) return;
        const sibs = getSiblings(personId, maps, byId).filter(s => connSet.has(s));
        if (sibs.length === 0) return;

        // 형제의 서브트리 슬롯 수 = max(부모슬롯, 자녀슬롯)
        function subtreeSlots(sibId) {
            const sp = (spousesOf[sibId] || []).find(s => connSet.has(s)) || null;
            const pSlots = sp ? 2 : 1;
            const couple = sp ? [sibId, sp] : [sibId];
            const kids = new Set();
            for (const p of couple) {
                for (const c of (childrenOf[p] || [])) {
                    if (connSet.has(c)) kids.add(c);
                }
            }
            let kSlots = 0;
            for (const k of kids) {
                const kSp = (spousesOf[k] || []).find(s => connSet.has(s)) || null;
                kSlots += kSp ? 2 : 1;
            }
            return Math.max(pSlots, kSlots);
        }

        // edge = 가장 가까운 사용 가능 센터 좌표
        const defaultEdge = direction === -1 ? -(HALF + SLOT_W) : (HALF + SLOT_W);
        let edge;
        if (childXBound !== null) {
            edge = direction === -1
                ? Math.min(childXBound - SLOT_W, defaultEdge)
                : Math.max(childXBound + SLOT_W, defaultEdge);
        } else {
            edge = defaultEdge;
        }

        for (const sibId of sibs) {
            if (positions[sibId]) continue;

            const sp = (spousesOf[sibId] || []).find(s => connSet.has(s) && !positions[s]) || null;
            const treeW = subtreeSlots(sibId);

            // 부모 중심: 서브트리 너비만큼 할당된 공간의 중심
            const parentCenter = edge + direction * (treeW - 1) * SLOT_W / 2;

            if (sp) {
                const sibM = byId[sibId]?.gender === 'M' ? sibId : sp;
                const sibF = byId[sibId]?.gender === 'M' ? sp : sibId;
                positions[sibM] = { x: parentCenter - HALF, y: 0 };
                positions[sibF] = { x: parentCenter + HALF, y: 0 };
            } else {
                positions[sibId] = { x: parentCenter, y: 0 };
            }

            // 다음 형제를 위해 edge 이동 (서브트리 너비만큼)
            edge += direction * treeW * SLOT_W;
        }
    }

    // ── 자녀 먼저 배치 (형제보다 선행) ──
    // placeChildren은 아래에서 정의

    // ── 부모 세대 (depth +1) ──
    function placeParents(personId, side) {
        // side: 'left' or 'right' — 남편측/아내측 중심에 배치
        if (!personId) return;
        const parents = (parentOf[personId] || []).filter(p => connSet.has(p));
        if (parents.length === 0) return;

        // 해당 측 전체 x 범위 계산 (본인 + 형제)
        const sibs = getSiblings(personId, maps, byId).filter(s => connSet.has(s) && positions[s]);
        const sideIds = [personId, ...sibs];
        const sideXs = sideIds.map(id => positions[id]?.x).filter(x => x !== undefined);
        if (sideXs.length === 0) return;

        // 형제가 없으면 본인 x에서 바깥쪽으로 100px 오프셋 (양가 부모 겹침 방지)
        // 있으면 형제 전체 범위의 중앙
        const centerX = sibs.length === 0
            ? positions[personId].x + (side === 'left' ? -HALF : HALF)
            : (Math.min(...sideXs) + Math.max(...sideXs)) / 2;
        const y = Y_GAP;

        // 부모 중 남성/여성 분리
        const father = parents.find(p => byId[p]?.gender === 'M');
        const mother = parents.find(p => byId[p]?.gender === 'F');

        if (father && mother) {
            positions[father] = { x: centerX - HALF, y };
            positions[mother] = { x: centerX + HALF, y };
        } else if (parents.length === 1) {
            positions[parents[0]] = { x: centerX, y };
        } else {
            // 성별 불명이면 순서대로
            positions[parents[0]] = { x: centerX - HALF, y };
            if (parents[1]) positions[parents[1]] = { x: centerX + HALF, y };
        }
    }

    // placeParents는 형제 배치 후 호출 (형제 위치를 참조하므로)

    // ── 자녀 세대 (depth -1) ──
    function placeChildren(coupleIds) {
        const childSet = new Set();
        for (const pid of coupleIds) {
            for (const cid of (childrenOf[pid] || [])) {
                if (connSet.has(cid)) childSet.add(cid);
            }
        }
        const children = [...childSet];
        // 출생순
        children.sort((a, b) => {
            const pA = byId[a];
            const pB = byId[b];
            const dA = pA?.birth_date ? new Date(pA.birth_date).getTime() : Infinity;
            const dB = pB?.birth_date ? new Date(pB.birth_date).getTime() : Infinity;
            if (dA !== dB) return dA - dB;
            return Number(a) - Number(b);
        });

        if (children.length === 0) return;

        // 자녀를 슬롯 단위로 배열 (배우자 있으면 2슬롯)
        const slots = [];
        const placed = new Set();

        for (const cid of children) {
            if (placed.has(cid)) continue;
            const cSpouse = (spousesOf[cid] || []).find(s => connSet.has(s) && !placed.has(s)) || null;
            if (cSpouse) {
                const m = byId[cid]?.gender === 'M' ? cid : cSpouse;
                const f = byId[cid]?.gender === 'M' ? cSpouse : cid;
                slots.push({ ids: [m, f], type: 'couple' });
                placed.add(cid);
                placed.add(cSpouse);
            } else {
                slots.push({ ids: [cid], type: 'solo' });
                placed.add(cid);
            }
        }

        // 부모 중심 x
        const parentXs = coupleIds.map(id => positions[id]?.x).filter(x => x !== undefined);
        const parentCenter = parentXs.length > 0
            ? (Math.min(...parentXs) + Math.max(...parentXs)) / 2
            : 0;

        // 총 슬롯 수
        let totalSlots = 0;
        for (const s of slots) totalSlots += s.ids.length;
        const totalWidth = totalSlots * SLOT_W;

        let curX = parentCenter - totalWidth / 2 + HALF; // 첫 슬롯 중심

        const y = (depthMap[coupleIds[0]] || 0) * Y_GAP - Y_GAP;

        for (const slot of slots) {
            if (slot.type === 'couple') {
                positions[slot.ids[0]] = { x: curX, y };
                curX += SLOT_W;
                positions[slot.ids[1]] = { x: curX, y };
                curX += SLOT_W;
            } else {
                positions[slot.ids[0]] = { x: curX, y };
                curX += SLOT_W;
            }
        }

        // 재귀: 자녀 커플의 자녀도 배치
        for (const slot of slots) {
            const subCoupleIds = slot.ids.filter(id => connSet.has(id));
            placeChildren(subCoupleIds);
        }
    }

    const mainCouple = [husbandId, wifeId].filter(Boolean);

    // 1단계: 메인 부부의 자녀 먼저 배치
    placeChildren(mainCouple);

    // 2단계: 자녀들의 X 범위 계산 (재귀 자녀 포함)
    function getDescendantXRange(coupleIds) {
        const allDescXs = [];
        function collectChildXs(parents) {
            for (const pid of parents) {
                for (const cid of (childrenOf[pid] || [])) {
                    if (positions[cid]) {
                        allDescXs.push(positions[cid].x);
                        const cSpouse = (spousesOf[cid] || []).find(s => positions[s]);
                        const subCouple = cSpouse ? [cid, cSpouse] : [cid];
                        collectChildXs(subCouple);
                    }
                }
            }
        }
        collectChildXs(coupleIds);
        if (allDescXs.length === 0) return { minX: null, maxX: null };
        return { minX: Math.min(...allDescXs), maxX: Math.max(...allDescXs) };
    }

    const childRange = getDescendantXRange(mainCouple);

    // 3단계: 형제를 자녀 X 범위 밖에 배치
    placeSiblings(husbandId, -1, childRange.minX);
    placeSiblings(wifeId, 1, childRange.maxX);

    // 3.5단계: 부모 배치 (형제 위치 참조 필요하므로 형제 배치 후)
    placeParents(husbandId, 'left');
    placeParents(wifeId, 'right');

    // 4단계: 형제 커플의 자녀도 배치
    if (husbandId) {
        const hSibs = getSiblings(husbandId, maps, byId).filter(s => connSet.has(s));
        for (const sibId of hSibs) {
            const sibSpouse = (spousesOf[sibId] || []).find(s => connSet.has(s)) || null;
            const sibCouple = sibSpouse ? [sibId, sibSpouse] : [sibId];
            placeChildren(sibCouple);
        }
    }
    if (wifeId) {
        const wSibs = getSiblings(wifeId, maps, byId).filter(s => connSet.has(s));
        for (const sibId of wSibs) {
            const sibSpouse = (spousesOf[sibId] || []).find(s => connSet.has(s)) || null;
            const sibCouple = sibSpouse ? [sibId, sibSpouse] : [sibId];
            placeChildren(sibCouple);
        }
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

    const maps = buildMaps(persons, relations || []);
    const mainId = overrideMainId ? String(overrideMainId) : pickMainId(persons);

    // 연결된 노드만 필터
    const allIds = persons.map(p => String(p.id));
    const connectedIds = filterConnected(allIds, maps, mainId);

    // 관계 기반 depth (DB generation 무시)
    const depthMap = computeDepth(mainId, maps);

    // Z축 분류
    const zMap = classifyZ(mainId, maps, depthMap, byId);

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
            zOpacity: zOpacity(zLevel),
            zScale: zScale(zLevel),
            data: buildNodeData(person),
            rels: {
                parents: (maps.parentOf[id] || []).filter(p => connectedIds.includes(p)),
                spouses: (maps.spousesOf[id] || []).filter(s => connectedIds.includes(s)),
                children: (maps.childrenOf[id] || []).filter(c => connectedIds.includes(c)),
            },
        };
    });

    const links = buildLinks(connectedIds, maps);

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
    zOpacity,
    zScale,
    buildNodeData,
    getSiblings,
    SLOT_W,
    Y_GAP,
    CARD_W,
    CARD_GAP,
};
