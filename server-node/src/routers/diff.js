const express = require('express');
const router = express.Router();
const { computeDiff } = require('../utils/tools');
const { logActivity } = require('../core/auth');

router.post('/compare', async (req, res) => {
    try {
        const { text1, text2, ignore_whitespace, ignore_case } = req.body;

        const result = computeDiff(text1, text2, { ignore_whitespace, ignore_case });

        if (req.user) {
            await logActivity(req.user.id, "Diff Comparison", "text_compare");
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
