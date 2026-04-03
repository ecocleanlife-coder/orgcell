import { describe, it, expect } from 'vitest';
import { generatePlaceholderParents } from '../components/museum/WormholeTransition';

const PERSONS = [
    { id: 1, name: '이한봉', gender: 'male', generation: 1 },
    { id: 2, name: '공우영', gender: 'female', generation: 1 },
    { id: 3, name: '이상훈', gender: 'male', generation: 0 },
];

const RELATIONS = [
    { person1_id: 1, person2_id: 2, relation_type: 'spouse' },
    { person1_id: 1, person2_id: 3, relation_type: 'parent' },
    { person1_id: 2, person2_id: 3, relation_type: 'parent' },
];

describe('generatePlaceholderParents', () => {
    it('부모 없는 인물에 placeholder 부모 생성', () => {
        // id=1(이한봉)은 부모가 없음
        const result = generatePlaceholderParents(PERSONS, RELATIONS, 1);
        expect(result.persons.length).toBe(5); // 3 + 2 placeholder
        expect(result.relations.length).toBe(6); // 3 + 3 (parent×2 + spouse)

        const father = result.persons.find(p => p.name === '이한봉의 부');
        const mother = result.persons.find(p => p.name === '이한봉의 모');
        expect(father).toBeTruthy();
        expect(mother).toBeTruthy();
        expect(father.gender).toBe('male');
        expect(mother.gender).toBe('female');
        expect(father.is_placeholder).toBe(true);
        expect(mother.is_placeholder).toBe(true);
        expect(father.privacy_level).toBe('private');
    });

    it('이미 부모가 있으면 생성하지 않음', () => {
        // id=3(이상훈)은 부모가 있음 (id=1, id=2)
        const result = generatePlaceholderParents(PERSONS, RELATIONS, 3);
        expect(result.persons.length).toBe(3); // 변경 없음
        expect(result.relations.length).toBe(3);
    });

    it('존재하지 않는 ID면 변경 없음', () => {
        const result = generatePlaceholderParents(PERSONS, RELATIONS, 999);
        expect(result.persons.length).toBe(3);
    });

    it('placeholder 부모 간 spouse 관계 생성', () => {
        const result = generatePlaceholderParents(PERSONS, RELATIONS, 1);
        const spouseRel = result.relations.find(
            r => r.relation_type === 'spouse' && r.person1_id > 9000
        );
        expect(spouseRel).toBeTruthy();
    });

    it('placeholder generation은 대상 + 1', () => {
        const result = generatePlaceholderParents(PERSONS, RELATIONS, 1);
        const father = result.persons.find(p => p.name === '이한봉의 부');
        expect(father.generation).toBe(2); // 이한봉 gen=1, 부모 gen=2
    });

    it('원본 배열 불변 (immutability)', () => {
        const originalLen = PERSONS.length;
        generatePlaceholderParents(PERSONS, RELATIONS, 1);
        expect(PERSONS.length).toBe(originalLen);
    });
});
