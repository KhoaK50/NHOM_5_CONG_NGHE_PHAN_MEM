const express = require('express');
const rateLimit = require('express-rate-limit').default;
const controller = require('../controllers/interactionController');
const service = require('../services/interactionService');
const { requireMember, attachOptionalUser } = require('../middleware/rbac');

const router = express.Router();
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
const viewLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-7', legacyHeaders: false });

router.get('/stats/dashboard', requireMember, asyncRoute(controller.dashboard));
router.get('/documents', attachOptionalUser, asyncRoute(controller.publicDocuments));
router.get('/documents/my-uploads', requireMember, asyncRoute(controller.myUploads));
router.post('/documents/:id/access', viewLimit, attachOptionalUser, asyncRoute(controller.recordView));
router.get('/documents/:id/preview', attachOptionalUser, asyncRoute(controller.previewDocument));
router.get('/documents/:id/download', requireMember, asyncRoute(controller.download));

router.get('/bookmarks', requireMember, asyncRoute(controller.bookmarks));
router.post('/bookmarks', requireMember, asyncRoute(controller.createBookmark));
router.delete('/bookmarks/:documentId', requireMember, asyncRoute(controller.removeBookmark));

router.get('/documents/:id/comments', attachOptionalUser, asyncRoute(controller.comments));
router.post('/documents/:id/ratings', requireMember, asyncRoute(controller.rate));
router.put('/documents/:id/reviews/mine', requireMember, asyncRoute(controller.saveReview));
router.delete('/documents/:id/reviews/mine', requireMember, asyncRoute(controller.deleteReview));
router.post('/documents/:id/comments', requireMember, asyncRoute(controller.addComment));
router.delete('/documents/:id/comments/:commentId', requireMember, asyncRoute(controller.deleteComment));
router.delete('/documents/:id/comments', requireMember, asyncRoute(controller.deleteComment));

router.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof service.ApiError) {
    return res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
  }
  console.error('[Interaction API]', err);
  return res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống, thao tác chưa được thực hiện.' });
});

module.exports = router;
