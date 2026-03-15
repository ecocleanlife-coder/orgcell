# Stripe 결제 연동 설정 가이드

## 1. 환경변수 설정

`backend/.env` 파일에 아래 항목을 추가하세요.

```env
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
```

> **테스트 시:** `sk_test_...` / `whsec_test_...` 키를 사용하세요.

---

## 2. 로컬 Webhook 테스트 방법

### 방법 A — Stripe CLI (권장)

```bash
# 1. Stripe CLI 설치 (Windows)
winget install Stripe.StripeCLI

# 2. 로그인
stripe login

# 3. 로컬 백엔드로 webhook 이벤트 포워딩
stripe listen --forward-to http://localhost:5001/api/payment/webhook

# 4. 터미널에 출력된 webhook signing secret을 .env에 저장
#    예: whsec_abcdef1234567890...
#    → STRIPE_WEBHOOK_SECRET=whsec_abcdef1234567890...

# 5. 별도 터미널에서 결제 이벤트 트리거 테스트
stripe trigger checkout.session.completed
```

### 방법 B — ngrok

```bash
# 1. ngrok 설치
winget install ngrok

# 2. 로컬 백엔드 포트 노출
ngrok http 5001

# 3. Stripe 대시보드 → Developers → Webhooks → Add endpoint
#    URL: https://xxxx.ngrok.io/api/payment/webhook
#    이벤트: checkout.session.completed

# 4. 생성된 Signing secret을 .env의 STRIPE_WEBHOOK_SECRET에 저장
```

---

## 3. Stripe 대시보드 설정 (프로덕션)

1. [Stripe Dashboard](https://dashboard.stripe.com) → **Developers → Webhooks**
2. **Add endpoint** 클릭
3. URL: `https://orgcell.com/api/payment/webhook`
4. 이벤트 선택: `checkout.session.completed`
5. 생성된 **Signing secret** (`whsec_...`) → EC2 `.env`의 `STRIPE_WEBHOOK_SECRET`에 추가

---

## 4. EC2 환경변수 배포

EC2 서버의 `/opt/orgcell/.env` 파일에 Stripe 키를 추가한 뒤:

```bash
cd /opt/orgcell
docker-compose up -d --no-deps backend
```

---

## 5. 결제 흐름 요약

```
사용자 클릭
  → POST /api/payment/create-checkout-session
  → Stripe Checkout 페이지 (https://checkout.stripe.com/...)
  → 결제 완료
  → success_url: https://orgcell.com/payment/success  ← PaymentSuccessPage
  → Stripe Webhook → POST /api/payment/webhook
  → DB subscriptions 테이블에 이메일 저장
```

---

## 6. 테스트 카드 번호 (Stripe 테스트 모드)

| 번호 | 결과 |
|------|------|
| `4242 4242 4242 4242` | 결제 성공 |
| `4000 0000 0000 9995` | 결제 실패 (잔액 부족) |
| `4000 0025 0000 3155` | 3D Secure 인증 필요 |

만료일: 미래 날짜 (예: 12/34), CVC: 아무 숫자 3자리
