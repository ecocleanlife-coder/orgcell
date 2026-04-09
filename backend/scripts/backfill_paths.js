/**
 * backfill_paths.js — OPS §26 기존 인물 path 소급 배정
 *
 * BFS 방식으로 이한봉(관장)에서 출발해 모든 person에
 * OPS path를 배정한다. 이미 path가 있는 인물은 스킵.
 *
 * 실행: node backend/scripts/backfill_paths.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const { assignPath, getAnchorPath } = require('../src/services/pathAssigner');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    const client = await pool.connect();
    try {
        // 1. 전체 persons 로드 (site_id=1, lee 사이트)
        const { rows: persons } = await client.query(`
            SELECT id, name, person_id, gender, parent1_id, parent2_id, spouse_id
            FROM persons WHERE site_id = 1 ORDER BY id
        `);

        const byIntId = {};
        const byPersonId = {};
        for (const p of persons) {
            byIntId[p.id] = p;
            byPersonId[p.person_id] = p;
        }

        // 2. 이미 path 있는 person_id 집합
        const { rows: existingPaths } = await client.query(`
            SELECT person_id, path FROM person_paths WHERE is_canonical = TRUE
        `);
        const hasPath = new Set(existingPaths.map(r => r.person_id));
        console.log('=== 기존 path 보유자 ===');
        for (const r of existingPaths) {
            const p = byPersonId[r.person_id];
            console.log(`  ${p?.name || '?'} (${r.person_id}) → ${r.path}`);
        }
        console.log('');

        // 3. BFS: { person (object), anchorPersonId (string), relationKey (string) }
        const queue = [];
        const processed = new Set();

        // 이한봉(id=1)을 기점으로 이웃 추가
        const curator = byIntId[1];
        processed.add(1);
        addNeighbors(curator, byIntId, queue, processed);

        // BFS 실행
        while (queue.length > 0) {
            const { person, anchorPersonId, relationKey } = queue.shift();
            if (processed.has(person.id)) continue;
            processed.add(person.id);

            if (hasPath.has(person.person_id)) {
                console.log(`⏭  스킵 (이미 path 있음): ${person.name}`);
                addNeighbors(person, byIntId, queue, processed);
                continue;
            }

            try {
                const path = await assignPath(client, person.person_id, anchorPersonId, relationKey, curator.person_id);
                hasPath.add(person.person_id);
                console.log(`✅ ${person.name} (${person.person_id}) → ${path}`);
                addNeighbors(person, byIntId, queue, processed);
            } catch (err) {
                console.error(`❌ ${person.name} (${person.person_id}): ${err.message}`);
            }
        }

        // 4. 최종 결과 확인
        console.log('\n=== 최종 결과 ===');
        const { rows: finalPaths } = await client.query(`
            SELECT p.name, p.person_id, pp.path
            FROM persons p
            LEFT JOIN person_paths pp ON p.person_id = pp.person_id AND pp.is_canonical = TRUE
            WHERE p.site_id = 1
            ORDER BY p.id
        `);
        for (const r of finalPaths) {
            const status = r.path ? `✅ ${r.path}` : '❌ path 없음';
            console.log(`  ${r.name} (${r.person_id}): ${status}`);
        }

    } finally {
        client.release();
        await pool.end();
    }
}

/**
 * person의 배우자·부모·자녀를 queue에 추가
 * (anchor = person, relation_key = 해당 관계)
 */
function addNeighbors(person, byIntId, queue, processed) {
    const id = person.id;
    const personIdStr = person.person_id;

    // 배우자
    if (person.spouse_id) {
        const sp = byIntId[person.spouse_id];
        if (sp && !processed.has(sp.id)) {
            const relKey = sp.gender === 'female' ? 'spouse_wife' : 'spouse_husband';
            queue.push({ person: sp, anchorPersonId: personIdStr, relationKey: relKey });
        }
    }

    // 부모 (이 person의 parent1_id, parent2_id)
    for (const parentKey of ['parent1_id', 'parent2_id']) {
        const parentId = person[parentKey];
        if (!parentId) continue;
        const parent = byIntId[parentId];
        if (parent && !processed.has(parent.id)) {
            const relKey = parent.gender === 'female' ? 'mother' : 'father';
            queue.push({ person: parent, anchorPersonId: personIdStr, relationKey: relKey });
        }
    }

    // 자녀 (parent1_id 또는 parent2_id가 이 person인 인물들)
    for (const p of Object.values(byIntId)) {
        if (p.parent1_id === id || p.parent2_id === id) {
            if (!processed.has(p.id)) {
                const relKey = p.gender === 'female' ? 'daughter' : 'son';
                queue.push({ person: p, anchorPersonId: personIdStr, relationKey: relKey });
            }
        }
    }
}

main().catch(err => {
    console.error('백필 실패:', err);
    process.exit(1);
});
