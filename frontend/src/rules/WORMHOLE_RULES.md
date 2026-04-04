# 가문전환(Wormhole) + Z레이어 + 레이아웃 규칙

> 확정 규칙. 구현 시 이 문서를 기준으로 합니다.
> 최종 확정: 2026-04-04

---

## 4원칙 (절대 원칙)

1. **남자 왼쪽, 여자 오른쪽** — 항상, 가문전환해도 불변
2. **내 배우자는 내 옆에** — 부부는 한 쌍으로 붙어 있음
3. **내 형제는 내 옆에, 내 배우자의 형제는 배우자 옆에** — 혈족 기준 좌우 배치
4. **나머지 모든 배우자들의 가문(부모/형제)은 해당 배우자 폴더 뒤 Z레이어로 접힘** — centerId 부부만 양쪽 가문이 X/Y에 펼쳐짐

---

## Z레이어 원칙

### 핵심
centerId 부부만 양쪽 가문이 X/Y에 펼쳐지고,
나머지 모든 배우자들의 가문(부모/형제)은
각자 폴더 뒤 Z레이어로 접힌다.

### Z레이어 판별 알고리즘

```js
function classifyZ(centerId) {
    const centerSpouse = getSpouse(centerId);

    // centerId의 혈족 (parent-child 경로만 따라감) → Z0
    const centerBlood = getBloodByParentChild(centerId);
    // centerSpouse의 혈족 (parent-child 경로만 따라감) → Z0
    const spouseBlood = getBloodByParentChild(centerSpouse);

    const allZ0 = union(centerBlood, spouseBlood);

    // Z0 혈족의 배우자 → 카드는 Z0에 보이되, 그 배우자의 가문은 Z1
    for (id of allZ0) {
        spouse = getSpouse(id);
        if (spouse) allZ0.add(spouse);  // 카드만 Z0
    }

    // 나머지 전부 → Z1 (폴더 뒤에 접힘)
}
```

### 예: 김영수(centerId=16) 기준

**Z0 (펼쳐짐):**
- 김영수 (본인) + 박은정 (배우자)
- 김태호/최순희 (김영수 부모)
- 박정수/한미영 (박은정 부모)
- 김은미, 김선미 (김영수 형제)
- 박인영, 박진영, 박수자, 박정영 (박은정 형제)
- 김슬기, 김준호, 김하나, 김유경, 김도윤 (자녀)
- 김민준, 김서준 (손자)
- 오상기, 조홍교 (형제 배우자 — 카드 보임)
- 정수연, David Wilson (자녀 배우자 — 카드 보임)
- Daniel Wilson (손자)
- 오정일, 오창일, 조애현, 조의건, 조의준 (조카)

**Z1 (접힘):**
- 오상기 뒤 → 오상기 부모/형제
- 조홍교 뒤 → 조홍교 부모/형제
- 정수연 뒤 → 정수연 부모/형제
- David Wilson 뒤 → Wilson 부모/형제

### 예: 정수연으로 가문전환하면

**Z0:**
- 김준호 (남편) + 정수연 (아내)
- 김영수/박은정 (김준호 부모)
- 정수연 부모 (양쪽 가문 펼침)
- 김준호 형제 + 정수연 형제
- 김민준/김서준 (자녀)
- 김태호/최순희 (조부모)
- 김은미, 김선미 (김영수 형제)

**Z1:**
- 박정수/한미영 (박은정 부모) → 박은정 뒤
- 오상기 부모 → 오상기 뒤
- David Wilson 부모 → David 뒤

---

## 가문전환 버튼 규칙

### 관계 타입 (person_relations.relation_type)

| 타입 | 의미 | 예시 |
|------|------|------|
| `parent` / `parent_child` | 일반 부모자녀 (양부모 포함) | 김영수→김준호 |
| `spouse` | 배우자 | 김영수↔박은정 |
| `sibling` | 형제자매 | |
| `birth-parent` | 입양아의 친부모 (나중에 알게 되어 등록) | 최정호→김도윤 |

### 가문전환 버튼 표시 조건

```js
function needsWormholeButton(personId, relations) {
    // 1. 배우자로 등록된 사람
    const isSpouse = relations.some(r =>
        r.relation_type === 'spouse' &&
        (r.person1_id === personId || r.person2_id === personId)
    );

    // 2. 입양아의 친부모 (나중에 등록된 경우)
    const isBirthParent = relations.some(r =>
        r.relation_type === 'birth-parent' &&
        r.person1_id === personId
    );

    return isSpouse || isBirthParent;
}
```

### 가문전환 동작

1. centerId 변경
2. buildTree 재호출
3. Z레이어 알고리즘으로 Z0/Z1 재계산
4. Z0 = 정상 표시 (opacity 1.0, scale 1.0)
5. Z1 = 해당 배우자 폴더 뒤에 접혀서 표시 (opacity 0.4, scale 0.85)
6. Z1 클릭 → 해당 인물로 가문전환
7. 🏠 버튼 → 원래 관장 centerId로 복귀

---

## 입양 등록 방법

입양아를 등록할 때:
- **양부모**: `parent-child`로 등록 (기존대로)
- **친부모를 나중에 알게 되면**: `birth-parent`로 등록

---

## 구현 위치

| 파일 | 역할 |
|------|------|
| `buildTree.js` | `classifyZ()` Z레이어 분류, `layoutCoupleBlock()` 좌표 배치, `wormholeSet` 버튼 판별 |
| `FamilyTreeCanvas.jsx` | Z 필터링, 가문전환 클릭 핸들러, 🏠 복귀 |
| `FolderCard.jsx` | `data.showWormholeButton`으로 CubeSignboard에 전달 |
| `CubeSignboard.jsx` | `showWormhole` prop으로 가문전환 메뉴 표시/숨김 |

---

## 절대 금지

- 성별(gender)로 가문전환 판별 금지
- 가문전환 시 사람 삭제/제거 금지 (Z1은 숨김이 아니라 접힘)
- 부부 좌우 반전 금지 (항상 남좌여우)
