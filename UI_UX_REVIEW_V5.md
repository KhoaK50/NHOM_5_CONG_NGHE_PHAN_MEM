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

## Bản V5.1: cập nhật theo tài liệu "Xem xét cập nhật"

Bản vẽ: Figma nhóm, cùng page `🆕 UI/UX đầy đủ - Bản V5`: [bảng đối chiếu `V5_1_Change_Notes`](https://www.figma.com/design/2FFZM8lQTJ8Y4q1AGe1s3o/5share---UI-UX-design?node-id=186-1971), thành phần mới ở `V5_1_Components`, màn hình ở `V5_SEC_13` đến `V5_SEC_18`. Các nhóm 01 đến 12 giữ nguyên để so sánh.

| Yêu cầu | Thay đổi | Bản vẽ |
| --- | --- | --- |
| Đánh giá kiểu CH Play | Số sao trên từng nhận xét, biểu đồ 5 mức sao. Mỗi người một đánh giá cho mỗi tài liệu, lần sau là sửa. Bỏ nút Trả lời, thay bằng nút icon Sửa và Xóa. API mới `PUT` và `DELETE /api/documents/:id/reviews/mine`. | `V5_SEC_13` |
| Dấu `*` bắt buộc | Thành phần `RequiredMark`, màu `--status-danger`, dùng ở mọi form đang chạy. | `V5_SEC_14`, `V5_SEC_18` |
| Bỏ "Chèn mô tả gợi ý" | Bỏ nút, mẫu mô tả và CSS liên quan. | `V5_SEC_14` |
| Đổi tệp, tiêu đề không đổi | Tiêu đề do hệ thống điền thì đổi theo tệp mới. Tiêu đề người dùng tự gõ thì giữ nguyên. Tệp sai định dạng không ghi đè thông tin. | `V5_SEC_14` |
| Nộp Word, PowerPoint | Đã có từ V5, kiểm tra lại đủ luồng. Giao diện ghi rõ `.docx`, `.pptx`. Tệp `.doc`, `.ppt` vẫn bị chặn theo SRS, có hướng dẫn lưu lại. | `V5_SEC_14` |
| Gửi tài liệu chậm | Máy chủ gửi tệp lên Cloudinary bằng multipart thay cho base64, ít hơn 29% dữ liệu. Thêm thanh tiến độ, khóa nút khi đang gửi, không chờ bước tạo thông báo. | `V5_SEC_14` |
| Logo phần giới thiệu | Logo nằm trên chữ 5share, căn giữa, tự co theo màn hình. | `V5_SEC_16` |
| Dropdown môn học | Cùng màu chữ, cỡ chữ, viền và dòng chọn với dropdown khác, giữ ô tìm. | `V5_SEC_15` |
| Báo lỗi nhập liệu | Khung đỏ đầu form liệt kê mục cần sửa, tự cuộn tới, bấm để tới đúng ô. Viền đỏ và lời nhắc dưới từng ô. | `V5_SEC_14` |
| Thông báo phải F5 | Kênh SSE `GET /api/notifications/stream`. Quản trị được báo khi có tài liệu mới. Người gửi được báo khi có kết quả. Kho, Tài liệu của tôi, hàng đợi Kiểm duyệt tự cập nhật. Mất kết nối thì tự nối lại, nạp bù, trong lúc đó nạp lại mỗi 30 giây. | `V5_SEC_17` |
| Mail ảo khi đăng ký | Đăng ký chỉ nhận `@gmail.com`, kiểm tra ở cả giao diện và máy chủ. Tài khoản đã có và đăng nhập Google không bị ảnh hưởng. | `V5_SEC_18` |

Sửa thêm trong khi làm: nút "Tải thêm nhận xét" trước đây không bao giờ hiện vì đọc sai trường phân trang. Chọn nhanh một tệp khác không còn bị kết quả kiểm tra của tệp trước ghi đè.

Không cần chạy migration, không thêm gói npm.

### Đã kiểm tra

Chạy trên PostgreSQL cục bộ với schema, migration 001 đến 004 và dữ liệu mẫu. Cloudinary được giả lập, không gửi tệp ra ngoài, không chạm cơ sở dữ liệu thật.

- `npm run lint` và `vite build` đạt.
- 82 kiểm tra API đạt: đăng ký Gmail, luồng SSE theo vai trò, tải PDF, Word, PowerPoint, từ chối tệp đổi đuôi, tệp có macro, tệp `.doc`, duyệt và từ chối, đánh giá một lần kể cả 3 yêu cầu đồng thời, giới hạn kết nối.
- Chạy trong trình duyệt: thông báo đến sau khoảng 0,3 giây ở cả hai phía. Tiêu chí Quản trị đang tích dở không mất khi danh sách cập nhật. Tự nạp bù sau khi máy chủ khởi động lại. Không tràn ngang ở khổ 375 px. Giao diện đánh giá đúng ở theme tối.

### Chưa kiểm tra

- Tải tệp thật lên Cloudinary bằng multipart và đo thời gian thật trên máy chủ Render, nên chưa khẳng định còn bao nhiêu giây.
- Kênh SSE qua proxy thật của Render. Nếu proxy cắt kết nối, giao diện vẫn cập nhật nhờ nạp lại mỗi 30 giây.
- Điện thoại thật.

### Giới hạn còn lại

- Kết nối SSE luôn mở giữ máy chủ Render thức, gói miễn phí sẽ tiêu nhiều giờ chạy hơn.
- Hub SSE nằm trong bộ nhớ, chỉ đúng khi chạy 1 instance.
- Ràng buộc Gmail chỉ kiểm tra đuôi, không xác minh hộp thư có thật.
- Dropdown có sẵn do hệ điều hành vẽ, có thể khác nhẹ dropdown Môn học trên macOS.
- Nếu môn đã chọn chưa có trong bảng `courses`, máy chủ hiện xếp tài liệu vào môn đầu tiên mà không báo. Lỗi này có từ trước, chưa sửa ở bản này.
