# 온보딩 흐름

1단계: 본인 확인
"기존에 생성된 본인이나 가족의 박물관이 있는지 확인하겠습니다."
입력: 성 / 이름 / 생년월일 / 본관(선택) / 부모 이름(선택)
→ POST /api/persons/search 로 매칭 검색

2단계: 검색 결과 처리
후보 있음:
  추가 질문: 출생지 / 배우자 / 자녀
  동일 확인 → 기존 person에 account 연결
  → 해당 박물관으로 이동

후보 없음:
  새 person 생성
  subdomain 자동배정 (subdomainAssigner.js)
  사진 + 추가정보 입력
  → 자료실 입장

3단계: 박물관 생성
subdomainAssigner.js 호출
성/본관 기반 자동배정 → LEE006-1
"회원님의 박물관 주소: LEE006-1" 표시
