const request = require('supertest');

const mockQuery = jest.fn();
jest.mock('../config/db', () => ({ query: (...args) => mockQuery(...args) }));

const express = require('express');
const app = express();
app.use(express.json());

const mockUser = { id: 1, email: 'test@test.com' };
const protect = (req, res, next) => { req.user = mockUser; next(); };
const optionalAuth = (req, res, next) => { req.user = mockUser; next(); };

const calendarController = require('../controllers/calendarController');
const router = express.Router();
router.get('/', optionalAuth, calendarController.listEvents);
router.post('/', protect, calendarController.createEvent);
app.use('/api/calendar', router);

describe('Calendar API', () => {
    beforeEach(() => {
        mockQuery.mockReset();
    });

    describe('POST /api/calendar — date validation', () => {
        it('should reject end_date before event_date', async () => {
            // checkSiteAccess
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

            const res = await request(app)
                .post('/api/calendar')
                .send({
                    site_id: 1,
                    title: '여행',
                    event_date: '2026-05-10',
                    end_date: '2026-05-05', // before start
                    event_type: 'trip',
                });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/end_date/i);
        });

        it('should accept valid date range', async () => {
            // checkSiteAccess
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // INSERT
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 1, title: '하와이 여행', event_date: '2026-05-10', end_date: '2026-05-15' }]
            });

            const res = await request(app)
                .post('/api/calendar')
                .send({
                    site_id: 1,
                    title: '하와이 여행',
                    event_date: '2026-05-10',
                    end_date: '2026-05-15',
                    event_type: 'trip',
                });
            expect(res.status).toBe(201);
        });

        it('should accept single-day event without end_date', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 2, title: '생일', event_date: '2026-03-21' }]
            });

            const res = await request(app)
                .post('/api/calendar')
                .send({
                    site_id: 1,
                    title: '생일',
                    event_date: '2026-03-21',
                    event_type: 'birthday',
                });
            expect(res.status).toBe(201);
        });

        it('should fallback invalid event_type to event', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // access
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 3, title: '해킹', event_type: 'event' }]
            }); // INSERT with fallback type

            const res = await request(app)
                .post('/api/calendar')
                .send({
                    site_id: 1,
                    title: '해킹',
                    event_date: '2026-03-21',
                    event_type: 'malicious_type',
                });
            // Current implementation falls back to 'event'
            expect(res.status).toBe(201);
        });
    });
});
