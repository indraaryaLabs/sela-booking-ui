"""Capture desktop/mobile review images while the local Vite server is running."""

from pathlib import Path
from playwright.sync_api import sync_playwright


root = Path(__file__).resolve().parents[1]
screenshots = root / "screenshots"
screenshots.mkdir(exist_ok=True)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    for label, width, height in (("desktop", 1440, 900), ("mobile", 390, 844)):
        page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto("http://127.0.0.1:4173/")
        page.wait_for_load_state("networkidle")
        page.screenshot(path=str(screenshots / f"{label}-hero.png"))
        page.locator("#reservasi").scroll_into_view_if_needed()
        page.wait_for_timeout(200)
        page.screenshot(path=str(screenshots / f"{label}-booking.png"))
        if errors:
            raise RuntimeError(f"{label} page errors: {errors}")
        page.close()
    browser.close()
