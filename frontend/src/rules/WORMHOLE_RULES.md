# 가문전환(Wormhole) 버튼 규칙

> 확정 규칙. 구현 시 이 문서를 기준으로 합니다.
> 최종 확정: 2026-04-04

---

## 관계 타입 (person_relations.relation_type)

| 타입 | 의미 | 예시 |
|------|------|------|
| `parent` / `parent_child` | 일반 부모자녀 (양부모 포함) | 김영수→김준호 |
| `spouse` | 배우자 | 김영수↔박은정 |
| `sibling` | 형제자매 | |
| `birth-parent` | 입양아의 친부모 (나중에 알게 되어 등록) | 최정호→김도윤 |

---

## 가문전환 룰

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

이것이 전부. 혈족 판별, 성별 판별, 경로 추적 불필요.

---

## 검증 (데모 31명, centerId=16)

### Wormhole 16명

| ID | 이름 | 이유 |
|----|------|------|
| 16 | 김영수 | spouse |
| 17 | 박은정 | spouse |
| 19 | 김준호 | spouse |
| 20 | 김하나 | spouse |
| 22 | 정수연 | spouse |
| 23 | David Wilson | spouse |
| 33 | 김태호 | spouse |
| 34 | 최순희 | spouse |
| 35 | 김은미 | spouse |
| 36 | 김선미 | spouse |
| 37 | 박정수 | spouse |
| 38 | 한미영 | spouse |
| 40 | 오상기 | spouse |
| 41 | 조홍교 | spouse |
| 51 | 최정호 | spouse + birth-parent |
| 52 | 윤서영 | spouse + birth-parent |

### 버튼 없음 15명

| ID | 이름 |
|----|------|
| 18 | 김슬기 |
| 21 | 김유경 |
| 24~27 | 박인영, 박진영, 박수자, 박정영 |
| 28, 29 | 김민준, 김서준 |
| 32 | Daniel Wilson |
| 42, 43 | 오정일, 오창일 |
| 44~46 | 조애현, 조의건, 조의준 |
| 50 | 김도윤 (입양아 — 버튼 없음) |

---

## 입양 등록 방법

입양아를 등록할 때:
- **양부모**: `parent-child`로 등록 (기존대로)
- **친부모를 나중에 알게 되면**: `birth-parent`로 등록

인물 수정 UI에서 부모 추가 시 관계 선택:
- 부모 (양육/일반)
- 친부모 (입양 후 알게 된 경우)

---

## 구현 위치

| 파일 | 역할 |
|------|------|
| `buildTree.js` | `buildMaps()`에서 `birthParentSet` 생성, `wormholeSet` = spouse + birthParent, 노드에 `showWormholeButton` |
| `FolderCard.jsx` | `data.showWormholeButton`으로 CubeSignboard에 전달 |
| `CubeSignboard.jsx` | `showWormhole` prop으로 가문전환 메뉴 표시/숨김 |

---

## 절대 금지

- 성별(gender)로 판별 금지
- 혈족/비혈족 경로 추적 금지
- 복잡한 BFS 알고리즘 금지
