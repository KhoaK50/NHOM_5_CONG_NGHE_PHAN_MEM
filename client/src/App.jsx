import { useState } from 'react'
import './App.css'

function App() {
  const [search, setSearch] = useState('')

  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '50px 20px', backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <span style={{ backgroundColor: '#1e293b', color: '#38bdf8', padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
          🎓 Đồ án Công nghệ Phần mềm - Nhóm 5 (HCMUE)
        </span>
        
        <h1 style={{ fontSize: '42px', marginTop: '24px', marginBottom: '12px', color: '#ffffff' }}>
          Hệ thống 5share
        </h1>
        
        <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: '1.6' }}>
          Quản lý và Chia sẻ Tài liệu Học tập cho Sinh viên ngành Sư phạm Tin học
        </p>

        <div style={{ marginTop: '36px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Tìm kiếm giáo án, đề thi, slide môn học..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '60%', padding: '14px 20px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '16px', outline: 'none' }}
          />
          <button style={{ padding: '14px 28px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            Tìm kiếm
          </button>
        </div>

        <div style={{ marginTop: '50px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', textAlign: 'left' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
            <h3 style={{ color: '#38bdf8', margin: '0 0 10px 0' }}>📘 Đại cương</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Toán rời rạc, Triết học, Đại số tuyến tính...</p>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
            <h3 style={{ color: '#38bdf8', margin: '0 0 10px 0' }}>💻 Chuyên ngành</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Cấu trúc dữ liệu, Lập trình Web, Cơ sở dữ liệu...</p>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
            <h3 style={{ color: '#38bdf8', margin: '0 0 10px 0' }}>🍎 Nghiệp vụ Sư phạm</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Phương pháp dạy học Tin học, Giáo án mẫu...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App