import { test, expect, Page } from '@playwright/test';
async function login(page: Page, name: string) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(`${name}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in →' }).click();
  await expect(
    page.getByRole('heading', {
      name: name.startsWith('customer') ? 'My tickets' : 'Ticket inbox',
    }),
  ).toBeVisible();
}
test('customer and agent resolve a real ticket with private notes and reviewed draft', async ({
  browser,
  page,
}, info) => {
  const customerContext = await browser.newContext(info.project.use);
  const customer = await customerContext.newPage();
  await login(customer, 'customer1');
  await customer.getByRole('link', { name: '＋ New ticket', exact: true }).last().click();
  const subject = `Browser invoice ${info.project.name} ${Date.now()}`;
  await customer.getByLabel('Subject', { exact: true }).fill(subject);
  await customer
    .getByLabel('Description', { exact: true })
    .fill('Fictional invoice question for browser verification.');
  await customer.getByRole('button', { name: 'Create ticket', exact: true }).click();
  await expect(customer.getByRole('heading', { name: subject })).toBeVisible();
  const url = customer.url();
  await login(page, 'agent1');
  await page.goto(url);
  await expect(page.getByRole('heading', { name: subject })).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Assigned to', exact: true })
    .selectOption({ label: 'agent1' });
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('button', { name: 'Internal note', exact: true }).click();
  await page.getByLabel('Private note for staff').fill('PRIVATE-BROWSER-NOTE');
  await page.getByRole('button', { name: 'Add internal note', exact: true }).click();
  await expect(page.getByText('PRIVATE-BROWSER-NOTE', { exact: true })).toBeVisible();
  await customer.reload();
  await expect(customer.getByText('PRIVATE-BROWSER-NOTE')).toHaveCount(0);
  await page.getByRole('button', { name: 'Suggest a local reply' }).click();
  await expect(page.getByText('local draft', { exact: true })).toBeVisible();
  await expect(
    customer.getByText('Thank you for contacting support.', { exact: false }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit reply', exact: true }).click();
  await page
    .getByLabel('Your reply', { exact: true })
    .fill('Human reviewed browser reply. Please share the invoice reference.');
  await page.getByRole('button', { name: 'Send reply', exact: true }).click();
  await expect(
    customer.getByText('Human reviewed browser reply. Please share the invoice reference.', {
      exact: true,
    }),
  ).toBeVisible();
  await customer
    .getByLabel('Your reply', { exact: true })
    .fill('Here is more fictional information.');
  await customer.getByRole('button', { name: 'Send reply', exact: true }).click();
  await expect(
    page.getByText('Here is more fictional information.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('resolved');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(customer.locator('.status')).toHaveText('resolved');
  await page.screenshot({
    path: `docs/screenshots/agent-${info.project.name}.png`,
    fullPage: true,
  });
  await customer.screenshot({
    path: `docs/screenshots/customer-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('link', { name: '▥ Analytics' }).click();
  await expect(page.getByRole('heading', { name: 'Support analytics' })).toBeVisible();
  await expect(page.getByText('Total tickets', { exact: true })).toBeVisible();
  await customerContext.close();
});
test('administrator provisions and deactivates staff', async ({ page }, info) => {
  await login(page, 'admin');
  await page.getByRole('link', { name: '♙ Users' }).click();
  const name = `Browser staff ${info.project.name}`;
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByLabel('Email', { exact: true }).fill(`browser-${info.project.name}@example.test`);
  await page.getByLabel('Initial password').fill('fictional-browser-only-password');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText('Account created.', { exact: true })).toBeVisible();
  const row = page.locator('.user-row').filter({ hasText: name });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Deactivate', exact: true }).click();
  await expect(row.getByText('Inactive', { exact: true })).toBeVisible();
});
