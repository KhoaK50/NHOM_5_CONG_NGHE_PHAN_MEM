import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveSeasonId } from '../src/seasons/seasons.js'

const resolve = (date, search = '', mode = 'auto') =>
  resolveSeasonId(new Date(date), search, undefined, mode)

test('Noel chỉ tự bật từ 01/12 đến hết 31/12 theo giờ Việt Nam', () => {
  assert.equal(resolve('2026-11-30T16:59:59Z'), null)
  assert.equal(resolve('2026-11-30T17:00:00Z'), 'christmas')
  assert.equal(resolve('2026-12-31T16:59:59Z'), 'christmas')
  assert.equal(resolve('2026-12-31T17:00:00Z'), null)
})

test('Lịch 20/11 giữ nguyên và không giao với Noel', () => {
  assert.equal(resolve('2026-11-12T16:59:59Z'), null)
  assert.equal(resolve('2026-11-12T17:00:00Z'), 'teachers-day')
  assert.equal(resolve('2026-11-21T16:59:59Z'), 'teachers-day')
  assert.equal(resolve('2026-11-21T17:00:00Z'), null)
})

test('Không cấu hình hoặc off vẫn là giao diện gốc ngay trong Noel', () => {
  assert.equal(resolve('2026-12-25T00:00:00Z', '', 'off'), null)
  assert.equal(resolveSeasonId(new Date('2026-12-25T00:00:00Z')), null)
})

test('Có thể ép bật từng theme ngoài lịch bằng cấu hình build', () => {
  assert.equal(resolve('2026-06-01T00:00:00Z', '', 'christmas'), 'christmas')
  assert.equal(resolve('2026-12-25T00:00:00Z', '', 'teachers-day'), 'teachers-day')
})

test('Xem trước trong tab được ưu tiên hơn lịch và cấu hình build', () => {
  assert.equal(resolve('2026-11-20T00:00:00Z', '?season=christmas'), 'christmas')
  assert.equal(resolve('2026-12-25T00:00:00Z', '?season=teachers-day'), 'teachers-day')
  assert.equal(resolve('2026-12-25T00:00:00Z', '?season=off', 'christmas'), null)
  assert.equal(resolve('2026-06-01T00:00:00Z', '?season=christmas', 'off'), 'christmas')
})

test('Tên theme không hợp lệ không chèn được giá trị lạ vào DOM', () => {
  assert.equal(resolve('2026-06-01T00:00:00Z', '?season=unknown', 'off'), null)
  assert.equal(resolve('2026-12-25T00:00:00Z', '?season=unknown'), 'christmas')
  assert.equal(resolve('2026-12-25T00:00:00Z', '', 'unknown'), null)
})

test('Cơ chế lịch qua năm mới vẫn được hỗ trợ', () => {
  const seasons = [{ id: 'new-year', from: '12-28', to: '01-02' }]
  for (const date of ['2026-12-28T00:00:00Z', '2027-01-02T00:00:00Z']) {
    assert.equal(resolveSeasonId(new Date(date), '', seasons, 'auto'), 'new-year')
  }
  assert.equal(resolveSeasonId(new Date('2027-01-03T00:00:00Z'), '', seasons, 'auto'), null)
})
