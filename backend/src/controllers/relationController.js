const db = require('../config/db');

// 사이트 접근 권한 확인
async function checkSiteAccess(userId, siteId) {
    const { rows } = await db.query(
        `SELECT id FROM family_sites WHERE id = $1 AND user_id = $2
         UNION
         SELECT site_id AS id FROM site_members WHERE site_id = $1 AND user_id = $2`,
        [siteId, userId]
    );
    return rows.length > 0;
}

// GET /api/persons/:siteId/relations
exports.listRelations = async (req, res) => {
    try {
        const { siteId } = req.params;
        const { rows } = await db.query(
            `SELECT id, site_id, person1_id, person2_id, relation_type, label, created_at
             FROM person_relations WHERE site_id = $1
             ORDER BY id ASC`,
            [siteId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('listRelations error:', err);
        res.status(500).json({ success: false, message: 'Failed to list relations' });
    }
};

// POST /api/persons/:siteId/relations
exports.createRelation = async (req, res) => {
    try {
        const { siteId } = req.params;
        const userId = req.user?.id;
        if (!await checkSiteAccess(userId, siteId)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { person1_id, person2_id, relation_type, label } = req.body;

        if (!person1_id || !person2_id || !relation_type) {
            return res.status(400).json({ success: false, message: 'person1_id, person2_id, relation_type are required' });
        }

        const validTypes = ['parent', 'spouse', 'ex_spouse', 'adopted', 'step_parent', 'sibling', 'half_sibling'];
        if (!validTypes.includes(relation_type)) {
            return res.status(400).json({ success: false, message: `Invalid relation_type. Must be one of: ${validTypes.join(', ')}` });
        }

        const { rows } = await db.query(
            `INSERT INTO person_relations (site_id, person1_id, person2_id, relation_type, label)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (site_id, person1_id, person2_id, relation_type) DO UPDATE SET label = $5
             RETURNING *`,
            [siteId, person1_id, person2_id, relation_type, label || null]
        );

        res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('createRelation error:', err);
        res.status(500).json({ success: false, message: 'Failed to create relation' });
    }
};

// DELETE /api/persons/:siteId/relations/:relationId
exports.deleteRelation = async (req, res) => {
    try {
        const { siteId, relationId } = req.params;
        const userId = req.user?.id;
        if (!await checkSiteAccess(userId, siteId)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { rowCount } = await db.query(
            `DELETE FROM person_relations WHERE id = $1 AND site_id = $2`,
            [relationId, siteId]
        );

        if (rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Relation not found' });
        }

        res.json({ success: true, message: 'Relation deleted' });
    } catch (err) {
        console.error('deleteRelation error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete relation' });
    }
};
