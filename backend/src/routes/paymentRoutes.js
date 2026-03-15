const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Lazy-initialize Stripe so missing key doesn't crash the server on startup
function getStripe() {
    if (!process.env.STRIPE_SECRET_KEY) return null;
    return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// ──────────────────────────────────────────────
// POST /api/payment/create-checkout-session
// ──────────────────────────────────────────────
router.post('/create-checkout-session', async (req, res) => {
    try {
        const stripe = getStripe();
        if (!stripe) {
            return res.status(503).json({
                success: false,
                message: 'Stripe is not configured yet. Please set STRIPE_SECRET_KEY.',
            });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: '$10 Family Website — Orgcell',
                            description: '1년 이용권 · yourfamily.orgcell.com 전용 도메인',
                            images: ['https://orgcell.com/pwa-512x512.png'],
                        },
                        unit_amount: 1000, // $10.00 in cents
                    },
                    quantity: 1,
                },
            ],
            success_url: 'https://orgcell.com/payment/success',
            cancel_url: 'https://orgcell.com/family-website',
            // Pass customer email from request if provided (e.g. after login)
            ...(req.body.email && { customer_email: req.body.email }),
        });

        res.json({ success: true, url: session.url });
    } catch (error) {
        console.error('Stripe checkout session error:', error);
        res.status(500).json({ success: false, message: 'Failed to create checkout session.' });
    }
});

// ──────────────────────────────────────────────
// POST /api/payment/webhook
// Stripe sends raw body — must use express.raw() middleware (set in server.js)
// ──────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripe = getStripe();

    if (!webhookSecret || !stripe) {
        console.warn('Stripe webhook not configured — STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET missing');
        return res.sendStatus(400);
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const email = session.customer_email || session.customer_details?.email;

        if (email) {
            try {
                // Auto-create table if not exists
                await db.query(`
                    CREATE TABLE IF NOT EXISTS subscriptions (
                        id SERIAL PRIMARY KEY,
                        email VARCHAR(255) NOT NULL,
                        stripe_session_id VARCHAR(255) UNIQUE,
                        amount_usd INTEGER,
                        status VARCHAR(50) DEFAULT 'active',
                        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                await db.query(
                    `INSERT INTO subscriptions (email, stripe_session_id, amount_usd, status)
                     VALUES ($1, $2, $3, 'active')
                     ON CONFLICT (stripe_session_id) DO NOTHING`,
                    [email.toLowerCase(), session.id, session.amount_total]
                );

                console.log(`[Webhook] Subscription saved for ${email}`);
            } catch (dbErr) {
                console.error('Failed to save subscription to DB:', dbErr);
                // Return 500 so Stripe retries
                return res.status(500).end();
            }
        }
    }

    res.sendStatus(200);
});

module.exports = router;
