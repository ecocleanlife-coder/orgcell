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
export function personsToFamilyChart(persons, relations = []) {
    if (!persons || persons.length === 0) return [];

    const byId = {};
    for (const p of persons) {
        byId[String(p.id)] = p;
    }

    // 자녀 역참조 맵 구성: parentId → [childId, ...]
    const childrenMap = {};
    for (const p of persons) {
        if (p.parent1_id) {
            const pid = String(p.parent1_id);
            if (!childrenMap[pid]) childrenMap[pid] = [];
            if (!childrenMap[pid].includes(String(p.id))) {
                childrenMap[pid].push(String(p.id));
            }
        }
        if (p.parent2_id) {
            const pid = String(p.parent2_id);
            if (!childrenMap[pid]) childrenMap[pid] = [];
            if (!childrenMap[pid].includes(String(p.id))) {
                childrenMap[pid].push(String(p.id));
            }
        }
    }

    // family-chart 데이터 변환
    const data = persons.map((p) => {
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

        // children 배열 (역참조)
        const children = childrenMap[id] || [];

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
 * family-chart 메인 인물 ID 결정
 * gen 1 중 가장 낮은 id → 형제 추가해도 변경 없음
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
