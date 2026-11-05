/**
 * ============================================================================
 * TẦNG ROUTES: RESTFUL API CỤM UC08–UC10 (CHỐNG TRÙNG, KIỂM DUYỆT, MÔN HỌC)
 * Xác thực chạy trước multer để request ẩn danh không được nạp tệp vào bộ nhớ.
 * ============================================================================
 */

const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit').default;
const controller = require('../controllers/documentCourseController');
const { MAX_PDF_BYTES, ApiError } = require('../services/documentCourseService');
const { requireAdmin, requireMember, attachOptionalUser } = require('../middleware/rbac');

const router = express.Router();

function buildLimiter(max, windowMinutes) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        message: 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.'
      })
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES, files: 1 },
  // Giữ đúng tên tệp tiếng Việt
  defParamCharset: 'utf8'
});

function acceptSinglePdf(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(413, 'FILE_TOO_LARGE', 'Tệp vượt quá giới hạn 10 MB.'));
    }
    return next(new ApiError(400, 'FILE_REQUIRED', 'Vui lòng gửi đúng một tệp tài liệu trong trường "file".'));
  });
}

// UC08: Kiểm tra trùng SHA-256 (API-08)
router.post(
  '/documents/check-hash',
  buildLimiter(30, 10),
  requireMember,
  acceptSinglePdf,
  controller.handleCheckHash
);

// UC07: Tải học liệu lên (upload PDF, kiểm tra hash, upload Cloudinary p47plumd, lưu DB status=PENDING)
router.post(
  '/documents',
  buildLimiter(30, 10),
  requireMember,
  acceptSinglePdf,
  controller.handleUploadDocument
);

// Công khai: chỉ trả tài liệu APPROVED, trừ Admin và chủ tài liệu
router.get('/documents/:id', buildLimiter(300, 15), attachOptionalUser, controller.handleGetVisibleDocument);

// Công khai: danh mục môn học phục vụ bộ lọc tìm kiếm và tra cứu
router.get('/courses', buildLimiter(300, 15), controller.handleListPublicCourses);

// Toàn bộ nhánh /admin chỉ dành cho ADMIN
const admin = express.Router();
admin.use(buildLimiter(600, 15), requireAdmin);

// UC09: Hàng đợi kiểm duyệt & báo cáo vi phạm (API-09A, API-09B và API đọc phối hợp)
admin.get('/documents', controller.handleListDocuments);
admin.get('/documents/:id', controller.handleGetAdminDocument);
admin.patch('/documents/:id/moderate', controller.handleModerateDocument);
admin.get('/reports', controller.handleListReports);
admin.patch('/reports/:id/resolve', controller.handleResolveReport);

// UC10: CRUD môn học (API-10A đến API-10E)
admin.get('/courses', controller.handleListCourses);
admin.get('/courses/:id', controller.handleGetCourse);
admin.post('/courses', controller.handleCreateCourse);
admin.patch('/courses/:id', controller.handleUpdateCourse);
admin.delete('/courses/:id', controller.handleDeleteCourse);

router.use('/admin', admin);

// Chuẩn hóa lỗi; không bao giờ trả stack trace hay SQL cho client
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, code: err.code, message: err.message, ...err.extra });
  }
  console.error('[DocumentCourse API]', err);
  return res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'Lỗi hệ thống, thao tác chưa được thực hiện. Vui lòng thử lại sau.'
  });
});

module.exports = router;
