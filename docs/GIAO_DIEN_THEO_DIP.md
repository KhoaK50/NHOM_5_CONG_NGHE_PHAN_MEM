# Giao diện theo dịp

Giao diện theo dịp chỉ thay phần nhìn: màu, khung, nút, ảnh trang trí. Không đổi chức năng, API hay CSDL.

Khi mới deploy, trang luôn ở **giao diện mặc định**. Nhóm tự bật hoặc tắt bằng biến môi trường trên Vercel, không cần sửa code.

## Bật, tắt trên Vercel

1. Vào project client trên Vercel, mở **Settings → Environment Variables**.
2. Thêm hoặc sửa biến `VITE_SEASON`, chọn môi trường **Production**:

   | Giá trị | Kết quả |
   | --- | --- |
   | không đặt, hoặc `off` | Giao diện mặc định |
   | `teachers-day` | Luôn bật giao diện 20/11 |
   | `auto` | Tự bật theo lịch trong `client/src/seasons/seasons.js` (20/11: từ 13/11 đến 21/11, giờ Việt Nam) |

3. Vào **Deployments**, chọn bản mới nhất, bấm **Redeploy**. Biến `VITE_*` được đọc lúc build, nên phải deploy lại thì mới có hiệu lực.

Tắt: đổi `VITE_SEASON` về `off` (hoặc xóa biến), rồi Redeploy.

## Xem trước, không ảnh hưởng người khác

Thêm tham số vào đường dẫn, chỉ có tác dụng ở tab đang mở:

- `?season=teachers-day`: xem giao diện 20/11
- `?season=off`: xem giao diện mặc định

## Khi đang trong dịp

- Chỉ dùng nền sáng. Nút chuyển sáng/tối được ẩn trên máy tính và trong menu điện thoại.
- Lựa chọn sáng/tối người dùng đã lưu vẫn giữ nguyên, hết dịp sẽ trở lại như cũ.
- Hoa rơi chỉ có ở trang chủ và tắt khi máy bật chế độ giảm chuyển động.

## Tệp liên quan

| Tệp | Nội dung |
| --- | --- |
| `client/src/seasons/seasons.js` | Đọc `VITE_SEASON`, lịch dịp, tham số xem trước |
| `client/src/styles/seasons/teachers-day.css` | Màu, trang chủ, thẻ tài liệu |
| `client/src/styles/seasons/teachers-day-pages.css` | Các trang còn lại |
| `client/src/assets/seasons/teachers-day/` | Ảnh trang trí |
| `client/src/components/home/SeasonDecor.jsx` | Lớp trang trí, không nhận thao tác |

## Thêm dịp mới

1. Thêm một dòng vào `SEASONS` trong `seasons.js`, ví dụ `{ id: 'christmas', from: '12-18', to: '12-26' }`.
2. Tạo `styles/seasons/christmas.css` với các quy tắc bắt đầu bằng `:root[data-season='christmas']`, rồi import trong `index.css`.
3. Đặt ảnh vào `assets/seasons/christmas/`.
4. Bật bằng `VITE_SEASON=christmas` hoặc `auto`.
