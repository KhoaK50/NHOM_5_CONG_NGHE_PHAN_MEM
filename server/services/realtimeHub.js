/**
 * Kênh sự kiện thời gian thực (Server-Sent Events) cho thông báo, Kho học liệu và hàng đợi kiểm duyệt.
 * Sự kiện chỉ báo "có thay đổi" và không mang nội dung riêng tư: client gọi lại API có kiểm quyền để lấy dữ liệu.
 * Hub nằm trong bộ nhớ tiến trình, đủ cho 1 instance trên Render. Nếu mất kết nối, client tự chuyển sang polling.
 */

const MAX_TOTAL_CONNECTIONS = 1000;
const MAX_CONNECTIONS_PER_KEY = 6;
const HEARTBEAT_MS = 25 * 1000;
const MAX_LIFETIME_MS = 60 * 60 * 1000;

const clients = new Set();
let heartbeatTimer = null;

function stopHeartbeatIfIdle() {
  if (clients.size === 0 && heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function removeClient(client) {
  if (!clients.delete(client)) return;
  clearTimeout(client.lifetimeTimer);
  stopHeartbeatIfIdle();
}

function writeRaw(client, text) {
  try {
    client.res.write(text);
  } catch {
    removeClient(client);
  }
}

function send(client, event, payload = {}) {
  writeRaw(client, `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

function ensureHeartbeat() {
  if (heartbeatTimer) return;
  // Giữ kết nối qua proxy của Render và phát hiện client đã rời đi
  heartbeatTimer = setInterval(() => {
    clients.forEach((client) => writeRaw(client, ': ping\n\n'));
  }, HEARTBEAT_MS);
  heartbeatTimer.unref?.();
}

function countByKey(key) {
  let total = 0;
  clients.forEach((client) => {
    if (client.key === key) total += 1;
  });
  return total;
}

/**
 * Mở luồng SSE cho một request. Trả về false nếu đã vượt giới hạn kết nối.
 * Quyền được chốt lúc kết nối và luồng bị đóng sau 1 giờ để client xác thực lại.
 */
function subscribe(req, res, { user = null, ip = 'unknown' } = {}) {
  const key = user ? `user:${user.id}` : `ip:${ip}`;
  if (clients.size >= MAX_TOTAL_CONNECTIONS || countByKey(key) >= MAX_CONNECTIONS_PER_KEY) return false;

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const client = {
    key,
    res,
    userId: user ? Number(user.id) : null,
    isAdmin: Boolean(user && (user.role === 'ADMIN' || user.dbRole === 'ADMIN')),
    lifetimeTimer: null
  };
  client.lifetimeTimer = setTimeout(() => res.end(), MAX_LIFETIME_MS);
  client.lifetimeTimer.unref?.();

  clients.add(client);
  req.on('close', () => removeClient(client));
  res.on('error', () => removeClient(client));
  ensureHeartbeat();

  writeRaw(client, 'retry: 5000\n\n');
  send(client, 'ready', { authenticated: Boolean(user) });
  return true;
}

function publishToUsers(userIds, event, payload) {
  const targets = new Set((userIds || []).map(Number));
  clients.forEach((client) => {
    if (client.userId !== null && targets.has(client.userId)) send(client, event, payload);
  });
}

function publishToAdmins(event, payload) {
  clients.forEach((client) => {
    if (client.isAdmin) send(client, event, payload);
  });
}

function publishToAll(event, payload) {
  clients.forEach((client) => send(client, event, payload));
}

module.exports = { subscribe, publishToUsers, publishToAdmins, publishToAll };
