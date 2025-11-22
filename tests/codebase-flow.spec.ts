import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const API_BASE = process.env.API_URL || 'http://localhost:7000';
const FRONTEND_BASE = process.env.FRONTEND_URL || 'http://localhost:7001';

test.describe('Codebase copy flow', () => {
  let tmpDir: string;
  let projectId: string | undefined;
  const projectName = `Copyable Project ${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cpcodebase-e2e-'));
    await fs.writeFile(path.join(tmpDir, 'hello.txt'), 'hello world\n');

    const res = await request.post(`${API_BASE}/api/projects`, {
      data: {
        name: projectName,
        path: tmpDir,
      },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    projectId = data.id;
  });

  test.afterAll(async ({ request }) => {
    if (projectId) await request.delete(`${API_BASE}/api/projects/${projectId}`);
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test('copies codebase content via API and UI responds', async ({ page, request }) => {
    await page.goto(FRONTEND_BASE + '/projects');
    await expect(page.locator(`text=${projectName}`)).toBeVisible();

    const copyRes = await request.post(`${API_BASE}/api/codebase/copy`, {
      data: { projectId },
    });
    expect(copyRes.ok()).toBeTruthy();
    const payload = await copyRes.json();
    expect(payload.content).toContain('hello world');

    const row = page.locator(`text=${projectName}`).first();
    await row.click();
    await page.waitForTimeout(200);
  });
});
