/**
 * familyChartAdapter.js
 * DB persons + person_relations → family-chart 형식 변환
 *
 * family-chart Datum 형식:
 * { id: string, data: { gender: 'M'|'F', ...custom }, rels: { parents: string[], spouses: string[], children: string[] } }
 */

/**
 * 한국어 이름인지 판별 (한글 포함 여부)
 */
function isKoreanName(name) {
    return /[\uAC00-\uD7A3]/.test(name);
}

/**
 * 이름 파싱: 한국식은 성+이름, 영문은 first+last
 * DB에는 name 하나로 저장됨 → display_name으로 그대로 사용
 */
function parseName(name) {
    if (!name) return { displayName: '?', firstName: '?', lastName: '' };

    const trimmed = name.trim();

    if (isKoreanName(trimmed)) {
        // 한국식: 첫 글자가 성, 나머지가 이름
        // "이한봉" → 성: 이, 이름: 한봉
        const lastName = trimmed.charAt(0);
        const firstName = trimmed.slice(1) || trimmed;
        return { displayName: trimmed, firstName, lastName };
    }

    // 영문식: "John Lambert" → first: John, last: Lambert
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

/**
 * 이니셜 생성
 */
function getInitials(name) {
    if (!name) return '?';
    if (isKoreanName(name)) {
        return name.slice(0, 2);
    }
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

/**
 * persons + person_relations → family-chart Data 형식으로 변환
 *
 * @param {Array} persons - DB persons 배열
 * @param {Array} relations - DB person_relations 배열
 * @returns {Array} family-chart Data 형식
 */
// DB gender ('M'/'F') → 내부 통일 형식 ('male'/'female')
function normalizeGender(g) {
    if (!g) return 'male';
    const lower = String(g).toLowerCase();
    if (lower === 'f' || lower === 'female') return 'female';
    return 'male';
}

export function personsToFamilyChart(persons, relations = []) {
    if (!persons || persons.length === 0) return [];

    const byId = {};
    for (const p of persons) {
        byId[String(p.id)] = { ...p, gender: normalizeGender(p.gender) };
    }

    // sibling relations으로 부모 공유 처리
    // 형제 중 한쪽에 부모가 있으면 다른 쪽에도 복사 (차트 데이터만, DB 미변경)
    // 둘 다 부모 없으면 → 연결 불가 → filterConnectedNodes에서 제거됨
    const siblingRelations = relations.filter(r => r.relation_type === 'sibling');

    for (const rel of siblingRelations) {
        const id1 = String(rel.person1_id);
        const id2 = String(rel.person2_id);
        const p1 = byId[id1];
        const p2 = byId[id2];
        if (!p1 || !p2) continue;

        if (p1.parent1_id && byId[String(p1.parent1_id)] && !p2.parent1_id) {
            byId[id2] = { ...p2, parent1_id: p1.parent1_id, parent2_id: p1.parent2_id };
        } else if (p2.parent1_id && byId[String(p2.parent1_id)] && !p1.parent1_id) {
            byId[id1] = { ...p1, parent1_id: p2.parent1_id, parent2_id: p2.parent2_id };
        }
        // 둘 다 부모 없으면 → 가상 부모 생성하지 않음 (spouse 트리 구조 깨짐 방지)
    }

    const effectivePersons = persons.map(p => byId[String(p.id)] || p);

    // 자녀 역참조 맵 구성: parentId → [childId, ...]
    const childrenMap = {};
    for (const p of effectivePersons) {
        if (p.parent1_id && byId[String(p.parent1_id)]) {
            const pid = String(p.parent1_id);
            if (!childrenMap[pid]) childrenMap[pid] = [];
            if (!childrenMap[pid].includes(String(p.id))) {
                childrenMap[pid].push(String(p.id));
            }
        }
        if (p.parent2_id && byId[String(p.parent2_id)]) {
            const pid = String(p.parent2_id);
            if (!childrenMap[pid]) childrenMap[pid] = [];
            if (!childrenMap[pid].includes(String(p.id))) {
                childrenMap[pid].push(String(p.id));
            }
        }
    }

    // family-chart 데이터 변환
    const data = effectivePersons.map((p) => {
        const id = String(p.id);
        const { displayName, firstName, lastName } = parseName(p.name);

        // parents 배열 — 남성 부모를 먼저, 여성 부모를 나중에 배치
        // family-chart는 parents[0]이 왼쪽, parents[1]이 오른쪽에 배치됨
        const rawParents = [];
        if (p.parent1_id && byId[String(p.parent1_id)]) rawParents.push(byId[String(p.parent1_id)]);
        if (p.parent2_id && byId[String(p.parent2_id)]) rawParents.push(byId[String(p.parent2_id)]);
        // 남성 부모 먼저 (왼쪽), 여성 부모 나중 (오른쪽)
        rawParents.sort((a, b) => {
            if (a.gender === 'male' && b.gender !== 'male') return -1;
            if (a.gender !== 'male' && b.gender === 'male') return 1;
            return 0;
        });
        const parents = rawParents.map(pp => String(pp.id));

        // spouses 배열
        const spouses = [];
        if (p.spouse_id && byId[String(p.spouse_id)]) spouses.push(String(p.spouse_id));

        // children 배열 (역참조) — 출생순 정렬 (관계 기반 배치)
        const rawChildren = childrenMap[id] || [];
        const children = [...rawChildren].sort((a, b) => {
            const pA = byId[a];
            const pB = byId[b];
            // 출생일 기준 정렬, 없으면 ID 순
            const dateA = pA?.birth_date ? new Date(pA.birth_date).getTime() : Infinity;
            const dateB = pB?.birth_date ? new Date(pB.birth_date).getTime() : Infinity;
            if (dateA !== dateB) return dateA - dateB;
            return Number(a) - Number(b);
        });

        // 생년/사망년 문자열
        const birthYear = p.birth_date
            ? new Date(p.birth_date).getUTCFullYear()
            : p.birth_year || null;
        const deathYear = p.death_date
            ? new Date(p.death_date).getUTCFullYear()
            : p.death_year || null;

        const birthPrefix = p.birth_lunar ? '음 ' : '';
        const isDeceased = p.is_deceased || !!p.death_date;
        let dateLabel = '';
        if (birthYear && deathYear) {
            dateLabel = `${birthPrefix}${birthYear} ~ ${deathYear}`;
        } else if (birthYear && isDeceased) {
            // 고인인데 사망일 미상
            dateLabel = `${birthPrefix}${birthYear} ~`;
        }
        // 살아있는 사람은 생년월일 표시하지 않음

        return {
            id,
            data: {
                'first name': firstName,
                'last name': lastName,
                'display_name': displayName,
                gender: p.gender === 'male' ? 'M' : p.gender === 'female' ? 'F' : 'M',
                birthday: p.birth_date || '',
                avatar: p.photo_url || '',
                photo_position: p.photo_position || { x: 50, y: 50 },
                date_label: dateLabel,
                is_deceased: p.is_deceased || !!p.death_date,
                birth_lunar: p.birth_lunar || false,
                death_lunar: p.death_lunar || false,
                fs_person_id: p.fs_person_id || '',
                privacy_level: p.privacy_level || 'family',
                initials: getInitials(p.name),
                generation: p.generation || 0,
            },
            rels: {
                parents,
                spouses,
                children,
            },
        };
    });

    return data;
}

/**
 * 메인 인물에서 도달 가능한 노드만 필터링 (BFS)
 * 단절된 고아 노드는 family-chart 크래시를 유발하므로 제외
 */
export function filterConnectedNodes(data, mainId) {
    if (!data || data.length === 0 || !mainId) return data;

    const mainStr = String(mainId);
    // mainId가 데이터에 없으면 필터링 하지 않음 (전체 데이터 유지)
    if (!data.find(d => d.id === mainStr)) return data;

    // 양방향 adjacency 구성 (A→B가 있으면 B→A도 추가)
    const adjacency = {};
    for (const node of data) {
        if (!adjacency[node.id]) adjacency[node.id] = new Set();
        for (const pid of (node.rels.parents || [])) {
            adjacency[node.id].add(pid);
            if (!adjacency[pid]) adjacency[pid] = new Set();
            adjacency[pid].add(node.id);
        }
        for (const sid of (node.rels.spouses || [])) {
            adjacency[node.id].add(sid);
            if (!adjacency[sid]) adjacency[sid] = new Set();
            adjacency[sid].add(node.id);
        }
        for (const cid of (node.rels.children || [])) {
            adjacency[node.id].add(cid);
            if (!adjacency[cid]) adjacency[cid] = new Set();
            adjacency[cid].add(node.id);
        }
    }

    const connected = new Set();
    const queue = [mainStr];
    while (queue.length > 0) {
        const current = queue.shift();
        if (connected.has(current)) continue;
        connected.add(current);
        const neighbors = adjacency[current];
        if (neighbors) {
            for (const n of neighbors) {
                if (!connected.has(n)) queue.push(n);
            }
        }
    }

    const filtered = data.filter(d => connected.has(d.id));
    // 필터 결과가 비어있으면 원본 유지 (트리 사라짐 방지)
    return filtered.length > 0 ? filtered : data;
}

/**
 * family-chart 메인 인물 ID 결정
 *
 * 최하위 세대(가장 낮은 generation)에서 양쪽 부모가 있는 인물 우선 선택.
 * family-chart는 mainId에서 위로만 조상을 추적하므로,
 * 최하위 세대를 main으로 해야 양가 부모/조부모가 모두 표시됨.
 */
export function getMainPersonId(persons) {
    if (!persons || persons.length === 0) return null;

    // 양쪽 부모가 모두 있는 인물 중 가장 낮은 세대(generation) 선택
    const withBothParents = persons
        .filter(p => p.parent1_id && p.parent2_id)
        .sort((a, b) => (a.generation - b.generation) || (a.id - b.id));

    if (withBothParents.length > 0) {
        return String(withBothParents[0].id);
    }

    // 부모가 한 명이라도 있는 인물
    const withParent = persons
        .filter(p => p.parent1_id)
        .sort((a, b) => (a.generation - b.generation) || (a.id - b.id));

    if (withParent.length > 0) {
        return String(withParent[0].id);
    }

    // 부모 없으면 가장 낮은 세대
    const sorted = [...persons].sort((a, b) => (a.generation - b.generation) || (a.id - b.id));
    return String(sorted[0].id);
}

export { parseName, getInitials, isKoreanName };
