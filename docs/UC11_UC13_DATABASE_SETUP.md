# UC11–UC13: kết nối API và PostgreSQL

Các màn hình này dùng PostgreSQL hiện có trong `server/schema_5share.sql`; không tạo bảng mới. Backend dùng chung JWT, RBAC và kết nối `DATABASE_URL` đã có trong dự án.

## API đã nối

| UC | API | Bảng sử dụng |
| --- | --- | --- |
| UC11 | `GET /api/documents/my-uploads` | `documents`, `courses`, `moderation_logs` |
| UC11 | `GET /api/stats/dashboard` | `documents`, `users`, `document_reports`, `document_access_logs`, `courses`, `moderation_logs` |
| UC12 | `GET /api/documents` | `documents`, `courses`, `users`, `ratings` |
| UC12 | `POST /api/documents/:id/access` | `documents`, `document_access_logs`, `user_document_history` |
| UC12 | `GET /api/bookmarks` | `bookmarks`, `documents`, `courses`, `users`, `ratings` |
| UC12 | `POST /api/bookmarks`, `DELETE /api/bookmarks/:documentId` | `bookmarks` |
| UC12 | `GET /api/documents/:id/download` | `documents`, `document_access_logs`, `user_document_history` |
| UC13 | `GET /api/documents/:id/comments` | `document_comments`, `users`, `ratings` |
| UC13 | `POST /api/documents/:id/ratings` | `ratings`, `documents` |
| UC13 | `POST /api/documents/:id/comments`, `DELETE /api/documents/:id/comments/:commentId` | `document_comments` |

Các thao tác cần đăng nhập lấy `user_id` và vai trò từ JWT đã được backend xác thực. SQL dùng tham số `$1`, `$2`…; đánh giá được upsert theo khóa `(user_id, document_id)`. Bình luận xóa mềm bằng `is_hidden` để giữ lịch sử.

## Chạy với database của nhóm

1. Sao chép `server/.env.example` thành `server/.env` và điền `DATABASE_URL`, `JWT_SECRET`, cùng CORS origin phù hợp. Không đưa thông tin kết nối thật lên Git.
2. Cài dependencies riêng trong `server` và `client` bằng `npm install`.
3. Từ thư mục `server`, chạy `npm run db:push` để áp dụng schema/migrations và dữ liệu seed của repository.
4. Khởi động backend bằng `npm run dev` trong `server`; khởi động giao diện bằng `npm run dev` trong `client`.
5. Khi chạy frontend ngoài localhost, đặt `VITE_API_BASE_URL` trỏ tới backend đang triển khai. Trên Render, backend cần có `DATABASE_URL` và `JWT_SECRET`; trên Vercel, frontend cần có `VITE_API_BASE_URL`.

Để lưu file gốc, `documents.file_url` cần là URL HTTPS Cloudinary hợp lệ; API tải xuống chỉ chuyển tiếp tệp từ `res.cloudinary.com` và chỉ cấp cho tài khoản đã xác thực. Bookmark theo schema hiện tại lưu một ghi chú chung cho tài liệu, không lưu vị trí trang riêng lẻ.
