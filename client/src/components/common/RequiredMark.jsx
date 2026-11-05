// Dấu * màu đỏ ngay sau nhãn của mục bắt buộc. Trình đọc màn hình đã nhận biết qua thuộc tính required.
export default function RequiredMark() {
  return <span className="required-mark" aria-hidden="true">*</span>
}
