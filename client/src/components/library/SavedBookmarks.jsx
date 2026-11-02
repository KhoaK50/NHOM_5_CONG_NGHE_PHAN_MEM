import { useState } from 'react'
import {
  Bookmark,
  Compass,
  Search,
  BookOpen,
  Plus,
  Trash2,
  FileText,
  X
} from 'lucide-react'

// UC12 - Tài liệu đã lưu / Đánh dấu trang kèm ghi chú cá nhân
const DEFAULT_PAGE_NOTES = {
  'doc-1': [
    { id: 'bm-1', page: 4, note: 'Khởi động & Hoạt động hình thành kiến thức mới (CV 5512)' },
    { id: 'bm-2', page: 12, note: 'Rubric đánh giá năng lực giải quyết vấn đề với Python' }
  ],
  'doc-2': [
    { id: 'bm-3', page: 7, note: 'Cây đỏ-đen và độ phức tạp cài đặt C++17' }
  ],
  'doc-4': [
    { id: 'bm-4', page: 3, note: 'Ma trận đề thi kết thúc học phần Cơ sở dữ liệu' }
  ]
}

export default function SavedBookmarks({
  documents = [],
  bookmarkedIds = [],
  onSelectDoc,
  onToggleBookmark,
  onNavigateDiscovery
}) {
  const [keyword, setKeyword] = useState('')
  const [pageNotesByDoc, setPageNotesByDoc] = useState(DEFAULT_PAGE_NOTES)
  const [addingNoteDocId, setAddingNoteDocId] = useState(null)
  const [newPageNum, setNewPageNum] = useState('')
  const [newPageNote, setNewPageNote] = useState('')

  const savedDocs = documents.filter(
    (doc) => bookmarkedIds.includes(doc.id) && doc.status === 'APPROVED'
  )

  const filteredDocs = savedDocs.filter((doc) => {
    const q = keyword.trim().toLowerCase()
    if (!q) return true
    return (
      doc.title?.toLowerCase().includes(q) ||
      doc.courseCode?.toLowerCase().includes(q) ||
      doc.courseName?.toLowerCase().includes(q)
    )
  })

  const handleAddPageNote = (e, docId) => {
    e.preventDefault()
    const pageInt = Math.max(1, parseInt(newPageNum, 10) || 1)
    const noteStr = newPageNote.trim()
    const nextEntry = {
      id: `bm-${Date.now()}`,
      page: pageInt,
      note: noteStr
    }
    setPageNotesByDoc((prev) => ({
      ...prev,
      [docId]: [...(prev[docId] || []), nextEntry]
    }))
    setAddingNoteDocId(null)
    setNewPageNum('')
    setNewPageNote('')
  }

  const handleRemovePageNote = (docId, noteId) => {
    setPageNotesByDoc((prev) => ({
      ...prev,
      [docId]: (prev[docId] || []).filter((item) => item.id !== noteId)
    }))
  }

  return (
    <div>
      {/* Header & Thanh tìm kiếm nhanh trong tủ đã lưu */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Tài liệu đã lưu & Đánh dấu trang
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            {savedDocs.length} học liệu đã lưu • Quản lý các trang quan trọng đã đánh dấu để đọc tiếp nhanh chóng.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '11px',
                color: 'var(--text-tertiary)',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm trong tài liệu đã lưu..."
              style={{
                height: '36px',
                padding: '0 12px 0 32px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                minWidth: '240px'
              }}
            />
          </div>

          <span className="status-badge blue">
            <Bookmark size={13} /> {savedDocs.length} học liệu
          </span>
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="empty-state-box">
          <Bookmark size={38} style={{ color: 'var(--text-tertiary)', marginBottom: '10px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700 }}>
            {savedDocs.length === 0
              ? 'Tủ tài liệu cá nhân của bạn đang trống'
              : 'Không tìm thấy tài liệu phù hợp với từ khóa'}
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Nhấn vào biểu tượng Đánh dấu trên bất kỳ thẻ học liệu nào để lưu vào tủ cá nhân và ghi chú số trang.
          </p>
          {onNavigateDiscovery && (
            <button
              type="button"
              className="btn-solid-primary"
              onClick={onNavigateDiscovery}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Compass size={15} />
              <span>Khám phá kho học liệu ngay</span>
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '16px'
          }}
        >
          {filteredDocs.map((doc) => {
            const notes = pageNotesByDoc[doc.id] || []
            const isAddingNote = addingNoteDocId === doc.id

            return (
              <div
                key={doc.id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px 20px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '40px',
                          height: '46px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--blue-1, #f0f7ff)',
                          border: '1px solid var(--blue-3, #d2e7ff)',
                          color: 'var(--blue-9, #0090ff)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 800,
                          flexShrink: 0,
                          gap: '2px'
                        }}
                      >
                        <FileText size={14} />
                        <span>{(doc.format || 'PDF').toUpperCase()}</span>
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span className="status-badge blue">{doc.courseCode}</span>
                          <span className="status-badge slate">{doc.docType}</span>
                        </div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: '15px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            lineHeight: 1.4,
                            cursor: 'pointer'
                          }}
                          onClick={() => onSelectDoc && onSelectDoc(doc)}
                        >
                          {doc.title}
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {doc.courseName} • Tác giả: {doc.uploaderName}
                        </p>
                      </div>
                    </div>

                    {onToggleBookmark && (
                      <button
                        type="button"
                        onClick={() => onToggleBookmark(doc.id)}
                        title="Bỏ lưu khỏi tủ cá nhân"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0,
                          padding: '4px'
                        }}
                      >
                        <Trash2 size={14} />
                        <span>Bỏ lưu</span>
                      </button>
                    )}
                  </div>

                  {/* Danh sách trang đã đánh dấu (Page Bookmarks - UC12) */}
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '12px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--bg-muted)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>Đánh dấu trang ({notes.length})</span>
                    </div>

                    {notes.length === 0 ? (
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        Chưa có trang nào được đánh dấu riêng trong học liệu này.
                      </p>
                    ) : (
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {notes.map((b) => (
                          <li
                            key={b.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              fontSize: '12px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <span
                                style={{
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  backgroundColor: 'var(--amber-2)',
                                  color: 'var(--amber-11)',
                                  fontWeight: 700,
                                  fontSize: '11px',
                                  flexShrink: 0
                                }}
                              >
                                Tr. {b.page}
                              </span>
                              <span
                                style={{
                                  color: 'var(--text-primary)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {b.note || 'Chưa có ghi chú'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemovePageNote(doc.id, b.id)}
                              title="Xóa đánh dấu trang này"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-tertiary)',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'inline-flex'
                              }}
                            >
                              <X size={13} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Form thêm đánh dấu trang mới */}
                    {isAddingNote && (
                      <form
                        onSubmit={(e) => handleAddPageNote(e, doc.id)}
                        style={{
                          marginTop: '10px',
                          paddingTop: '10px',
                          borderTop: '1px solid var(--border-subtle)',
                          display: 'flex',
                          gap: '6px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Trang"
                          value={newPageNum}
                          onChange={(e) => setNewPageNum(e.target.value)}
                          style={{
                            width: '68px',
                            height: '32px',
                            padding: '0 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            backgroundColor: 'var(--bg-surface)',
                            fontSize: '12px'
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Ghi chú nội dung trang..."
                          value={newPageNote}
                          onChange={(e) => setNewPageNote(e.target.value)}
                          style={{
                            flex: 1,
                            minWidth: '140px',
                            height: '32px',
                            padding: '0 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            backgroundColor: 'var(--bg-surface)',
                            fontSize: '12px'
                          }}
                        />
                        <button
                          type="submit"
                          className="btn-solid-primary"
                          style={{ height: '32px', padding: '0 10px', fontSize: '12px' }}
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => setAddingNoteDocId(null)}
                          style={{ height: '32px', padding: '0 8px', fontSize: '12px' }}
                        >
                          Hủy
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Footer hành động */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-solid-primary"
                    onClick={() => onSelectDoc && onSelectDoc(doc)}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <BookOpen size={14} />
                    <span>Đọc tiếp</span>
                  </button>

                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setAddingNoteDocId(isAddingNote ? null : doc.id)
                      setNewPageNum('')
                      setNewPageNote('')
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} />
                    <span>Thêm đánh dấu trang</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
