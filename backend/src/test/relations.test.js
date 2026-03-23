const request = require('supertest');

const mockQuery = jest.fn();
jest.mock('../config/db', () => ({ query: (...args) => mockQuery(...args) }));

const express = require('express');
const app = express();
app.use(express.json());

const mockUser = { id: 1, email: 'test@test.com' };
const protect = (req, res, next) => { req.user = mockUser; next(); };
const optionalAuth = (req, res, next) => { req.user = mockUser; next(); };

const relationController = require('../controllers/relationController');
const router = express.Router();
router.get('/:siteId/relations', optionalAuth, relationController.listRelations);
router.post('/:siteId/relations', protect, relationController.createRelation);
router.delete('/:siteId/relations/:relationId', protect, relationController.deleteRelation);
app.use('/api/persons', router);

describe('Relations API', () => {
    beforeEach(() => {
        mockQuery.mockReset();
    });

    describe('GET /api/persons/:siteId/relations', () => {
        it('should return relations list', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [
                { id: 1, site_id: 1, person1_id: 1, person2_id: 2, relation_type: 'sibling', label: null }
            ] });
            const res = await request(app).get('/api/persons/1/relations');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].relation_type).toBe('sibling');
        });
    });

    describe('POST /api/persons/:siteId/relations', () => {
        it('should require person1_id, person2_id, relation_type', async () => {
            // checkSiteAccess mock
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            const res = await request(app)
                .post('/api/persons/1/relations')
                .send({ person1_id: 1 });
            expect(res.status).toBe(400);
        });

        it('should reject invalid relation_type', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            const res = await request(app)
                .post('/api/persons/1/relations')
                .send({ person1_id: 1, person2_id: 2, relation_type: 'invalid' });
            expect(res.status).toBe(400);
        });

        it('should create valid relation', async () => {
            // checkSiteAccess
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // INSERT
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, person1_id: 1, person2_id: 2, relation_type: 'sibling' }] });
            const res = await request(app)
                .post('/api/persons/1/relations')
                .send({ person1_id: 1, person2_id: 2, relation_type: 'sibling' });
            expect(res.status).toBe(201);
            expect(res.body.data.relation_type).toBe('sibling');
        });

        it('should block unauthorized access', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] }); // no access
            const res = await request(app)
                .post('/api/persons/1/relations')
                .send({ person1_id: 1, person2_id: 2, relation_type: 'sibling' });
            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /api/persons/:siteId/relations/:relationId', () => {
        it('should delete relation', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // access
            mockQuery.mockResolvedValueOnce({ rowCount: 1 }); // delete
            const res = await request(app).delete('/api/persons/1/relations/1');
            expect(res.status).toBe(200);
        });

        it('should return 404 for non-existent relation', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // access
            mockQuery.mockResolvedValueOnce({ rowCount: 0 }); // not found
            const res = await request(app).delete('/api/persons/1/relations/999');
            expect(res.status).toBe(404);
        });
    });
});
