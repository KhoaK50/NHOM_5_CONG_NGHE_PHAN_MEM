# Rà soát UI/UX 5Share — bản V5

Bản này đối chiếu với `BẢNG CHI TIẾT XEM XÉT CẢI THIỆN UIUX`. Bản vẽ được làm trước, code làm sau.

## Thiết kế

Figma nhóm, page `🆕 UI/UX đầy đủ - Bản V5`: [mở bản vẽ](https://www.figma.com/design/2FFZM8lQTJ8Y4q1AGe1s3o/5share---UI-UX-design?node-id=152-2).

- `V5_Change_Notes`: bảng đối chiếu yêu cầu với thay đổi.
- `V5_Foundation`: 26 màu theo 2 chế độ, nằm trong bộ biến `5share V5 Theme`.
- `V5_Components`: nút, huy hiệu, ô nhập, thanh điều hướng, thẻ tài liệu, thông báo.
- `V5_SEC_01` đến `V5_SEC_11`: các màn hình trên máy tính và điện thoại, theme sáng và tối, mỗi nhóm có ghi chú riêng.

Không sửa các page Figma cũ, sơ đồ, ERD, DFD, Sequence, đặc tả và SRS.

## Thay đổi

| Khu vực | Thay đổi |
| --- | --- |
| Thanh điều hướng điện thoại | Sửa lỗi chữ tràn: khung menu cũ chỉ cao 55 px do thừa kế `height: 100%`. Menu mới phủ toàn màn hình dưới thanh trên, nền đặc, mục cao 48 px, đóng bằng X, Esc hoặc khi chọn mục. |
| Màu sắc | Mọi màu giao diện đều đặc. Bỏ `rgba`, `opacity` dưới 100%, `backdrop-filter`, bóng mờ. Nền phủ, trạng thái vô hiệu và mục mờ đều dùng màu đặc. |
| Theme | Thêm sáng và tối trong `styles/theme.css`, `utils/theme.js`. Mặc định theo hệ điều hành, lựa chọn được lưu trên trình duyệt. Trang PDF luôn nền trắng. |
| Thẻ tài liệu | Bỏ mô tả dài. Giữ xem trước, định dạng, số trang, môn, tiêu đề. Đánh giá nền vàng cam, lượt tải nền xanh. |
| Thông báo | Một kiểu thông báo nổi (`ToastStack`), vị trí cố định, 4 loại theo màu và biểu tượng, bấm để xem đủ. Lỗi giữ đến khi đóng, loại khác tự ẩn sau 5 giây. |
| Hộp xác nhận | `ConfirmDialog` thay cho `window.confirm`. |
| Chi tiết tài liệu | Bỏ SHA-256, ngày dạng `04-11-2026`, hai ô nổi bật cho đánh giá và lượt tải. |
| Báo cáo vi phạm | Viết lại phần hiển thị, bỏ các lớp tiện ích không tồn tại trong dự án. |
| Quản trị | Cột Thao tác cùng vị trí và độ rộng trên mọi hàng. Ô Cần xử lý nổi bật. Kiểm duyệt 1 cột và bảng cuộn ngang trên điện thoại. |
| Logo | Bỏ lớp mờ ở nếp gấp, chữ theo theme. |
| Trang chủ và Kho | Bỏ câu "ở cùng một nơi", bỏ thời lượng trên nút giới thiệu, bỏ số tài liệu đã duyệt. Danh sách môn tìm được theo mã hoặc tên, chiều cao giới hạn. |
| Đóng góp | Khách thấy mục Đóng góp, được chuyển tới đăng nhập rồi quay lại. Thêm loại "Tài liệu". Không hiện chi tiết kỹ thuật. |
| Đánh giá | Rút nhãn thành "Đánh giá", sửa lỗi bình luận hiện `[object Object]`. |
| Phim giới thiệu | Bỏ thanh tiến độ, chỉ còn nút Bỏ qua, không tự đóng khi chạy hết. |
| Đăng nhập, đăng ký | Bỏ dòng phụ dưới tiêu đề. |
| Dữ liệu giả | `App.jsx` không còn nạp danh sách người dùng mẫu. `notificationReportApi.js` không còn dùng thông báo, báo cáo, tài khoản mẫu: mất mạng thì báo lỗi. |
| Sửa lỗi | Báo cáo vi phạm không còn bị gửi hai lần. Đánh dấu đã đọc gọi đúng API. |

## Word và PowerPoint

Theo SRS: lưu nguyên tệp `.docx`, `.pptx`, không chuyển đổi ở máy chủ, đọc bằng Google Docs Viewer. Bản vẽ ở `V5_SEC_12_Word_PowerPoint`.

- Máy chủ nhận cả 3 định dạng, kiểm tra cấu trúc tệp thật và từ chối tệp đổi đuôi, tệp có macro (`server/utils/documentFormat.js`).
- Xem trước và tải xuống trả về đúng tệp gốc, giữ đuôi và tên tiếng Việt.
- Thẻ Word: trình duyệt vẽ trang đầu từ tệp bằng `docx-preview`, có thể khác nhẹ so với Word.
- Thẻ PowerPoint: dùng ảnh slide đầu lưu sẵn trong tệp, đọc bằng `jszip`. Tệp không có ảnh hoặc lớn hơn 15 MB thì hiện biểu tượng.
- Số trang Word lấy từ thông tin Word lưu trong tệp. Thiếu thông tin thì ghi 1 trang. Số slide được đếm trực tiếp.
- Khách đọc được toàn bộ tệp Word, PowerPoint trong Viewer. Giới hạn xem trước 3 trang chỉ áp dụng cho PDF.
- `pdf.js` được chạy với `isEvalSupported: false` để chặn CVE-2024-4367. Nên nâng cấp lên bản 4.2.67 trở lên.

## Kiểm tra

Chạy trên API giả, không chạm cơ sở dữ liệu thật.

- `npm run lint` và `vite build` đạt.
- 48 kiểm tra hành vi đạt, gồm menu điện thoại, theme, các mục trong bảng yêu cầu, và quét độ trong suốt trên trang đang chạy.
- 90 màn (3 vai trò, 2 khổ màn hình, 2 theme) không tràn ngang.
- Độ tương phản chữ trên nền đạt từ 4,5:1 ở cả hai theme, trừ chữ của nút vô hiệu (3,70 và 4,25).

Chưa kiểm tra:

- Luồng tải tệp thật qua máy chủ và Cloudinary. Ảnh trang đầu trên thẻ mới được kiểm tra bằng PDF mẫu do API giả phục vụ.
- Dữ liệu mẫu trong `seed_5share.sql` trỏ tới tệp không tồn tại, nên các thẻ này hiện biểu tượng thay cho ảnh trang đầu.
- Điện thoại thật. Các màn điện thoại được kiểm tra bằng giả lập 375 px.

## Giới hạn còn lại

- Phim giới thiệu 3D vẫn dùng hiệu ứng mờ dần khi chuyển cảnh (`IntroFilm.jsx`, `scrollytelling.css`). Bỏ hiệu ứng này cần dựng lại cảnh phim.
- `RegisterModal.jsx`, `NotificationPopover.jsx` và `KiemThuTramHarness.jsx` chưa đổi màu vì không nằm trong luồng hiển thị của `App.jsx`.
- Loại học liệu "Tài liệu" cần chạy `server/db/migrations/004_add_general_document_type.sql` trên cơ sở dữ liệu của nhóm.
- Mỗi thẻ tài liệu tải nguyên tệp PDF để vẽ ảnh xem trước, nên trang Kho có thể chậm khi tệp lớn. Nên tạo ảnh thu nhỏ phía máy chủ.
