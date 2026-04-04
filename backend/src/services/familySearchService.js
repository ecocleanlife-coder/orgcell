/**
 * familySearchService.js — FamilySearch API 래퍼
 *
 * 5개 함수: getPerson, getParents, getSpouses, getChildren, getMemories
 * - 요청 간 300ms 딜레이
 * - 429 응답 시 5초 대기 후 재시도 (최대 3회)
 */
const axios = require('axios');

const FS_API_BASE = process.env.FS_API_BASE || 'https://api-integ.familysearch.org';
const DELAY_MS = 300;
const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 3;

// ── 딜레이 유틸 ──
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── 마지막 요청 시간 (모듈 레벨, 전역 딜레이 관리) ──
let lastRequestTime = 0;

/**
 * FamilySearch API 호출 (딜레이 + 429 재시도 내장)
 */
async function fsRequest(token, path) {
    // 300ms 간격 보장
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < DELAY_MS) {
        await delay(DELAY_MS - elapsed);
    }

    let retries = 0;
    while (retries <= MAX_RETRIES) {
        try {
            lastRequestTime = Date.now();
            const { data } = await axios.get(`${FS_API_BASE}${path}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
                timeout: 15000,
            });
            return data;
        } catch (err) {
            if (err.response?.status === 429 && retries < MAX_RETRIES) {
                retries++;
                console.warn(`[FS] 429 Rate Limited — ${retries}/${MAX_RETRIES} 재시도 (${RETRY_DELAY_MS}ms 대기)`);
                await delay(RETRY_DELAY_MS);
                continue;
            }
            throw err;
        }
    }
}

/**
 * FS display 객체에서 연도 파싱
 */
function parseYear(dateStr) {
    if (!dateStr) return null;
    const m = dateStr.match(/\d{4}/);
    return m ? parseInt(m[0], 10) : null;
}

/**
 * FS persons 배열에서 display 정보 추출
 */
function extractPersonInfo(fsPerson) {
    const d = fsPerson?.display || {};
    return {
        fs_id: fsPerson?.id || null,
        name: d.name || 'Unknown',
        gender: d.gender === 'Male' ? 'male' : d.gender === 'Female' ? 'female' : 'other',
        birth_year: parseYear(d.birthDate),
        death_year: parseYear(d.deathDate),
        birth_place: d.birthPlace || null,
        death_place: d.deathPlace || null,
        living: fsPerson?.living ?? null,
        raw: fsPerson,
    };
}

// ════════════════════════════════════════
// 5개 API 래퍼 함수
// ════════════════════════════════════════

/**
 * 인물 정보 조회
 * GET /platform/tree/persons/{pid}
 */
async function getPerson(token, pid) {
    const data = await fsRequest(token, `/platform/tree/persons/${pid}`);
    const person = data?.persons?.[0];
    if (!person) return null;
    return extractPersonInfo(person);
}

/**
 * 부모 목록 조회
 * GET /platform/tree/persons/{pid}/parents
 * → childAndParentsRelationships에서 부모 pid 추출
 */
async function getParents(token, pid) {
    const data = await fsRequest(token, `/platform/tree/persons/${pid}/parents`);
    const rels = data?.childAndParentsRelationships || [];
    const parents = [];

    for (const rel of rels) {
        if (rel.parent1?.resourceId) {
            parents.push({ fs_id: rel.parent1.resourceId, role: 'parent1', rel_id: rel.id });
        }
        if (rel.parent2?.resourceId) {
            parents.push({ fs_id: rel.parent2.resourceId, role: 'parent2', rel_id: rel.id });
        }
    }

    // parents 배열에 인물 display 정보도 포함
    const persons = data?.persons || [];
    for (const p of parents) {
        const found = persons.find((fp) => fp.id === p.fs_id);
        if (found) {
            Object.assign(p, extractPersonInfo(found));
        }
    }

    return parents;
}

/**
 * 배우자 목록 조회
 * GET /platform/tree/persons/{pid}/spouses
 */
async function getSpouses(token, pid) {
    const data = await fsRequest(token, `/platform/tree/persons/${pid}/spouses`);
    const rels = data?.relationships || [];
    const spouses = [];

    for (const rel of rels) {
        // person1/person2 중 본인이 아닌 쪽이 배우자
        const p1 = rel.person1?.resourceId;
        const p2 = rel.person2?.resourceId;
        const spouseId = p1 === pid ? p2 : p1;
        if (spouseId) {
            spouses.push({ fs_id: spouseId, rel_id: rel.id });
        }
    }

    const persons = data?.persons || [];
    for (const s of spouses) {
        const found = persons.find((fp) => fp.id === s.fs_id);
        if (found) {
            Object.assign(s, extractPersonInfo(found));
        }
    }

    return spouses;
}

/**
 * 자녀 목록 조회
 * GET /platform/tree/persons/{pid}/children
 */
async function getChildren(token, pid) {
    const data = await fsRequest(token, `/platform/tree/persons/${pid}/children`);
    const rels = data?.childAndParentsRelationships || [];
    const children = [];

    for (const rel of rels) {
        const childId = rel.child?.resourceId;
        if (childId && childId !== pid) {
            children.push({ fs_id: childId, rel_id: rel.id });
        }
    }

    const persons = data?.persons || [];
    for (const c of children) {
        const found = persons.find((fp) => fp.id === c.fs_id);
        if (found) {
            Object.assign(c, extractPersonInfo(found));
        }
    }

    return children;
}

/**
 * 사진/문서(메모리) 목록 조회
 * GET /platform/tree/persons/{pid}/memories
 */
async function getMemories(token, pid) {
    try {
        const data = await fsRequest(token, `/platform/tree/persons/${pid}/memories`);
        const sourceDescriptions = data?.sourceDescriptions || [];
        return sourceDescriptions.map((sd) => ({
            fs_memory_id: sd.id,
            title: sd.titles?.[0]?.value || '',
            description: sd.descriptions?.[0]?.value || '',
            type: sd.mediaType?.includes('image') ? 'photo' : 'document',
            url: sd.about || sd.links?.['image-icon']?.href || null,
        }));
    } catch (err) {
        // 메모리 없는 인물은 404 반환 — 정상 케이스
        if (err.response?.status === 404) return [];
        throw err;
    }
}

module.exports = {
    getPerson,
    getParents,
    getSpouses,
    getChildren,
    getMemories,
    extractPersonInfo,
    parseYear,
};
