const repo = require('../repositories/interactionRepository');
const { detectDocumentFormat } = require('../utils/documentFormat');

class ApiError extends Error {
  constructor(statusCode, code, message) { super(message); this.statusCode = statusCode; this.code = code; }
}

function parseId(raw, field = 'id') {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) throw new ApiError(400, 'INVALID_ID', `${field} không hợp lệ.`);
  return id;
}

function pagination(query, fallback = 20) {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || fallback);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ApiError(400, 'INVALID_PAGINATION', 'Tham số phân trang không hợp lệ.');
  }
  return { page, limit, offset: (page - 1) * limit };
}

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

async function getDashboard(user) { return repo.getDashboard(user); }

async function getMyUploads(userId, query) {
  const { page, limit, offset } = pagination(query, 10);
  const status = query.status ? String(query.status).toUpperCase() : null;
  if (status && !STATUSES.includes(status)) throw new ApiError(400, 'INVALID_STATUS', 'Trạng thái tài liệu không hợp lệ.');
  const result = await repo.listMyUploads(userId, { status, limit, offset });
  return {
    items: result.rows.map((row) => ({
      id: row.id, title: row.title, description: row.description, docType: row.doc_type,
      fileName: row.file_name, previewUrl: row.preview_url, fileSizeBytes: Number(row.file_size_bytes), pageCount: row.page_count,
      fileHash: row.file_hash?.trim(), status: row.status, rejectReason: row.reject_reason,
      reviewNote: row.review_note, createdAt: row.created_at, reviewedAt: row.reviewed_at,
      viewCount: row.total_views, downloadCount: row.total_downloads, ratingAverage: Number(row.rating_avg),
      courseId: row.course_id, courseCode: row.course_code, courseName: row.course_name
    })),
    pagination: { page, limit, totalItems: result.total, totalPages: Math.ceil(result.total / limit) }
  };
}

async function listDocuments(query) {
  const { page, limit, offset } = pagination(query, 30);
  const search = String(query.q || '').trim().slice(0, 120);
  const rows = await repo.listPublicDocuments({ limit, offset, search });
  return rows.map((row) => ({
    id: row.id, title: row.title, description: row.description, docType: row.doc_type,
    fileName: row.file_name, previewUrl: row.preview_url, fileSizeBytes: Number(row.file_size_bytes), fileSizeMb: Number(row.file_size_bytes) / 1048576,
    pageCount: row.page_count, fileHash: row.file_hash?.trim(), status: row.status,
    courseId: row.course_id, courseCode: row.course_code, courseName: row.course_name,
    uploaderName: row.uploader_name, viewCount: row.total_views, downloadCount: row.total_downloads,
    ratingAvg: Number(row.rating_avg), ratingCount: Number(row.rating_count),
    createdAt: row.created_at, format: (detectDocumentFormat(row.file_name) || 'pdf').toUpperCase(), comments: []
  }));
}

async function listBookmarks(userId) {
  const rows = await repo.listBookmarks(userId);
  return rows.map((row) => ({
    id: row.id, title: row.title, description: row.description, docType: row.doc_type,
    fileName: row.file_name, previewUrl: row.preview_url, fileSizeBytes: Number(row.file_size_bytes), fileSizeMb: Number(row.file_size_bytes) / 1048576,
    pageCount: row.page_count, fileHash: row.file_hash?.trim(), status: 'APPROVED', createdAt: row.created_at,
    uploaderName: row.uploader_name, ratingCount: Number(row.rating_count), courseId: row.course_id, courseCode: row.course_code,
    courseName: row.course_name, note: row.note, isPinned: row.is_pinned, savedAt: row.saved_at,
    ratingAvg: Number(row.rating_avg), downloadCount: row.total_downloads, viewCount: row.total_views
  }));
}

async function createBookmark(userId, body) {
  const documentId = parseId(body?.documentId, 'documentId');
  const note = body.note == null ? null : String(body.note).trim();
  if (note && note.length > 255) throw new ApiError(400, 'INVALID_NOTE', 'Ghi chú không được vượt quá 255 ký tự.');
  const row = await repo.upsertBookmark(userId, documentId, note || null, Boolean(body.isPinned));
  if (!row) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Không tìm thấy tài liệu đã được phát hành.');
  return { userId: row.user_id, documentId: row.document_id, note: row.note, isPinned: row.is_pinned, savedAt: row.saved_at };
}

async function removeBookmark(userId, rawId) {
  const documentId = parseId(rawId, 'documentId');
  if (!(await repo.deleteBookmark(userId, documentId))) throw new ApiError(404, 'BOOKMARK_NOT_FOUND', 'Không tìm thấy tài liệu trong tủ đã lưu.');
}

async function comments(documentIdRaw, user, query) {
  const documentId = parseId(documentIdRaw, 'documentId');
  if (!(await repo.findApprovedDocument(documentId))) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Không tìm thấy tài liệu đã được phát hành.');
  const { page, limit, offset } = pagination(query, 20);
  const result = await repo.getComments(documentId, user?.id, { limit, offset });
  return {
    summary: { average: Number(result.summary.average), totalRatings: result.summary.total, distribution: { 5: result.summary.five, 4: result.summary.four, 3: result.summary.three, 2: result.summary.two, 1: result.summary.one }, myRating: result.myRating },
    items: result.comments.map((row) => ({ id: row.id, userId: row.user_id, authorName: row.full_name, content: row.content, parentCommentId: row.parent_comment_id, upvoteCount: row.upvote_count, createdAt: row.created_at })),
    pagination: { page, limit, totalItems: result.totalComments, totalPages: Math.ceil(result.totalComments / limit) }
  };
}

async function rate(userId, rawId, body) {
  const documentId = parseId(rawId, 'documentId');
  const score = body?.score;
  if (!Number.isInteger(score) || score < 1 || score > 5) throw new ApiError(400, 'INVALID_SCORE', 'Điểm đánh giá phải là số nguyên từ 1 đến 5.');
  try {
    const ratingAverage = await repo.saveRating(userId, documentId, score);
    return { documentId, score, ratingAverage };
  } catch (error) {
    if (error.code === 'DOCUMENT_NOT_FOUND') throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Không tìm thấy tài liệu đã được phát hành.');
    throw error;
  }
}

async function addComment(userId, rawId, body) {
  const documentId = parseId(rawId, 'documentId');
  const content = String(body?.content || '').trim();
  if (content.length < 2 || content.length > 2000) throw new ApiError(400, 'INVALID_CONTENT', 'Bình luận phải có từ 2 đến 2.000 ký tự.');
  const parentCommentId = body.parentCommentId == null ? null : parseId(body.parentCommentId, 'parentCommentId');
  const row = await repo.addComment(userId, documentId, content, parentCommentId);
  if (row) return { id: row.id, documentId: row.document_id, userId: row.user_id, content: row.content, parentCommentId: row.parent_comment_id, upvoteCount: row.upvote_count, createdAt: row.created_at };
  if (!(await repo.findApprovedDocument(documentId))) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Không tìm thấy tài liệu đã được phát hành.');
  throw new ApiError(404, 'PARENT_COMMENT_NOT_FOUND', 'Không tìm thấy bình luận cha thuộc tài liệu này.');
}

async function deleteComment(user, rawDocumentId, rawCommentId) {
  const documentId = parseId(rawDocumentId, 'documentId');
  const commentId = parseId(rawCommentId, 'commentId');
  const result = await repo.hideComment(user, documentId, commentId);
  if (result === 'missing') throw new ApiError(404, 'COMMENT_NOT_FOUND', 'Không tìm thấy bình luận thuộc tài liệu này.');
  if (result === 'forbidden') throw new ApiError(403, 'FORBIDDEN', 'Bạn chỉ được xóa bình luận của chính mình.');
  return { documentId, commentId, deleted: true };
}

async function preview(rawId, user) {
  const documentId = parseId(rawId, 'documentId');
  const document = await repo.findPreviewable(documentId, user);
  if (!document) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Không tìm thấy tài liệu yêu cầu.');
  let url;
  try { url = new URL(document.file_url); } catch { throw new ApiError(404, 'FILE_NOT_FOUND', 'Không tìm thấy tệp lưu trữ.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.username || url.password || (url.port && url.port !== '443')) {
    throw new ApiError(502, 'FILE_STORAGE_UNAVAILABLE', 'Nguồn lưu trữ tài liệu không được hỗ trợ.');
  }
  const upstream = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'error' }).catch(() => null);
  if (!upstream?.ok || !upstream.body) throw new ApiError(502, 'FILE_STORAGE_UNAVAILABLE', 'Không thể tải tệp từ kho lưu trữ.');
  const fileName = String(document.file_name || `document-${documentId}.pdf`);
  const format = detectDocumentFormat(fileName);
  return { upstream, fileName: format ? fileName : `${fileName}.pdf`, format: format || 'pdf' };
}

async function download(rawId, user, ipAddress) {
  const documentId = parseId(rawId, 'documentId');
  const document = await repo.findDownloadable(documentId);
  if (!document) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Không tìm thấy tài liệu đã được phát hành.');
  let url;
  try { url = new URL(document.file_url); } catch { throw new ApiError(404, 'FILE_NOT_FOUND', 'Không tìm thấy tệp lưu trữ.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.username || url.password || (url.port && url.port !== '443')) {
    throw new ApiError(502, 'FILE_STORAGE_UNAVAILABLE', 'Nguồn lưu trữ tài liệu không được hỗ trợ.');
  }
  const upstream = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'error' }).catch(() => null);
  if (!upstream?.ok || !upstream.body) throw new ApiError(502, 'FILE_STORAGE_UNAVAILABLE', 'Không thể tải tệp từ kho lưu trữ.');
  await repo.recordDownload(documentId, user.id, ipAddress);
  const fileName = String(document.file_name || `document-${documentId}.pdf`);
  const format = detectDocumentFormat(fileName);
  return { upstream, fileName: format ? fileName : `${fileName}.pdf`, format: format || 'pdf' };
}

async function recordView(rawId, user, ipAddress) {
  const documentId = parseId(rawId, 'documentId');
  const actionType = user ? 'VIEW_FULL_PDF' : 'PREVIEW_3_PAGES';
  if (!(await repo.recordView(documentId, user?.id || null, ipAddress, actionType))) {
    throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Không tìm thấy tài liệu đã được phát hành.');
  }
  return { documentId, actionType };
}

module.exports = { ApiError, getDashboard, getMyUploads, listDocuments, listBookmarks, createBookmark, removeBookmark, comments, rate, addComment, deleteComment, preview, download, recordView };
