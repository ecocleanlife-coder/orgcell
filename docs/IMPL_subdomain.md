# 성씨DB + Subdomain 자동배정 구현
## 참조: ORGCELL_CODING_RULES.md §26-1-1
## 작업 순서
1. korean_surnames 테이블 생성
2. 한국 성씨+본관 시드 데이터 입력 (인구순위 기준)
3. subdomainAssigner.js 서비스 생성
4. 본관 미확정 → 확정 시 하위경로 전체 자동변환 로직
5. 외국인/중국 등 본관제도 있는 나라 동일 기준 적용
## 테이블 구조
korean_surnames: surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code
foreign_surnames: surname_en, code
## 배정 로직
입력: 성(한글), 본관(한글, 선택)
출력: LEE006-1 형식 subdomain
미확정: LEE-1 형식, 확정 시 자동변환
