// Khung chương trình đào tạo ngành Sư phạm Tin học và các danh mục cố định của giao diện.
// Tuân thủ 100% Sơ đồ Pháp lệnh Cây Chương trình Đào tạo Đại học Sư phạm TP.HCM.

export const KNOWLEDGE_BLOCKS = [
  'Tất cả khối kiến thức',
  'Nghiệp vụ Sư phạm',
  'Cơ sở ngành',
  'Chuyên ngành',
  'Đại cương'
]

export const SEMESTERS = [
  'Tất cả học kỳ',
  'Học kỳ 1',
  'Học kỳ 2',
  'Học kỳ 3',
  'Học kỳ 4',
  'Học kỳ 5',
  'Học kỳ 6',
  'Học kỳ 7',
  'Học kỳ 8'
]

export const CURRICULUM_SEMESTERS_META = [
  { id: 'Học kỳ 1', shortLabel: 'HK1', credits: 18, focus: 'Triết học, Pháp luật, Tâm lí ĐC & Nền tảng Toán - Lập trình' },
  { id: 'Học kỳ 2', shortLabel: 'HK2', credits: 17, focus: 'KTCT, CNXHKH, Tâm lí GD, XSTK, Lập trình NC & Tự chọn KN' },
  { id: 'Học kỳ 3', shortLabel: 'HK3', credits: 15, focus: 'Tư tưởng HCM, Giáo dục học, CTDL, Lập trình HĐT & Lý thuyết đồ thị' },
  { id: 'Học kỳ 4', shortLabel: 'HK4', credits: 15, focus: 'Lịch sử ĐCSVN, PPNCKH, Lí luận dạy học, KTMT, CSDL & Giải thuật' },
  { id: 'Học kỳ 5', shortLabel: 'HK5', credits: 18, focus: 'PTCT, PPDH Tin học, Mạng máy tính, Nhập môn CNPM, HĐH & AI' },
  { id: 'Học kỳ 6', shortLabel: 'HK6', credits: 15, focus: 'ƯD CNTT, Kiểm tra đánh giá, Robotics, LT Windows, PTTK HTTT & Học máy' },
  { id: 'Học kỳ 7', shortLabel: 'HK7', credits: 15, focus: 'Khởi nghiệp, Đào tạo ĐT, Thực hành DH, STEM, TTSP 1 & Quản trị HTTT' },
  { id: 'Học kỳ 8', shortLabel: 'HK8', credits: 11, focus: 'Khóa luận TN / Sản phẩm NCKH / Hồ sơ TN & Thực tập sư phạm 2' }
]

export const MANDATORY_GRADUATION_CONDITIONS = [
  {
    id: 'cond-gdtc',
    title: 'Giáo dục thể chất (*)',
    spanSemesters: 'Học kỳ 1 → Học kỳ 2',
    colSpan: 2,
    group: 'foundation',
    note: 'Điều kiện bắt buộc (*)'
  },
  {
    id: 'cond-gdqpan',
    title: 'Giáo dục quốc phòng, an ninh (*)',
    spanSemesters: 'Học kỳ 1 → Học kỳ 3',
    colSpan: 3,
    group: 'foundation',
    note: 'Điều kiện bắt buộc (*)'
  },
  {
    id: 'cond-ccnn',
    title: 'Chứng chỉ ngoại ngữ',
    spanSemesters: 'Học kỳ 1 → Học kỳ 8',
    colSpan: 8,
    group: 'certificate',
    note: 'Chuẩn đầu ra ngoại ngữ'
  }
]

export const DOCUMENT_TYPES = [
  'Tất cả loại học liệu',
  'Tài liệu',
  'KHBD Công văn 5512',
  'Slide bài giảng',
  'Đề thi & Đáp án',
  'Đồ án & Khóa luận',
  'Giáo trình & Sách học liệu'
]

export const REPORT_REASON_GROUPS = [
  'Sai kiến thức chuyên môn / Không đúng chuẩn Công văn 5512',
  'Không đúng môn học hoặc sai khối kiến thức CTĐT',
  'Vi phạm bản quyền hoặc đề thi đang trong thời gian bảo mật',
  'Tệp mờ nhòe, thiếu trang hoặc lỗi phông chữ Tiếng Việt'
]

// 40 đường nối chuẩn pháp lệnh theo đúng sơ đồ Cây CTĐT ngành Sư phạm Tin học
export const CURRICULUM_OFFICIAL_CONNECTIONS = [
  // 1. Học kỳ 1 -> Học kỳ 2
  { id: 'conn-01', from: 'POLI2001', to: 'POLI2002', type: 'precursor', label: 'Học trước' },
  { id: 'conn-02', from: 'POLI2001', to: 'POLI2003', type: 'precursor', label: 'Học trước' },
  { id: 'conn-03', from: 'PSYC1001', to: 'PSYC2802', type: 'precursor', label: 'Học trước' },
  { id: 'conn-04', from: 'COMP1010', to: 'COMP1013', type: 'precursor', label: 'Học trước' },

  // 2. Học kỳ 1 -> Học kỳ 3
  { id: 'conn-05', from: 'PSYC1001', to: 'EDUC2802', type: 'precursor', label: 'Học trước' },

  // 3. Học kỳ 1 -> Học kỳ 4
  { id: 'conn-06', from: 'COMP1010', to: 'COMP1011', type: 'precursor', label: 'Học trước' },

  // 4. Học kỳ 1 -> Học kỳ 6 (Mạch bus dưới đáy: Cơ sở toán trong CNTT -> Học máy)
  { id: 'conn-07', from: 'COMP1805', to: 'COMP1712', type: 'precursor', label: 'Học trước', busLane: 'bottom' },

  // 5. Học kỳ 2 -> Học kỳ 3
  { id: 'conn-08', from: 'POLI2003', to: 'POLI2005', type: 'precursor', label: 'Học trước' },
  { id: 'conn-09', from: 'COMP1013', to: 'COMP1016', type: 'precursor', label: 'Học trước' },
  { id: 'conn-10', from: 'COMP1013', to: 'COMP1017', type: 'precursor', label: 'Học trước' },

  // 6. Học kỳ 3 -> Học kỳ 4
  { id: 'conn-11', from: 'POLI2005', to: 'POLI2004', type: 'precursor', label: 'Học trước' },
  { id: 'conn-12', from: 'EDUC2802', to: 'EDUT2802', type: 'prerequisite', label: 'Tiên quyết' }, // TIÊN QUYẾT: NÉT ĐỨT
  { id: 'conn-13', from: 'COMP1016', to: 'COMP1401', type: 'precursor', label: 'Học trước' },
  { id: 'conn-14', from: 'COMP1017', to: 'COMP1018', type: 'precursor', label: 'Học trước' },
  { id: 'conn-15', from: 'COMP1017', to: 'COMP1401', type: 'precursor', label: 'Học trước' },

  // 7. Học kỳ 3 -> Học kỳ 5
  { id: 'conn-16', from: 'COMP1701', to: 'COMP1314', type: 'precursor', label: 'Học trước' },

  // 8. Học kỳ 3 -> Học kỳ 7 (Mạch bus trên đỉnh: Giáo dục học -> Khởi nghiệp & GD KH)
  { id: 'conn-17', from: 'EDUC2802', to: 'EDUC2803', type: 'precursor', label: 'Học trước', busLane: 'top' },

  // 9. Học kỳ 4 -> Học kỳ 5
  { id: 'conn-18', from: 'EDUT2802', to: 'COMP1819', type: 'precursor', label: 'Học trước' },
  { id: 'conn-19', from: 'EDUT2802', to: 'COMP1818', type: 'precursor', label: 'Học trước' },
  { id: 'conn-20', from: 'COMP1011', to: 'COMP1015', type: 'precursor', label: 'Học trước' },
  { id: 'conn-21', from: 'COMP1011', to: 'COMP1332', type: 'precursor', label: 'Học trước' },
  { id: 'conn-22', from: 'COMP1018', to: 'COMP1044', type: 'precursor', label: 'Học trước' },
  { id: 'conn-23', from: 'COMP1401', to: 'COMP1314', type: 'precursor', label: 'Học trước' },

  // 10. Học kỳ 4 -> Học kỳ 6
  { id: 'conn-24', from: 'COMP1018', to: 'COMP1032', type: 'precursor', label: 'Học trước' },

  // 11. Học kỳ 5 -> Học kỳ 6
  { id: 'conn-25', from: 'COMP1819', to: 'COMP1827', type: 'precursor', label: 'Học trước' },
  { id: 'conn-26', from: 'COMP1818', to: 'COMP1828', type: 'precursor', label: 'Học trước' },
  { id: 'conn-27', from: 'COMP1015', to: 'COMP1705', type: 'precursor', label: 'Học trước' },
  { id: 'conn-28', from: 'COMP1044', to: 'COMP1019', type: 'precursor', label: 'Học trước' },
  { id: 'conn-29', from: 'COMP1044', to: 'COMP1032', type: 'precursor', label: 'Học trước' },
  { id: 'conn-30', from: 'COMP1314', to: 'COMP1712', type: 'precursor', label: 'Học trước' },

  // 12. Song hành nội bộ Học kỳ 6: Kiểm tra ĐG TMTH <-> Lập trình trực quan & Robotics (MŨI TÊN 2 CHIỀU ĐỨNG)
  { id: 'conn-31', from: 'COMP1828', to: 'COMP1705', type: 'corequisite', label: 'Song hành' },

  // 13. Học kỳ 5/6 -> Học kỳ 7
  { id: 'conn-32', from: 'COMP1818', to: 'COMP1820', type: 'precursor', label: 'Học trước' },
  { id: 'conn-33', from: 'COMP1818', to: 'COMP1806', type: 'precursor', label: 'Học trước' },
  { id: 'conn-34', from: 'COMP1818', to: 'COMP1808', type: 'precursor', label: 'Học trước' },
  { id: 'conn-35', from: 'COMP1818', to: 'COMP1825', type: 'precursor', label: 'Học trước' },
  { id: 'conn-36', from: 'COMP1818', to: 'COMP1823', type: 'precursor', label: 'Học trước' },
  { id: 'conn-37', from: 'COMP1019', to: 'COMP1821', type: 'precursor', label: 'Học trước' },
  { id: 'conn-38', from: 'COMP1032', to: 'COMP1816', type: 'precursor', label: 'Học trước' },

  // 14. Học kỳ 7 -> Học kỳ 8
  { id: 'conn-39', from: 'COMP1808', to: 'COMP1824', type: 'precursor', label: 'Học trước' },
  { id: 'conn-40', from: 'COMP1823', to: 'COMP1824', type: 'precursor', label: 'Học trước' }
]

export const CURRICULUM_COURSES = [
  // ============================================================================
  // HỌC KỲ 1 (18 TC) — Đúng thứ tự từ trên xuống trong Cây CTĐT Sư phạm Tin học
  // ============================================================================
  {
    id: 'crs-hk1-poli2001',
    code: 'POLI2001',
    displayCode: 'POLI2001',
    name: 'Triết học Mác-Lênin',
    shortName: 'TH Mác-Lênin',
    credits: 3,
    knowledgeBlock: 'Đại cương',
    treeGroup: 'foundation',
    courseScope: 'school',
    isElective: false,
    semester: 'Học kỳ 1',
    prerequisites: [],
    isActive: true
  },
  {
    id: 'crs-hk1-5',
    code: 'POLI1903',
    displayCode: 'POLI1001',
    name: 'Pháp luật đại cương',
    shortName: 'Pháp luật ĐC',
    credits: 2,
    knowledgeBlock: 'Đại cương',
    treeGroup: 'foundation',
    courseScope: 'school',
    isElective: false,
    semester: 'Học kỳ 1',
    prerequisites: [],
    isActive: true
  },
  {
    id: 'crs-hk1-psyc1001',
    code: 'PSYC1001',
    displayCode: 'PSYC1001',
    name: 'Tâm lí học đại cương',
    shortName: 'Tâm lí học ĐC',
    credits: 2,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    treeGroup: 'pedagogy',
    courseScope: 'school',
    isElective: false,
    semester: 'Học kỳ 1',
    prerequisites: [],
    isActive: true
  },
  {
    id: 'crs-hk1-2',
    code: 'COMP1800',
    displayCode: 'COMP1002',
    name: 'Thiết kế Web',
    shortName: 'Thiết kế Web',
    credits: 2,
    knowledgeBlock: 'Cơ sở ngành',
    treeGroup: 'foundation',
    courseScope: 'major',
    isElective: false,
    semester: 'Học kỳ 1',
    prerequisites: [],
    isActive: true
  },
  {
    id: 'crs-hk1-1',
    code: 'COMP1010',
    displayCode: 'COMP1010',
    name: 'Lập trình cơ bản',
    shortName: 'Lập trình cơ bản',
    credits: 3,
    knowledgeBlock: 'Cơ sở ngành',
    treeGroup: 'foundation',
    courseScope: 'major',
    isElective: false,
    semester: 'Học kỳ 1',
    prerequisites: [],
    isActive: true
  },
  {
    id: 'crs-hk1-3',
    code: 'COMP1501',
    displayCode: 'COMP1001',
    name: 'Toán rời rạc và ứng dụng',
    shortName: 'Toán rời rạc và ứng dụng',
    credits: 2,
    knowledgeBlock: 'Cơ sở ngành',
    treeGroup: 'foundation',
    courseScope: 'major',
    isElective: false,
    semester: 'Học kỳ 1',
    prerequisites: [],
    isActive: true
  },
  {
    id: 'crs-hk1-4',
    code: 'COMP1805',
    displayCode: 'COMP1003',
    name: 'Cơ sở toán trong Công nghệ thông tin',
    shortName: 'Cơ sở toán trong CNTT',
    credits: 4,
    knowledgeBlock: 'Cơ sở ngành',
    treeGroup: 'foundation',
    courseScope: 'major',
    isElective: false,
    semester: 'Học kỳ 1',
    prerequisites: [],
    isActive: true
  },

  // ============================================================================
  // HỌC KỲ 2 (17 TC) — 5 HP Bắt buộc (13 TC) + Cụm 5 HP Tự chọn 2 TC
  // ============================================================================
  {
    id: 'crs-hk2-poli2002',
    code: 'POLI2002',
    displayCode: 'POLI2002',
    name: 'Kinh tế chính trị Mác-Lênin',
    shortName: 'KTCT Mác-Lênin',
    credits: 2,
    knowledgeBlock: 'Đại cương',
    treeGroup: 'foundation',
    courseScope: 'school',
    isElective: false,
    semester: 'Học kỳ 2',
    prerequisites: ['POLI2001'],
    isActive: true
  },
  {
    id: 'crs-hk2-poli2003',
    code: 'POLI2003',
    displayCode: 'POLI2003',
    name: 'Chủ nghĩa xã hội khoa học',
    shortName: 'CNXH Khoa học',
    credits: 2,
    knowledgeBlock: 'Đại cương',
    treeGroup: 'foundation',
    courseScope: 'school',
    isElective: false,
    semester: 'Học kỳ 2',
    prerequisites: ['POLI2001'],
    isActive: true
  },
  {
    id: 'crs-hk2-3',
    code: 'PSYC2802',
    displayCode: 'PSYC2802',
    name: 'Tâm lí học giáo dục',
    shortName: 'Tâm lí học GD',
    credits: 4,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    treeGroup: 'pedagogy',
    courseScope: 'school',
    isElective: false,
    semester: 'Học kỳ 2',
    prerequisites: ['PSYC1001'],
    isActive: true
  },
  {
    id: 'crs-hk2-2',
    code: 'COMP1807',
    displayCode: 'COMP1027',
    name: 'Xác suất thống kê và ứng dụng trong giáo dục',
    shortName: 'XSTK và ứng dụng trong GD',
    credits: 2,
    knowledgeBlock: 'Đại cương',
    treeGroup: 'foundation',
    courseScope: 'field',
    isElective: false,
    semester: 'Học kỳ 2',
    prerequisites: [],
    isActive: true
  },
  {
    id: 'crs-hk2-1',
    code: 'COMP1013',
    displayCode: 'COMP1013',
    name: 'Lập trình nâng cao',
    shortName: 'Lập trình NC',
    credits: 3,
    knowledgeBlock: 'Cơ sở ngành',
    treeGroup: 'foundation',
    courseScope: 'major',
    isElective: false,
    semester: 'Học kỳ 2',
    prerequisites: ['COMP1010'],
    isActive: true
  },
  // Cụm 5 học phần tự chọn ở Học kỳ 2 (Chọn 2 TC - Viền nét đứt)
  {
    id: 'crs-hk2-educ2801',
    code: 'EDUC2801',
    displayCode: 'EDUC2801',
    name: 'Phương pháp học tập hiệu quả',
    shortName: 'PP học tập hiệu quả',
    credits: 2,
    knowledgeBlock: 'Đại cương',
    treeGroup: 'foundation',
    courseScope: 'school',
    isElective: true,
    electiveGroup: 'HK2_SKILL',
    semester: 'Học kỳ 2',
    prerequisites: [],
    isActive: true
  },
  {
    id: 'crs-hk2-psyc1493',
    code: 'PSYC1493',
    displayCode: 'PSYC1493',
    name: 'Kỹ năng thích ứng & giải quyết vấn đề',
    shortName: 'Kỹ năng thích ứng & GQVĐ',
    credits: 2,
    knowledgeBlock: 'Đại cương',
    treeGroup: 'foundation',
    courseScope: 'school',
    isElective: true,
    electiveGroup: 'HK2_SKILL',
    semester: 'Học kỳ 2',
    prerequisites: [],
    isActive: true
  },
  {
    id: 'crs-hk2-psyc2801',
    code: 'PSYC2801',
    displayCode: 'PSYC2801',
    name: 'Kỹ năng làm việc nhóm & tư duy sáng tạo',
    shortName: 'KN làm việc nhóm & TDST',
    credits: 2,
    knowledgeBlock: 'Đại cương',
    treeGroup: 'foundation',
    courseScope: 'school',
    isElective: true,
    electiveGroup: 'HK2_SKILL',
    semester: 'Học kỳ 2',
    prerequisites: [],
    isActive: true
  },
  {
    id: 'crs-hk2-comp1810',
    code: 'COMP1810',
    displayCode: 'COMP1810',
    name: 'Trí tuệ nhân tạo trong giáo dục',
    shortName: 'TTNT trong GD',
    credits: 2,
    knowledgeBlock: 'Đại cương',
    treeGroup: 'foundation',
    courseScope: 'school',
    isElective: true,
    electiveGroup: 'HK2_SKILL',
    semester: 'Học kỳ 2',
    prerequisites: [],
    isActive: true
  },
  {
    id: 'crs-hk2-domi18',
    code: 'DOMI18',
    displayCode: 'DOMI18',
    name: 'Giáo dục đời sống gia đình',
    shortName: 'Giáo dục đời sống',
    credits: 2,
    knowledgeBlock: 'Đại cương',
    treeGroup: 'foundation',
    courseScope: 'school',
    isElective: true,
    electiveGroup: 'HK2_SKILL',
    semester: 'Học kỳ 2',
    prerequisites: [],
    isActive: true
  },

  // ============================================================================
  // HỌC KỲ 3 (15 TC) — 5 HP Bắt buộc
  // ============================================================================
  {
    id: 'crs-hk3-poli2005',
    code: 'POLI2005',
    displayCode: 'POLI2005',
    name: 'Tư tưởng Hồ Chí Minh',
    shortName: 'Tư tưởng HCM',
    credits: 2,
    knowledgeBlock: 'Đại cương',
    treeGroup: 'foundation',
    courseScope: 'school',
    isElective: false,
    semester: 'Học kỳ 3',
    prerequisites: ['POLI2003'],
    isActive: true
  },
  {
    id: 'crs-hk3-4',
    code: 'EDUC2802',
    displayCode: 'EDUC2802',
    name: 'Giáo dục học',
    shortName: 'Giáo dục học',
    credits: 4,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    treeGroup: 'pedagogy',
    courseScope: 'school',
    isElective: false,
    semester: 'Học kỳ 3',
    prerequisites: ['PSYC1001'],
    isActive: true
  },
  {
    id: 'crs-hk3-1',
    code: 'COMP1016',
    displayCode: 'COMP1016',
    name: 'Cấu trúc dữ liệu',
    shortName: 'Cấu trúc dữ liệu',
    credits: 3,
    knowledgeBlock: 'Cơ sở ngành',
    treeGroup: 'foundation',
    courseScope: 'field',
    isElective: false,
    semester: 'Học kỳ 3',
    prerequisites: ['COMP1013'],
    isActive: true
  },
  {
    id: 'crs-hk3-2',
    code: 'COMP1017',
    displayCode: 'COMP1017',
    name: 'Lập trình hướng đối tượng',
    shortName: 'Lập trình HĐT',
    credits: 3,
    knowledgeBlock: 'Cơ sở ngành',
    treeGroup: 'foundation',
    courseScope: 'field',
    isElective: false,
    semester: 'Học kỳ 3',
    prerequisites: ['COMP1013'],
    isActive: true
  },
  {
    id: 'crs-hk3-3',
    code: 'COMP1701',
    displayCode: 'COMP1701',
    name: 'Lý thuyết đồ thị và ứng dụng',
    shortName: 'LTĐT & ƯD',
    credits: 3,
    knowledgeBlock: 'Cơ sở ngành',
    treeGroup: 'foundation',
    courseScope: 'major',
    isElective: false,
    semester: 'Học kỳ 3',
    prerequisites: [],
    isActive: true
  },

  // ============================================================================
  // HỌC KỲ 4 (15 TC) — 6 HP Bắt buộc
  // ============================================================================
  {
    id: 'crs-hk4-poli2004',
    code: 'POLI2004',
    displayCode: 'POLI2004',
    name: 'Lịch sử Đảng Cộng sản Việt Nam',
    shortName: 'Lịch sử ĐCSVN',
    credits: 2,
    knowledgeBlock: 'Đại cương',
    treeGroup: 'foundation',
    courseScope: 'school',
    isElective: false,
    semester: 'Học kỳ 4',
    prerequisites: ['POLI2005'],
    isActive: true
  },
  {
    id: 'crs-hk4-edut2801',
    code: 'EDUT2801',
    displayCode: 'EDUT2801',
    name: 'Phương pháp nghiên cứu khoa học và Sư phạm ứng dụng',
    shortName: 'PPNCKH&SPƯD',
    credits: 2,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    treeGroup: 'pedagogy',
    courseScope: 'school',
    isElective: false,
    semester: 'Học kỳ 4',
    prerequisites: [],
    isActive: true
  },
  {
    id: 'crs-hk4-edut2802',
    code: 'EDUT2802',
    displayCode: 'EDUT2802',
    name: 'Đại cương về Lí luận dạy học',
    shortName: 'ĐC về LLDH',
    credits: 2,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    treeGroup: 'pedagogy',
    courseScope: 'school',
    isElective: false,
    semester: 'Học kỳ 4',
    prerequisites: ['EDUC2802'],
    isActive: true
  },
  {
    id: 'crs-hk4-1',
    code: 'COMP1011',
    displayCode: 'COMP1011',
    name: 'Kiến trúc máy tính và Hợp ngữ',
    shortName: 'KTMT & HĐH',
    credits: 3,
    knowledgeBlock: 'Cơ sở ngành',
    treeGroup: 'foundation',
    courseScope: 'field',
    isElective: false,
    semester: 'Học kỳ 4',
    prerequisites: ['COMP1010'],
    isActive: true
  },
  {
    id: 'crs-hk4-2',
    code: 'COMP1018',
    displayCode: 'COMP1018',
    name: 'Cơ sở dữ liệu',
    shortName: 'Cơ sở dữ liệu',
    credits: 3,
    knowledgeBlock: 'Cơ sở ngành',
    treeGroup: 'foundation',
    courseScope: 'field',
    isElective: false,
    semester: 'Học kỳ 4',
    prerequisites: ['COMP1017'],
    isActive: true
  },
  {
    id: 'crs-hk4-3',
    code: 'COMP1401',
    displayCode: 'COMP1401',
    name: 'Phân tích và thiết kế giải thuật',
    shortName: 'PT & TK GT',
    credits: 3,
    knowledgeBlock: 'Cơ sở ngành',
    treeGroup: 'foundation',
    courseScope: 'major',
    isElective: false,
    semester: 'Học kỳ 4',
    prerequisites: ['COMP1016', 'COMP1017'],
    isActive: true
  },

  // ============================================================================
  // HỌC KỲ 5 (18 TC) — 6 HP Bắt buộc
  // ============================================================================
  {
    id: 'crs-hk5-3',
    code: 'COMP1819',
    displayCode: 'COMP1819',
    name: 'Phát triển chương trình môn Tin học',
    shortName: 'PTCT môn TH',
    credits: 3,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    treeGroup: 'pedagogy',
    courseScope: 'major',
    isElective: false,
    semester: 'Học kỳ 5',
    prerequisites: ['EDUT2802'],
    isActive: true
  },
  {
    id: 'crs-hk5-2',
    code: 'COMP1818',
    displayCode: 'COMP1818',
    name: 'Phương pháp dạy học môn Tin học',
    shortName: 'PPDH môn TH',
    credits: 3,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    treeGroup: 'pedagogy',
    courseScope: 'major',
    isElective: false,
    semester: 'Học kỳ 5',
    prerequisites: ['EDUT2802'],
    isActive: true
  },
  {
    id: 'crs-2',
    code: 'COMP1015',
    displayCode: 'COMP1015',
    name: 'Nhập môn Mạng máy tính',
    shortName: 'Nhập môn MMT',
    credits: 3,
    knowledgeBlock: 'Cơ sở ngành',
    treeGroup: 'foundation',
    courseScope: 'field',
    isElective: false,
    semester: 'Học kỳ 5',
    prerequisites: ['COMP1011'],
    isActive: true
  },
  {
    id: 'crs-1',
    code: 'COMP1044',
    displayCode: 'COMP1044',
    name: 'Nhập môn Công nghệ phần mềm',
    shortName: 'Nhập môn CNPM',
    credits: 3,
    knowledgeBlock: 'Chuyên ngành',
    treeGroup: 'foundation',
    courseScope: 'field',
    isElective: false,
    semester: 'Học kỳ 5',
    prerequisites: ['COMP1018'],
    isActive: true
  },
  {
    id: 'crs-hk5-5',
    code: 'COMP1332',
    displayCode: 'COMP1332',
    name: 'Hệ điều hành',
    shortName: 'Hệ điều hành',
    credits: 3,
    knowledgeBlock: 'Cơ sở ngành',
    treeGroup: 'foundation',
    courseScope: 'major',
    isElective: false,
    semester: 'Học kỳ 5',
    prerequisites: ['COMP1011'],
    isActive: true
  },
  {
    id: 'crs-hk5-6',
    code: 'COMP1314',
    displayCode: 'COMP1314',
    name: 'Trí tuệ nhân tạo',
    shortName: 'Trí tuệ nhân tạo',
    credits: 3,
    knowledgeBlock: 'Chuyên ngành',
    treeGroup: 'foundation',
    courseScope: 'major',
    isElective: false,
    semester: 'Học kỳ 5',
    prerequisites: ['COMP1401', 'COMP1701'],
    isActive: true
  },

  // ============================================================================
  // HỌC KỲ 6 (15 TC) — 6 HP Bắt buộc
  // ============================================================================
  {
    id: 'crs-hk6-1',
    code: 'COMP1827',
    displayCode: 'COMP1807',
    name: 'Ứng dụng CNTT trong dạy học Tin học',
    shortName: 'UD-CNTT trong dạy học TH',
    credits: 2,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    treeGroup: 'pedagogy',
    courseScope: 'major',
    isElective: false,
    semester: 'Học kỳ 6',
    prerequisites: ['COMP1819'],
    isActive: true
  },
  {
    id: 'crs-hk6-2',
    code: 'COMP1828',
    displayCode: 'COMP1828',
    name: 'Kiểm tra, đánh giá trong môn Tin học',
    shortName: 'KT, ĐG TMTH',
    credits: 2,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    treeGroup: 'pedagogy',
    courseScope: 'major',
    isElective: false,
    semester: 'Học kỳ 6',
    prerequisites: ['COMP1818'],
    isActive: true
  },
  {
    id: 'crs-hk6-3',
    code: 'COMP1705',
    displayCode: 'COMP1705',
    name: 'Lập trình trực quan và Robotics',
    shortName: 'Lập trình trực quan và Robotics',
    credits: 2,
    knowledgeBlock: 'Chuyên ngành',
    treeGroup: 'foundation',
    courseScope: 'major',
    isElective: false,
    semester: 'Học kỳ 6',
    prerequisites: ['COMP1015'],
    isActive: true
  },
  {
    id: 'crs-hk6-4',
    code: 'COMP1019',
    displayCode: 'COMP1019',
    name: 'Lập trình trên Windows',
    shortName: 'Lập trình trên Windows',
    credits: 3,
    knowledgeBlock: 'Chuyên ngành',
    treeGroup: 'foundation',
    courseScope: 'field',
    isElective: false,
    semester: 'Học kỳ 6',
    prerequisites: ['COMP1044'],
    isActive: true
  },
  {
    id: 'crs-hk6-5',
    code: 'COMP1032',
    displayCode: 'COMP1032',
    name: 'Phân tích và thiết kế Hệ thống thông tin',
    shortName: 'Phân tích và TK HTTT',
    credits: 3,
    knowledgeBlock: 'Chuyên ngành',
    treeGroup: 'foundation',
    courseScope: 'field',
    isElective: false,
    semester: 'Học kỳ 6',
    prerequisites: ['COMP1044', 'COMP1018'],
    isActive: true
  },
  {
    id: 'crs-hk6-6',
    code: 'COMP1712',
    displayCode: 'COMP1712',
    name: 'Học máy',
    shortName: 'Học máy',
    credits: 3,
    knowledgeBlock: 'Chuyên ngành',
    treeGroup: 'foundation',
    courseScope: 'major',
    isElective: false,
    semester: 'Học kỳ 6',
    prerequisites: ['COMP1314', 'COMP1805'],
    isActive: true
  },

  // ============================================================================
  // HỌC KỲ 7 (15 TC) — 5 HP Bắt buộc (11 TC) + 2 HP Tự chọn (4 TC)
  // ============================================================================
  {
    id: 'crs-hk7-1',
    code: 'EDUC2803',
    displayCode: 'EDUC2803',
    name: 'Khởi nghiệp và Giáo dục khởi nghiệp',
    shortName: 'Khởi nghiệp & Giáo dục KH',
    credits: 2,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    treeGroup: 'pedagogy',
    courseScope: 'school',
    isElective: false,
    semester: 'Học kỳ 7',
    prerequisites: ['EDUC2802'],
    isActive: true
  },
  {
    id: 'crs-hk7-2',
    code: 'COMP1820',
    displayCode: 'COMP1820',
    name: 'Đào tạo điện tử và ứng dụng',
    shortName: 'Đào tạo ĐT & ƯD',
    credits: 2,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    treeGroup: 'pedagogy',
    courseScope: 'major',
    isElective: false,
    semester: 'Học kỳ 7',
    prerequisites: ['COMP1818'],
    isActive: true
  },
  {
    id: 'crs-hk7-3',
    code: 'COMP1806',
    displayCode: 'COMP1806',
    name: 'Dạy học Chủ đề học tập trong môn Tin học',
    shortName: 'Dạy học CĐ học tập trong môn TH',
    credits: 2,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    treeGroup: 'pedagogy',
    courseScope: 'major',
    isElective: true,
    semester: 'Học kỳ 7',
    prerequisites: ['COMP1818'],
    isActive: true
  },
  {
    id: 'crs-hk7-4',
    code: 'COMP1808',
    displayCode: 'COMP1808',
    name: 'Thực hành dạy học môn Tin học',
    shortName: 'TH DH môn TH',
    credits: 3,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    treeGroup: 'practice',
    courseScope: 'school',
    isElective: false,
    semester: 'Học kỳ 7',
    prerequisites: ['COMP1818'],
    isActive: true
  },
  {
    id: 'crs-hk7-5',
    code: 'COMP1825',
    displayCode: 'COMP1825',
    name: 'Tổ chức dạy học theo chủ đề STEM',
    shortName: 'Tổ chức DH theo chủ đề STEM',
    credits: 2,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    treeGroup: 'pedagogy',
    courseScope: 'major',
    isElective: true,
    semester: 'Học kỳ 7',
    prerequisites: ['COMP1818'],
    isActive: true
  },
  {
    id: 'crs-hk7-6',
    code: 'COMP1823',
    displayCode: 'COMP1823',
    name: 'Thực tập sư phạm 1',
    shortName: 'TTSP 1',
    credits: 2,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    treeGroup: 'practice',
    courseScope: 'school',
    isElective: false,
    semester: 'Học kỳ 7',
    prerequisites: ['COMP1818'],
    isActive: true
  },
  {
    id: 'crs-hk7-7',
    code: 'COMP1816',
    displayCode: 'COMP1816',
    name: 'Quản trị Hệ thống thông tin',
    shortName: 'Quản trị HTTT',
    credits: 2,
    knowledgeBlock: 'Chuyên ngành',
    treeGroup: 'foundation',
    courseScope: 'field',
    isElective: false,
    semester: 'Học kỳ 7',
    prerequisites: ['COMP1032'],
    isActive: true
  },
  {
    id: 'crs-hk7-8',
    code: 'COMP1821',
    displayCode: 'COMP1821',
    name: 'Dạy học Lập trình nâng cao trong trường phổ thông',
    shortName: 'Dạy học LTNC trong trường PT',
    credits: 2,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    treeGroup: 'pedagogy',
    courseScope: 'major',
    isElective: true,
    semester: 'Học kỳ 7',
    prerequisites: ['COMP1019'],
    isActive: true
  },

  // ============================================================================
  // HỌC KỲ 8 (11 TC) — 1 HP Bắt buộc (5 TC) + 1 Nhóm Tốt nghiệp tự chọn (6 TC)
  // ============================================================================
  {
    id: 'crs-hk8-1',
    code: 'COMP1048',
    displayCode: 'COMP1040',
    name: 'Khóa luận tốt nghiệp',
    shortName: 'Khóa luận TN',
    credits: 6,
    knowledgeBlock: 'Chuyên ngành',
    treeGroup: 'graduation',
    courseScope: 'major',
    isElective: true,
    semester: 'Học kỳ 8',
    prerequisites: [],
    isActive: true
  },
  {
    id: 'crs-hk8-2',
    code: 'COMP1814',
    displayCode: 'COMP1014',
    name: 'Sản phẩm nghiên cứu khoa học',
    shortName: 'Sản phẩm NCKH',
    credits: 3,
    knowledgeBlock: 'Chuyên ngành',
    treeGroup: 'graduation',
    courseScope: 'major',
    isElective: true,
    semester: 'Học kỳ 8',
    prerequisites: [],
    isActive: true
  },
  {
    id: 'crs-hk8-3',
    code: 'COMP1826',
    displayCode: 'COMP1020',
    name: 'Hồ sơ tốt nghiệp',
    shortName: 'Hồ sơ tốt nghiệp',
    credits: 3,
    knowledgeBlock: 'Chuyên ngành',
    treeGroup: 'graduation',
    courseScope: 'major',
    isElective: true,
    semester: 'Học kỳ 8',
    prerequisites: [],
    isActive: true
  },
  {
    id: 'crs-hk8-4',
    code: 'COMP1824',
    displayCode: 'COMP1024',
    name: 'Thực tập sư phạm 2',
    shortName: 'TTSP 2',
    credits: 5,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    treeGroup: 'practice',
    courseScope: 'school',
    isElective: false,
    semester: 'Học kỳ 8',
    prerequisites: ['COMP1808', 'COMP1823'],
    isActive: true
  }
]
