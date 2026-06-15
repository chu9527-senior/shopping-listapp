const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, 'shopping-list.html').replace(/\\/g, '/');

test.beforeEach(async ({ page }) => {
  await page.goto(FILE_URL);
  // localStorage 초기화 (이전 테스트 데이터 제거)
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// ── 1. 아이템 추가 ──────────────────────────────────────────────
test('버튼 클릭으로 아이템 추가', async ({ page }) => {
  await page.fill('#itemInput', '우유');
  await page.click('#addBtn');

  await expect(page.locator('.item-name')).toHaveCount(1);
  await expect(page.locator('.item-name').first()).toHaveText('우유');
});

test('Enter 키로 아이템 추가', async ({ page }) => {
  await page.fill('#itemInput', '계란');
  await page.press('#itemInput', 'Enter');

  await expect(page.locator('.item-name')).toHaveCount(1);
  await expect(page.locator('.item-name').first()).toHaveText('계란');
});

test('여러 아이템 추가', async ({ page }) => {
  for (const item of ['사과', '바나나', '오렌지']) {
    await page.fill('#itemInput', item);
    await page.press('#itemInput', 'Enter');
  }

  await expect(page.locator('.item-name')).toHaveCount(3);
});

test('빈 입력값은 추가되지 않음', async ({ page }) => {
  await page.fill('#itemInput', '   ');
  await page.click('#addBtn');

  await expect(page.locator('.item-name')).toHaveCount(0);
  await expect(page.locator('#empty')).toBeVisible();
});

test('아이템 추가 후 입력창 자동 초기화', async ({ page }) => {
  await page.fill('#itemInput', '빵');
  await page.click('#addBtn');

  await expect(page.locator('#itemInput')).toHaveValue('');
});

// ── 2. 아이템 체크 ──────────────────────────────────────────────
test('체크박스 클릭으로 완료 표시', async ({ page }) => {
  await page.fill('#itemInput', '우유');
  await page.press('#itemInput', 'Enter');

  await page.locator('li input[type="checkbox"]').first().check();

  await expect(page.locator('li').first()).toHaveClass(/checked/);
  await expect(page.locator('.item-name').first()).toHaveCSS('text-decoration', /line-through/);
});

test('체크 후 다시 클릭하면 완료 해제', async ({ page }) => {
  await page.fill('#itemInput', '우유');
  await page.press('#itemInput', 'Enter');

  const checkbox = page.locator('li input[type="checkbox"]').first();
  await checkbox.check();
  await checkbox.uncheck();

  await expect(page.locator('li').first()).not.toHaveClass(/checked/);
});

test('체크 시 통계 업데이트', async ({ page }) => {
  await page.fill('#itemInput', '우유');
  await page.press('#itemInput', 'Enter');
  await page.fill('#itemInput', '계란');
  await page.press('#itemInput', 'Enter');

  await page.locator('li input[type="checkbox"]').first().check();

  await expect(page.locator('#statsText')).toHaveText('총 2개 · 완료 1개');
});

// ── 3. 아이템 삭제 ──────────────────────────────────────────────
test('✕ 버튼으로 아이템 삭제', async ({ page }) => {
  await page.fill('#itemInput', '우유');
  await page.press('#itemInput', 'Enter');

  await page.locator('.delete-btn').first().click();

  await expect(page.locator('.item-name')).toHaveCount(0);
  await expect(page.locator('#empty')).toBeVisible();
});

test('여러 아이템 중 특정 아이템만 삭제', async ({ page }) => {
  for (const item of ['사과', '바나나', '오렌지']) {
    await page.fill('#itemInput', item);
    await page.press('#itemInput', 'Enter');
  }

  // 두 번째 아이템(바나나) 삭제
  await page.locator('.delete-btn').nth(1).click();

  await expect(page.locator('.item-name')).toHaveCount(2);
  await expect(page.locator('.item-name').nth(0)).toHaveText('사과');
  await expect(page.locator('.item-name').nth(1)).toHaveText('오렌지');
});

// ── 4. 완료 항목 일괄 삭제 ─────────────────────────────────────
test('완료 항목 일괄 삭제', async ({ page }) => {
  for (const item of ['사과', '바나나', '오렌지']) {
    await page.fill('#itemInput', item);
    await page.press('#itemInput', 'Enter');
  }

  // 사과, 오렌지 체크
  await page.locator('li input[type="checkbox"]').nth(0).check();
  await page.locator('li input[type="checkbox"]').nth(2).check();

  await page.click('#clearBtn');

  await expect(page.locator('.item-name')).toHaveCount(1);
  await expect(page.locator('.item-name').first()).toHaveText('바나나');
});

// ── 5. localStorage 영속성 ────────────────────────────────────
test('페이지 새로고침 후 데이터 유지', async ({ page }) => {
  await page.fill('#itemInput', '우유');
  await page.press('#itemInput', 'Enter');
  await page.fill('#itemInput', '계란');
  await page.press('#itemInput', 'Enter');

  await page.locator('li input[type="checkbox"]').first().check();

  await page.reload();

  await expect(page.locator('.item-name')).toHaveCount(2);
  await expect(page.locator('li').first()).toHaveClass(/checked/);
});

// ── 6. UI 상태 ────────────────────────────────────────────────
test('아이템 없을 때 빈 상태 메시지 표시', async ({ page }) => {
  await expect(page.locator('#empty')).toBeVisible();
  await expect(page.locator('#statsText')).toHaveText('총 0개');
});

test('아이템 추가 시 빈 상태 메시지 숨김', async ({ page }) => {
  await page.fill('#itemInput', '우유');
  await page.press('#itemInput', 'Enter');

  await expect(page.locator('#empty')).toBeHidden();
});

test('통계 카운트 정확성', async ({ page }) => {
  for (const item of ['사과', '바나나', '오렌지']) {
    await page.fill('#itemInput', item);
    await page.press('#itemInput', 'Enter');
  }

  await expect(page.locator('#statsText')).toHaveText('총 3개 · 완료 0개');
});
