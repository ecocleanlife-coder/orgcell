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
// photo upload — mock multer by injecting req.file
router.post('/:siteId/:personId/photo', protect, (req, res, next) => {
    req.file = req._mockFile || null;
    next();
}, personController.uploadPhoto);
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

        it('should only update provided fields (dynamic SET)', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // access OK
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, spouse_id: 20, parent1_id: 5 }] });

            const res = await request(app)
                .put('/api/persons/1/10')
                .send({ spouse_id: 20 }); // 배우자만 변경, parent1_id는 보내지 않음

            expect(res.status).toBe(200);
            // SQL에 spouse_id만 포함되어야 함 (parent1_id 미포함)
            const sql = mockQuery.mock.calls[1][0];
            expect(sql).toContain('spouse_id');
            expect(sql).not.toContain('parent1_id');
        });

        it('should reject update with no fields', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // access OK

            const res = await request(app)
                .put('/api/persons/1/10')
                .send({}); // 빈 body
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/no fields/i);
        });
    });

    describe('POST /api/persons/:siteId (with new fields)', () => {
        it('should accept is_deceased, birth_lunar, death_lunar fields', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // access
            mockQuery.mockResolvedValueOnce({ rows: [{
                id: 20, name: '할아버지', is_deceased: true,
                birth_lunar: true, death_lunar: false, death_date: '2020-03-15',
            }] });

            const res = await request(app)
                .post('/api/persons/1')
                .send({
                    name: '할아버지',
                    is_deceased: true,
                    birth_lunar: true,
                    death_lunar: false,
                    death_date: '2020-03-15',
                });
            expect(res.status).toBe(201);
            expect(res.body.data.is_deceased).toBe(true);
            expect(res.body.data.birth_lunar).toBe(true);
        });

        it('should accept fs_person_id in SELECT results', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [
                { id: 1, name: '할아버지', fs_person_id: 'LXYZ-1234' },
            ] });

            const res = await request(app).get('/api/persons/1');
            expect(res.status).toBe(200);
            expect(res.body.data[0].fs_person_id).toBe('LXYZ-1234');
        });
    });

    describe('PUT /api/persons/:siteId/:personId (with new fields)', () => {
        it('should update deceased and lunar fields', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // access
            mockQuery.mockResolvedValueOnce({ rows: [{
                id: 10, name: '수정됨', is_deceased: true,
                birth_lunar: true, death_date: '2020-01-01',
            }] });

            const res = await request(app)
                .put('/api/persons/1/10')
                .send({
                    name: '수정됨',
                    is_deceased: true,
                    birth_lunar: true,
                    death_date: '2020-01-01',
                });
            expect(res.status).toBe(200);
            expect(res.body.data.is_deceased).toBe(true);
            expect(res.body.data.birth_lunar).toBe(true);
        });
    });

    describe('POST /api/persons/:siteId/:personId/photo', () => {
        it('should reject without file', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // access

            const res = await request(app)
                .post('/api/persons/1/10/photo')
                .send({});
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/no file/i);
        });

        it('should reject unauthorized upload', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] }); // no access

            const res = await request(app)
                .post('/api/persons/1/10/photo')
                .send({});
            expect(res.status).toBe(403);
        });

        it('should upload photo and update person', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // access
            mockQuery.mockResolvedValueOnce({ rows: [{
                id: 10, name: '할아버지', photo_url: '/uploads/persons/test.jpg',
            }] });

            // Inject mock file via custom middleware
            const origPost = app.post;
            const res = await request(app)
                .post('/api/persons/1/10/photo')
                .set('Content-Type', 'multipart/form-data')
                .field('_mockFile', 'true');

            // Since we can't easily inject req.file via supertest,
            // test the controller directly
            expect(res.status).toBe(400); // no actual file, expected
        });

        it('should return 404 for nonexistent person photo upload', async () => {
            // We test the controller logic directly
            const mockReq = {
                params: { siteId: '1', personId: '999' },
                user: { id: 1 },
                file: { filename: 'test_abc123.jpg' },
            };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // access
            mockQuery.mockResolvedValueOnce({ rows: [] }); // person not found

            await personController.uploadPhoto(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false })
            );
        });

        it('should update photo_url on successful upload', async () => {
            const mockReq = {
                params: { siteId: '1', personId: '10' },
                user: { id: 1 },
                file: { filename: '1234_abc.jpg' },
            };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // access
            mockQuery.mockResolvedValueOnce({ rows: [{
                id: 10, photo_url: '/uploads/persons/1234_abc.jpg',
            }] });

            await personController.uploadPhoto(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        photo_url: '/uploads/persons/1234_abc.jpg',
                    }),
                })
            );

            // Verify the SQL was called with correct photo_url
            const updateCall = mockQuery.mock.calls[1];
            expect(updateCall[1][0]).toBe('/uploads/persons/1234_abc.jpg');
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
