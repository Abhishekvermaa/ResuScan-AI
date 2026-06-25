const express = require('express');
const { screen, getResults, getResult, deleteResult } = require('../controllers/resultController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// All result routes require authentication
router.use(protect);

router.post('/screen', upload.single('resume'), screen);
router.get('/results', getResults);

router
  .route('/results/:id')
  .get(getResult)
  .delete(deleteResult);

module.exports = router;
