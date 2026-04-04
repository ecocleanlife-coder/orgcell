const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function createProducts() {
  console.log('Stripe Product 생성 시작...\n');

  // 1. Orgcell Family Heritage Museum
  const orgcell = await stripe.products.create({
    name: 'Orgcell Family Heritage Museum',
    description: 'AI 기반 가족 사진 자동 정리 + 가족유산박물관',
  });
  const orgcellPrice = await stripe.prices.create({
    product: orgcell.id,
    unit_amount: 1000, // $10.00
    currency: 'usd',
    recurring: { interval: 'year' },
  });
  console.log('✅ Orgcell Family Heritage Museum');
  console.log('   Product ID:', orgcell.id);
  console.log('   Price ID:', orgcellPrice.id);

  // 2. Gonsius ERP - Starter (Early Bird)
  const gonsiusStarter = await stripe.products.create({
    name: 'Gonsius ERP - Starter (Early Bird)',
    description: '멀티테넌트 SaaS ERP | 1~10명 | 선착순 30개사 50% 할인',
  });
  const gonsiusStarterPrice = await stripe.prices.create({
    product: gonsiusStarter.id,
    unit_amount: 2400, // $24.00 per user
    currency: 'usd',
    recurring: { interval: 'month' },
  });
  console.log('\n✅ Gonsius ERP - Starter (Early Bird)');
  console.log('   Product ID:', gonsiusStarter.id);
  console.log('   Price ID:', gonsiusStarterPrice.id);

  // 3. Gonsius ERP - Professional (Early Bird)
  const gonsiusPro = await stripe.products.create({
    name: 'Gonsius ERP - Professional (Early Bird)',
    description: '멀티테넌트 SaaS ERP | 11~50명 | 선착순 30개사 50% 할인',
  });
  const gonsiusProPrice = await stripe.prices.create({
    product: gonsiusPro.id,
    unit_amount: 3900, // $39.00 per user
    currency: 'usd',
    recurring: { interval: 'month' },
  });
  console.log('\n✅ Gonsius ERP - Professional (Early Bird)');
  console.log('   Product ID:', gonsiusPro.id);
  console.log('   Price ID:', gonsiusProPrice.id);

  console.log('\n=== 완료 ===');
  console.log('위 Price ID들을 .env에 저장하세요:');
  console.log('STRIPE_PRICE_ORGCELL=' + orgcellPrice.id);
  console.log('STRIPE_PRICE_GONSIUS_STARTER=' + gonsiusStarterPrice.id);
  console.log('STRIPE_PRICE_GONSIUS_PRO=' + gonsiusProPrice.id);
}

createProducts().catch(console.error);
