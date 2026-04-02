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

    // person_relations에서 관계 맵 구성 (정본)
    // parentMap: childId → [parentId, ...]
    // spouseMap: personId → [spouseId, ...]
    // childrenMap: parentId → [childId, ...]
    const parentMap = {};
    const spouseMap = {};
    const childrenMap = {};

    for (const rel of relations) {
        const p1 = String(rel.person1_id);
        const p2 = String(rel.person2_id);

        if (rel.relation_type === 'parent' && byId[p1] && byId[p2]) {
            // person1=부모, person2=자녀
            if (!parentMap[p2]) parentMap[p2] = [];
            if (!parentMap[p2].includes(p1)) parentMap[p2].push(p1);
            if (!childrenMap[p1]) childrenMap[p1] = [];
            if (!childrenMap[p1].includes(p2)) childrenMap[p1].push(p2);
        }

        if (rel.relation_type === 'spouse' && byId[p1] && byId[p2]) {
            if (!spouseMap[p1]) spouseMap[p1] = [];
            if (!spouseMap[p1].includes(p2)) spouseMap[p1].push(p2);
            if (!spouseMap[p2]) spouseMap[p2] = [];
            if (!spouseMap[p2].includes(p1)) spouseMap[p2].push(p1);
        }

        if (rel.relation_type === 'sibling' && byId[p1] && byId[p2]) {
            // 형제 중 한쪽에 부모가 있으면 다른 쪽에도 공유 (차트 데이터만)
            const parents1 = parentMap[p1] || [];
            const parents2 = parentMap[p2] || [];
            if (parents1.length > 0 && parents2.length === 0) {
                parentMap[p2] = [...parents1];
                for (const pid of parents1) {
                    if (!childrenMap[pid]) childrenMap[pid] = [];
                    if (!childrenMap[pid].includes(p2)) childrenMap[pid].push(p2);
                }
            } else if (parents2.length > 0 && parents1.length === 0) {
                parentMap[p1] = [...parents2];
                for (const pid of parents2) {
                    if (!childrenMap[pid]) childrenMap[pid] = [];
                    if (!childrenMap[pid].includes(p1)) childrenMap[pid].push(p1);
                }
            }
        }
    }

    // person_relations에 데이터가 없으면 persons 컬럼 폴백 (과도기)
    const hasRelationData = relations.some(r => r.relation_type === 'parent' || r.relation_type === 'spouse');

    if (!hasRelationData) {
        for (const p of persons) {
            const id = String(p.id);
            if (p.parent1_id && byId[String(p.parent1_id)]) {
                if (!parentMap[id]) parentMap[id] = [];
                if (!parentMap[id].includes(String(p.parent1_id))) parentMap[id].push(String(p.parent1_id));
                const pid = String(p.parent1_id);
                if (!childrenMap[pid]) childrenMap[pid] = [];
                if (!childrenMap[pid].includes(id)) childrenMap[pid].push(id);
            }
            if (p.parent2_id && byId[String(p.parent2_id)]) {
                if (!parentMap[id]) parentMap[id] = [];
                if (!parentMap[id].includes(String(p.parent2_id))) parentMap[id].push(String(p.parent2_id));
                const pid = String(p.parent2_id);
                if (!childrenMap[pid]) childrenMap[pid] = [];
                if (!childrenMap[pid].includes(id)) childrenMap[pid].push(id);
            }
            if (p.spouse_id && byId[String(p.spouse_id)]) {
                if (!spouseMap[id]) spouseMap[id] = [];
                if (!spouseMap[id].includes(String(p.spouse_id))) spouseMap[id].push(String(p.spouse_id));
            }
        }
    }

    // family-chart 데이터 변환
    const data = persons.map((p) => {
        const id = String(p.id);
        const { displayName, firstName, lastName } = parseName(p.name);

        // parents 배열 — 남성 부모를 먼저 (왼쪽), 여성 부모를 나중에 (오른쪽)
        const rawParents = (parentMap[id] || [])
            .filter(pid => byId[pid])
            .map(pid => byId[pid]);
        rawParents.sort((a, b) => {
            if (a.gender === 'male' && b.gender !== 'male') return -1;
            if (a.gender !== 'male' && b.gender === 'male') return 1;
            return a.id - b.id;
        });
        const parents = rawParents.map(pp => String(pp.id));

        // spouses 배열
        const spouses = (spouseMap[id] || []).filter(sid => byId[sid]);

        // children 배열 — 출생순 정렬
        const rawChildren = childrenMap[id] || [];
        const children = [...rawChildren].sort((a, b) => {
            const pA = byId[a];
            const pB = byId[b];
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
 * gen 1 중 가장 낮은 id → 형제 추가해도 변경 없음
 * gen 1을 main으로 해야 후손(아래) + 형제 + 본인 부모(위) 모두 표시됨.
 * 배우자 부모는 setupSpouseAncestry 패치로 별도 처리.
 */
export function getMainPersonId(persons) {
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

export { parseName, getInitials, isKoreanName };
