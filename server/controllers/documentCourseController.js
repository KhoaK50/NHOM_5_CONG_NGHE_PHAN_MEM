/**
 * ============================================================================
 * TẦNG CONTROLLER: TIẾP NHẬN HTTP REQUEST CỤM UC08–UC10
 * Thành công: {"success":true,"data":...} | Lỗi: {"success":false,"code","message"}
 * ============================================================================
 */

const net = require('net');
const service = require('../services/documentCourseService');
const { getClientIp } = require('../utils/security');

/** X-Forwarded-For do client gửi được: chỉ ghi nhật ký khi đúng định dạng IP. */
function resolveLogIp(req) {
  const ip = getClientIp(req);
  return net.isIP(ip) ? ip : null;
}

async function handleCheckHash(req, res) {
  const data = await service.checkDuplicateHash(req.file);
  return res.status(200).json({ success: true, data });
}

async function handleListDocuments(req, res) {
  return res.status(200).json({ success: true, ...(await service.listAdminDocuments(req.query)) });
}

async function handleGetAdminDocument(req, res) {
  return res.status(200).json({ success: true, data: await service.getAdminDocument(req.params.id) });
}

async function handleGetVisibleDocument(req, res) {
  return res.status(200).json({ success: true, data: await service.getVisibleDocument(req.params.id, req.user) });
}

async function handleModerateDocument(req, res) {
  const data = await service.moderateDocument(req.params.id, req.body, req.user, resolveLogIp(req));
  return res.status(200).json({ success: true, data });
}

async function handleListReports(req, res) {
  return res.status(200).json({ success: true, ...(await service.listAdminReports(req.query)) });
}

async function handleResolveReport(req, res) {
  const data = await service.resolveAdminReport(req.params.id, req.body, req.user, resolveLogIp(req));
  return res.status(200).json({ success: true, data });
}

async function handleListCourses(req, res) {
  return res.status(200).json({ success: true, ...(await service.listAdminCourses(req.query)) });
}

async function handleGetCourse(req, res) {
  return res.status(200).json({ success: true, data: await service.getAdminCourse(req.params.id) });
}

async function handleCreateCourse(req, res) {
  const data = await service.createCourse(req.body, req.user, resolveLogIp(req));
  return res.status(201).json({ success: true, data });
}

async function handleUpdateCourse(req, res) {
  const data = await service.updateCourse(req.params.id, req.body, req.user, resolveLogIp(req));
  return res.status(200).json({ success: true, data });
}

async function handleDeleteCourse(req, res) {
  await service.deleteCourse(req.params.id, req.user, resolveLogIp(req));
  return res.status(204).end();
}

module.exports = {
  handleCheckHash,
  handleListDocuments,
  handleGetAdminDocument,
  handleGetVisibleDocument,
  handleModerateDocument,
  handleListReports,
  handleResolveReport,
  handleListCourses,
  handleGetCourse,
  handleCreateCourse,
  handleUpdateCourse,
  handleDeleteCourse
};
