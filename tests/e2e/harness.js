/**
 * ============================================================================
 * TEST HARNESS & ASSERTION ENGINE CHO BỘ E2E RUNNER 5SHARE
 * Hỗ trợ định dạng màu sắc Terminal, thu thập chỉ số và đo đạc hiệu năng
 * ============================================================================
 */

const assert = require('assert');

// ANSI Color Codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';

class TestHarness {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      durationMs: 0,
      details: []
    };
  }

  /**
   * Đăng ký ca kiểm thử mới
   * @param {string} id - Định danh ca kiểm thử (e.g., T1_FR01_01)
   * @param {string} name - Tên mô tả chi tiết ca kiểm thử
   * @param {object} meta - Thông tin metadata { tier: 1..4, fr: 'FR-01'..'FR-13' }
   * @param {Function} fn - Hàm thực thi kiểm thử (sync hoặc async)
   */
  register(id, name, meta, fn) {
    this.tests.push({ id, name, meta, fn });
  }

  /**
   * Chạy tất cả các ca kiểm thử phù hợp với bộ lọc
   */
  async run({ tier = null, fr = null, verbose = false } = {}) {
    const startTime = Date.now();
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      durationMs: 0,
      details: []
    };

    let filteredTests = this.tests;
    if (tier !== null) {
      filteredTests = filteredTests.filter((t) => t.meta.tier === Number(tier));
    }
    if (fr !== null) {
      const num = String(fr).replace(/^FR-?/i, '');
      const normalizedFr = `FR-${num.padStart(2, '0')}`.toUpperCase();
      filteredTests = filteredTests.filter((t) => (t.meta.fr || '').toUpperCase() === normalizedFr);
    }

    this.results.total = filteredTests.length;

    for (const testCase of filteredTests) {
      const tStart = Date.now();
      try {
        await testCase.fn(this.assertions);
        const tDuration = Date.now() - tStart;
        this.results.passed++;
        this.results.details.push({
          id: testCase.id,
          name: testCase.name,
          meta: testCase.meta,
          status: 'PASS',
          durationMs: tDuration,
          error: null
        });

        if (verbose) {
          console.log(`  ${GREEN}✓${RESET} ${GRAY}[${testCase.id}]${RESET} ${testCase.name} ${GRAY}(${tDuration}ms)${RESET}`);
        }
      } catch (err) {
        const tDuration = Date.now() - tStart;
        this.results.failed++;
        this.results.details.push({
          id: testCase.id,
          name: testCase.name,
          meta: testCase.meta,
          status: 'FAIL',
          durationMs: tDuration,
          error: err
        });

        console.error(`  ${RED}✗${RESET} ${BOLD}[${testCase.id}]${RESET} ${testCase.name}`);
        console.error(`    ${RED}Lỗi: ${err.message}${RESET}`);
        if (err.stack && verbose) {
          console.error(`    ${GRAY}${err.stack.split('\n').slice(1, 4).join('\n    ')}${RESET}`);
        }
      }
    }

    this.results.durationMs = Date.now() - startTime;
    return this.results;
  }

  get assertions() {
    return {
      eq(actual, expected, msg) {
        assert.strictEqual(actual, expected, msg);
      },
      deepEq(actual, expected, msg) {
        assert.deepStrictEqual(actual, expected, msg);
      },
      true(condition, msg) {
        assert.strictEqual(Boolean(condition), true, msg || 'Expected true');
      },
      false(condition, msg) {
        assert.strictEqual(Boolean(condition), false, msg || 'Expected false');
      },
      match(val, regex, msg) {
        assert.match(String(val), regex, msg);
      },
      includes(collection, item, msg) {
        if (typeof collection === 'string') {
          assert.ok(collection.includes(item), msg || `Expected "${collection}" to include "${item}"`);
        } else if (Array.isArray(collection)) {
          assert.ok(collection.includes(item), msg || `Expected array to include item`);
        } else {
          throw new Error('Unsupported collection type in includes assertion');
        }
      },
      throws(fn, expectedErr, msg) {
        let threw = false;
        try {
          fn();
        } catch (err) {
          threw = true;
          if (expectedErr instanceof RegExp) {
            assert.match(err.message, expectedErr, msg);
          } else if (typeof expectedErr === 'string') {
            assert.ok(err.message.includes(expectedErr), msg || `Expected error containing "${expectedErr}", got "${err.message}"`);
          }
        }
        assert.ok(threw, msg || 'Expected function to throw error');
      },
      async rejects(asyncFn, expectedErr, msg) {
        let threw = false;
        try {
          await asyncFn();
        } catch (err) {
          threw = true;
          if (expectedErr instanceof RegExp) {
            assert.match(err.message, expectedErr, msg);
          } else if (typeof expectedErr === 'string') {
            assert.ok(err.message.includes(expectedErr), msg || `Expected error containing "${expectedErr}", got "${err.message}"`);
          }
        }
        assert.ok(threw, msg || 'Expected async function to reject');
      }
    };
  }
}

module.exports = {
  TestHarness,
  COLORS: { RESET, BOLD, RED, GREEN, YELLOW, BLUE, CYAN, GRAY }
};
