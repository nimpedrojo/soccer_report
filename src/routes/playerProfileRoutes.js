const express = require('express');
const { ensureAdmin } = require('../middleware/auth');
const { renderProfile } = require('../controllers/playerProfileController');

const router = express.Router();

router.get('/players/:id', ensureAdmin, renderProfile);

module.exports = router;
