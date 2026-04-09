# 출입증/초대카드 구현
## 참조: ORGCELL_CODING_RULES.md §26-5
## 작업 순서
1. QR코드 생성 라이브러리 연동
2. Legacy Pass: Linked 시 자동 발급
3. Visitor Pass: 유효기간 설정 + QR 생성
4. 초대카드 UI: 박물관명 + QR + 유효기간
5. 카카오/문자/SNS 공유 버튼
6. 유효기간 검사 미들웨어
7. 미입장자: 문패 화면 + [입장권 요청하기]
