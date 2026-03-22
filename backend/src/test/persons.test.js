const request = require('supertest');

// Mock DB before requiring app
const mockQuery = jest.fn();
jest.mock('../config/db', () => ({ query: (...args) => mockQuery(...args) }));

// Minimal Express app with person routes
const express = require('express');
const app = express();
app.use(express.json());

// Mock auth middleware
const mockUser = { id: 1, email: 'test@test.com' };
const protect = (req, res, next) => { req.user = mockUser; next(); };
const optionalAuth = (req, res, next) => { req.user = mockUser; next(); };

const personController = require('../controllers/personController');
const router = express.Router();
router.get('/:siteId', optionalAuth, personController.listPersons);
router.post('/:siteId', protect, personController.createPerson);
router.put('/:siteId/:personId', protect, personController.updatePerson);
router.delete('/:siteId/:personId', protect, personController.deletePerson);
app.use('/api/persons', router);

describe('Persons API', () => {
    beforeEach(() => {
        mockQuery.mockReset();
    });

    describe('GET /api/persons/:siteId', () => {
        it('should return persons list', async () => {
            const persons = [
                { id: 1, name: '할아버지', site_id: 1 },
                { id: 2, name: '할머니', site_id: 1 },
            ];
            mockQuery.mockResolvedValueOnce({ rows: persons });

            const res = await request(app).get('/api/persons/1');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(2);
        });
    });

    describe('POST /api/persons/:siteId', () => {
        it('should require name', async () => {
            // checkSiteAccess passes first
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

            const res = await request(app)
                .post('/api/persons/1')
                .send({});
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/name/i);
        });

        it('should check site access before creating', async () => {
            // checkSiteAccess returns no rows → 403
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/api/persons/1')
                .send({ name: '테스트' });
            expect(res.status).toBe(403);
        });

        it('should create person when authorized', async () => {
            // checkSiteAccess returns access
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // INSERT returns new person
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, name: '아버지', site_id: 1 }] });

            const res = await request(app)
                .post('/api/persons/1')
                .send({ name: '아버지', gender: 'male' });
            expect(res.status).toBe(201);
            expect(res.body.data.name).toBe('아버지');
        });
    });

    describe('PUT /api/persons/:siteId/:personId', () => {
        it('should reject unauthorized updates', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] }); // no access

            const res = await request(app)
                .put('/api/persons/1/10')
                .send({ name: '수정' });
            expect(res.status).toBe(403);
        });

        it('should update person when authorized', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // access OK
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, name: '수정됨' }] });

            const res = await request(app)
                .put('/api/persons/1/10')
                .send({ name: '수정됨' });
            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe('수정됨');
        });

        it('should return 404 for nonexistent person', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // access OK
            mockQuery.mockResolvedValueOnce({ rows: [] }); // person not found

            const res = await request(app)
                .put('/api/persons/1/999')
                .send({ name: '없는사람' });
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/persons/:siteId/:personId', () => {
        it('should reject unauthorized deletes', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] }); // no access

            const res = await request(app)
                .delete('/api/persons/1/10');
            expect(res.status).toBe(403);
        });

        it('should delete person when authorized', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // access OK
            mockQuery.mockResolvedValueOnce({ rows: [] }); // clear spouse_id
            mockQuery.mockResolvedValueOnce({ rowCount: 1 }); // delete

            const res = await request(app)
                .delete('/api/persons/1/10');
            expect(res.status).toBe(200);
            expect(res.body.message).toMatch(/deleted/i);
        });
    });
});
