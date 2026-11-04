const net = require('net');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const service = require('../services/interactionService');
const { getClientIp } = require('../utils/security');

function requestIp(req) {
  const ip = getClientIp(req);
  return net.isIP(ip) ? ip : null;
}

async function dashboard(req, res) { return res.json({ success: true, data: await service.getDashboard(req.user) }); }
async function myUploads(req, res) { return res.json({ success: true, data: await service.getMyUploads(req.user.id, req.query) }); }
async function publicDocuments(req, res) { return res.json({ success: true, data: await service.listDocuments(req.query) }); }
async function bookmarks(req, res) { return res.json({ success: true, data: await service.listBookmarks(req.user.id) }); }
async function createBookmark(req, res) { return res.status(201).json({ success: true, message: 'Đã lưu tài liệu vào tủ cá nhân.', data: await service.createBookmark(req.user.id, req.body) }); }
async function removeBookmark(req, res) { await service.removeBookmark(req.user.id, req.params.documentId); return res.status(204).end(); }
async function comments(req, res) { return res.json({ success: true, data: await service.comments(req.params.id, req.user, req.query) }); }
async function rate(req, res) { return res.json({ success: true, message: 'Đã ghi nhận đánh giá.', data: await service.rate(req.user.id, req.params.id, req.body) }); }
async function addComment(req, res) { return res.status(201).json({ success: true, message: 'Đã gửi bình luận.', data: await service.addComment(req.user.id, req.params.id, req.body) }); }
async function deleteComment(req, res) {
  const commentId = req.params.commentId || req.query.commentId;
  if (!commentId) throw new service.ApiError(400, 'COMMENT_ID_REQUIRED', 'Thiếu commentId.');
  const data = await service.deleteComment(req.user, req.params.id, commentId);
  return res.json({ success: true, message: 'Đã xử lý bình luận.', data });
}
async function previewDocument(req, res) {
  const { upstream, fileName } = await service.preview(req.params.id, req.user);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  const length = upstream.headers.get('content-length');
  if (length && /^\d+$/.test(length)) res.setHeader('Content-Length', length);
  try { await pipeline(Readable.fromWeb(upstream.body), res); }
  catch (error) { if (!res.headersSent) throw error; res.destroy(error); }
}

async function download(req, res) {
  const { upstream, fileName } = await service.download(req.params.id, req.user, requestIp(req));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const length = upstream.headers.get('content-length');
  if (length && /^\d+$/.test(length)) res.setHeader('Content-Length', length);
  try { await pipeline(Readable.fromWeb(upstream.body), res); }
  catch (error) { if (!res.headersSent) throw error; res.destroy(error); }
}
async function recordView(req, res) {
  const data = await service.recordView(req.params.id, req.user, requestIp(req));
  return res.status(201).json({ success: true, data });
}

module.exports = { dashboard, myUploads, publicDocuments, bookmarks, createBookmark, removeBookmark, comments, rate, addComment, deleteComment, previewDocument, download, recordView };
