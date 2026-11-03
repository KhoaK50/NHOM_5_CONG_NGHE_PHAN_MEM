const pool = require('./pool');
const { INITIAL_COURSES } = require('../../client/src/data/mockData.js');

const blockMap = {
  'Đại cương': 'DAI_CUONG',
  'Cơ sở ngành': 'CO_SO_NGANH',
  'Chuyên ngành': 'CHUYEN_NGANH',
  'Nghiệp vụ Sư phạm': 'NGHIEP_VU_SU_PHAM'
};

const semMap = {
  'Học kỳ 1': 1,
  'Học kỳ 2': 2,
  'Học kỳ 3': 3,
  'Học kỳ 4': 4,
  'Học kỳ 5': 5,
  'Học kỳ 6': 6,
  'Học kỳ 7': 7,
  'Học kỳ 8': 8
};

async function seedAllCourses() {
  console.log(`Bắt đầu đồng bộ ${INITIAL_COURSES.length} môn học CTĐT Sư phạm Tin học vào Supabase...`);
  let inserted = 0;
  for (const c of INITIAL_COURSES) {
    const block = blockMap[c.knowledgeBlock];
    const sem = semMap[c.semester];
    const summary = c.shortName ? `${c.name} (${c.shortName})` : c.name;
    await pool.query(
      `INSERT INTO public.courses (course_code, course_name, knowledge_block, credits, semester, summary, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (course_code) DO UPDATE SET
         course_name = EXCLUDED.course_name,
         knowledge_block = EXCLUDED.knowledge_block,
         credits = EXCLUDED.credits,
         semester = EXCLUDED.semester,
         summary = EXCLUDED.summary,
         is_active = true`,
      [c.code, c.name, block, c.credits, sem, summary]
    );
    inserted++;
  }
  const countRes = await pool.query('SELECT count(*)::int AS count FROM public.courses');
  console.log(`✅ Đã đồng bộ thành công ${inserted} môn học! Tổng số môn trong public.courses hiện tại: ${countRes.rows[0].count}`);
  process.exit(0);
}

seedAllCourses().catch((err) => {
  console.error('❌ Lỗi nạp môn học:', err);
  process.exit(1);
});
