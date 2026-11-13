const { randomUUID } = require('node:crypto');
const { test, expect } = require('@playwright/test');

const storage = 'http://127.0.0.1:8112';
const password = 'disposable-test-password';

async function connect(page, username) {
  let token;
  function captureToken(frame) {
    if (frame !== page.mainFrame()) return;
    const hash = new URL(frame.url()).hash.slice(1);
    token = new URLSearchParams(hash).get('access_token') || token;
  }

  page.on('framenavigated', captureToken);
  try {
    await page.goto('/');
    await page.locator('.rs-box-initial').click();
    await page.locator('button.rs-choose-rs').click();
    await page.locator('input[name="rs-user-address"]').fill(username + '@localhost:8112');
    await page.locator('button.rs-connect').click();
    await page.getByLabel(`Enter the ${username} account's password`).fill(password);
    await page.getByRole('button', { name: 'Allow', exact: true }).click();
    await expect(page.locator('.rs-widget')).toHaveClass(/rs-state-connected/);
    expect(token, 'OAuth redirect carries the app’s storage token').toBeTruthy();
    return token;
  } finally {
    page.off('framenavigated', captureToken);
  }
}

test('a private two-tag bookmark persists in remoteStorage and loads on a fresh device', async ({
  browser, page, request,
}) => {
  const username = 'webmarks' + randomUUID().replaceAll('-', '');
  const bookmark = {
    url: 'https://example.org/personal-data',
    title: 'Personal data',
    description: 'A bookmark saved in Webmarks',
    tags: ['interop', 'reading'],
  };
  const signup = await request.post(storage + '/signup', {
    form: { username, password, email: 'webmarks@example.invalid' },
  });
  expect(signup.ok()).toBeTruthy();
  const token = await connect(page, username);

  await page.locator('#nav-new a').click();
  await page.locator('#title').fill(bookmark.title);
  await page.locator('#url').fill(bookmark.url);
  await page.locator('#description').fill(bookmark.description);
  await page.locator('#tags').fill(bookmark.tags.join(', '));
  await page.locator('#bookmark-new button[type="submit"]').click();
  await expect(page.locator('#bookmark-saved')).toBeVisible();

  const archive = `${storage}/storage/${username}/bookmarks/archive/`;
  const headers = { Authorization: `Bearer ${token}` };
  let resource;
  await expect(async () => {
    const listing = await request.get(archive, { headers });
    expect(listing.ok()).toBeTruthy();
    const ids = Object.keys((await listing.json()).items);
    expect(ids).toHaveLength(1);

    resource = archive + encodeURIComponent(ids[0]);
    const response = await request.get(resource, { headers });
    expect(response.ok()).toBeTruthy();
    const stored = await response.json();
    expect(stored).toMatchObject({
      ...bookmark,
      id: ids[0],
      '@context': 'http://remotestorage.io/spec/modules/bookmarks/archive-bookmark',
    });
  }).toPass({ timeout: 20_000 });
  const anonymous = await request.get(resource);
  expect([401, 403, 404]).toContain(anonymous.status());

  const fresh = await browser.newContext({ baseURL: 'http://127.0.0.1:8107' });
  try {
    const freshPage = await fresh.newPage();
    await connect(freshPage, username);
    const saved = freshPage.locator('.bookmark').filter({ hasText: bookmark.title });
    await expect(saved.getByRole('link', { name: bookmark.title })).toHaveAttribute('href', bookmark.url);
    await expect(saved.locator('.tag')).toHaveText(bookmark.tags);
    await expect(saved.locator('.description')).toHaveText(bookmark.description);
  } finally {
    await fresh.close();
  }
});
