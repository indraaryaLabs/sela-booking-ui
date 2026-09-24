import { expect, test } from '@playwright/test';

test('room selection updates booking summary and price', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Ruang yang pas/ })).toBeVisible();
  await page.getByRole('button', { name: /RUANG 02.*Forum/ }).click();
  await expect(page.getByRole('button', { name: /RUANG 02.*Forum/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('complementary', { name: 'Ringkasan pilihan' })).toContainText(/Rp\s*175\.000/);
  await expect(page.getByLabel('Tanggal kunjungan')).toBeVisible();
});

test('availability failure shows retry and recovers', async ({ page }) => {
  await page.route('**/availability.json', route => route.abort());
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
  await page.unroute('**/availability.json');
  await page.getByRole('button', { name: 'Coba lagi' }).click();
  await expect(page.getByRole('group', { name: 'Jam mulai tersedia' })).toBeVisible();
});

test('fully booked date explains the empty state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /RUANG 02.*Forum/ }).click();
  const sunday = await page.evaluate(() => {
    const date = new Date();
    const days = ((7 - date.getDay()) % 7) || 7;
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  await page.getByLabel('Tanggal kunjungan').fill(sunday);
  await expect(page.getByText('Belum ada slot demo untuk ruang dan tanggal ini. Coba tanggal lain.')).toBeVisible();
});

test('form guides missing slot and invalid fields', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('group', { name: 'Jam mulai tersedia' })).toBeVisible();
  await page.getByRole('button', { name: /Simpan rencana demo/ }).click();
  await expect(page.getByRole('alert')).toContainText('Pilih slot waktu');
  await page.locator('.slot:not([disabled])').first().click();
  await page.getByRole('button', { name: /Simpan rencana demo/ }).click();
  await expect(page.getByText('Masukkan nama lengkap minimal 2 karakter.')).toBeVisible();
  await expect(page.getByLabel('Nama lengkap')).toHaveAttribute('aria-invalid', 'true');
});

test('complete booking is saved locally and blocks the chosen slot', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('group', { name: 'Jam mulai tersedia' })).toBeVisible();
  const slot = page.locator('.slot:not([disabled])').first();
  const selectedTime = await slot.locator('strong').textContent();
  await slot.click();
  await page.getByLabel('Nama lengkap').fill('Nadia Putri');
  await page.getByLabel('Email').fill('nadia@example.com');
  await page.getByLabel('Jumlah peserta').fill('3');
  await page.getByLabel('Keperluan').fill('Diskusi tim');
  await page.getByRole('button', { name: /Simpan rencana demo/ }).click();
  await expect(page.getByRole('heading', { name: /Rencana Anda punya tempat/ })).toBeVisible();
  await expect(page.getByText('Nadia Putri')).toBeVisible();
  await expect(page.getByText('Ini konfirmasi demo, bukan pemesanan tempat atau pengiriman email.')).toBeVisible();

  await page.getByRole('button', { name: /Buat rencana lain/ }).click();
  const occupied = page.locator('.slot').filter({ has: page.locator('strong', { hasText: selectedTime ?? '' }) });
  await expect(occupied).toBeDisabled();
  await page.reload();
  await expect(page.locator('.slot').filter({ has: page.locator('strong', { hasText: selectedTime ?? '' }) })).toBeDisabled();
});

test('mobile layout has no horizontal overflow and remains usable', async ({ page }) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Ruang yang pas/ })).toBeVisible();
    await page.getByRole('button', { name: /RUANG 03.*Fokus/ }).click();
    await expect(page.getByRole('complementary', { name: 'Ringkasan pilihan' })).toContainText('Fokus');
    const bounds = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(bounds.scroll, `width ${width}`).toBeLessThanOrEqual(bounds.viewport);
  }
});
