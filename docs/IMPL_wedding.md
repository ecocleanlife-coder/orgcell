# 결혼 c코드 + 웜홀 구현
## 참조: ORGCELL_CODING_RULES.md §30
## 작업 순서
1. 결혼 등록 시 양측 카드에 c코드 추가
   이상훈(LEE006-2) ↔ 신세라(SHIN-1):
   이상훈 카드: SHIN-1c / 신세라 카드: LEE006-2c
2. c코드 클릭 시 상대 박물관으로 웜홀 이동
3. 이혼 시 c코드 해제
4. DB: persons 테이블에 spouse_subdomain 컬럼 추가
