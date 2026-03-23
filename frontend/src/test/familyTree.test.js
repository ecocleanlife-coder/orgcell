import { describe, it, expect } from 'vitest';

// FamilyTreeView의 buildTreeFromPersons 로직 테스트
function buildTreeFromPersons(persons) {
    if (!persons || persons.length === 0) return null;

    const map = {};
    for (const p of persons) {
        map[p.id] = { ...p, children: [] };
    }

    let root = null;
    for (const p of persons) {
        const node = map[p.id];
        if (p.parent1_id && map[p.parent1_id]) {
            map[p.parent1_id].children.push(node);
        } else if (p.parent2_id && map[p.parent2_id]) {
            map[p.parent2_id].children.push(node);
        } else if (!root || p.generation < root.generation) {
            root = node;
        }
    }
    return root;
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2);
    return parts[0][0] + parts[1][0];
}

describe('buildTreeFromPersons', () => {
    it('should return null for empty array', () => {
        expect(buildTreeFromPersons([])).toBeNull();
    });

    it('should return null for null input', () => {
        expect(buildTreeFromPersons(null)).toBeNull();
    });

    it('should build single person as root', () => {
        const persons = [{ id: 1, name: '할아버지', generation: 0, parent1_id: null, parent2_id: null }];
        const root = buildTreeFromPersons(persons);
        expect(root.name).toBe('할아버지');
        expect(root.children).toHaveLength(0);
    });

    it('should link parent-child', () => {
        const persons = [
            { id: 1, name: '아버지', generation: 0, parent1_id: null, parent2_id: null },
            { id: 2, name: '나', generation: 1, parent1_id: 1, parent2_id: null },
        ];
        const root = buildTreeFromPersons(persons);
        expect(root.name).toBe('아버지');
        expect(root.children).toHaveLength(1);
        expect(root.children[0].name).toBe('나');
    });

    it('should find root by lowest generation', () => {
        const persons = [
            { id: 2, name: '아버지', generation: 1, parent1_id: null, parent2_id: null },
            { id: 1, name: '할아버지', generation: 0, parent1_id: null, parent2_id: null },
        ];
        const root = buildTreeFromPersons(persons);
        expect(root.name).toBe('할아버지');
    });

    it('should handle multiple children', () => {
        const persons = [
            { id: 1, name: '아버지', generation: 0, parent1_id: null, parent2_id: null },
            { id: 2, name: '형', generation: 1, parent1_id: 1, parent2_id: null },
            { id: 3, name: '나', generation: 1, parent1_id: 1, parent2_id: null },
        ];
        const root = buildTreeFromPersons(persons);
        expect(root.children).toHaveLength(2);
    });
});

describe('getInitials', () => {
    it('should return first 2 chars for single name', () => {
        expect(getInitials('할아버지')).toBe('할아');
    });

    it('should return first chars of each part for multi-word name', () => {
        expect(getInitials('Han Lee')).toBe('HL');
    });

    it('should return ? for empty name', () => {
        expect(getInitials('')).toBe('?');
    });

    it('should return ? for null', () => {
        expect(getInitials(null)).toBe('?');
    });
});
