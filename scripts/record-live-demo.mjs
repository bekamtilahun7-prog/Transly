/**
 * Records a ~3 minute walkthrough of Transly at http://localhost:5173
 * Run: node scripts/record-live-demo.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync, readdirSync, copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'Demo')
const rawDir = join(outDir, 'raw')
const samplePng = join(root, 'client', 'public', 'assets', 'transly-mark.png')
const BASE = process.env.DEMO_BASE ?? 'http://127.0.0.1:5173'
const TARGET_MS = 180_000

async function hold(page, ms) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    await page
      .evaluate(() => {
        const el = document.getElementById('demo-caption')
        if (el) el.style.opacity = el.style.opacity === '0.97' ? '1' : '0.97'
      })
      .catch(() => {})
    await page.waitForTimeout(Math.min(350, Math.max(0, end - Date.now())))
  }
}

async function caption(page, text) {
  await page.evaluate((t) => {
    let el = document.getElementById('demo-caption')
    if (!el) {
      el = document.createElement('div')
      el.id = 'demo-caption'
      el.setAttribute('data-no-speak', '')
      el.style.cssText =
        'position:fixed;left:16px;right:16px;top:12px;z-index:2147483647;background:#171923;color:#fff;padding:10px 16px;border-radius:14px;font:600 16px/1.35 Inter,system-ui,sans-serif;box-shadow:0 10px 30px rgba(23,25,35,.35);pointer-events:none'
      document.body.appendChild(el)
    }
    el.textContent = t
  }, text)
}

async function dismissChooser(page) {
  const btn = page.getByRole('button', { name: /Standard Mode/i })
  try {
    await btn.waitFor({ state: 'visible', timeout: 4000 })
    await btn.click()
    await hold(page, 600)
  } catch {
    /* already chosen */
  }
}

async function main() {
  mkdirSync(rawDir, { recursive: true })
  if (!existsSync(samplePng)) throw new Error(`Missing sample image: ${samplePng}`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: rawDir, size: { width: 1280, height: 720 } },
    locale: 'en-US',
  })
  const page = await context.newPage()
  const t0 = Date.now()
  const video = page.video()

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await dismissChooser(page)
    await page.getByRole('button', { name: 'En', exact: true }).click()
    await hold(page, 400)

    await caption(page, 'Transly — translate official documents between Afaan Oromo, Amharic, and English')
    await hold(page, 7000)

    await caption(page, 'The UI language switches live: English, Amharic, Afaan Oromo')
    await page.getByRole('button', { name: 'Am', exact: true }).click()
    await hold(page, 3500)
    await page.getByRole('button', { name: 'Or', exact: true }).click()
    await hold(page, 3500)
    await page.getByRole('button', { name: 'En', exact: true }).click()
    await hold(page, 1500)

    await caption(page, 'Landing: extract, translate, optional review, issue a QR-verified PDF')
    await page.evaluate(() => window.scrollTo({ top: 520, behavior: 'smooth' }))
    await hold(page, 4000)
    await page.evaluate(() => window.scrollTo({ top: 1100, behavior: 'smooth' }))
    await hold(page, 3500)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    await hold(page, 1500)

    await caption(page, 'Sign in — demo auth (no live Supabase anon key in this build)')
    await page.getByRole('link', { name: 'Log In' }).click()
    await page.getByPlaceholder('Abebe Kebede').fill('Makeda Demo')
    await page.getByPlaceholder('you@example.com').fill('judge@transly.demo')
    await page.getByPlaceholder('Enter your password').fill('demo1234')
    await hold(page, 1200)
    await page.getByRole('button', { name: 'Log In' }).click()
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15_000 })
    await hold(page, 800)

    if (page.url().includes('/onboarding')) {
      await caption(page, 'Choose a plan — Free is usable. Paid plans stay pending until a real payment backend exists')
      await hold(page, 2500)
      await page.getByRole('article').filter({ hasText: 'Free forever' }).getByRole('button', { name: 'Get Started' }).click()
      await page.waitForURL('**/dashboard', { timeout: 15_000 })
    }

    await caption(page, 'Dashboard — documents, languages, and progress')
    await hold(page, 6000)

    await caption(page, 'Upload a PDF or image (max 10 MB: PDF, JPG, PNG)')
    await page.getByRole('link', { name: 'Upload Document' }).click()
    await page.waitForURL('**/documents/upload')
    await hold(page, 1500)
    await page.locator('input[type="file"][accept*="pdf"]').setInputFiles(samplePng)
    await hold(page, 2500)
    await page.getByRole('button', { name: 'Continue to extraction review' }).click()
    await page.waitForURL(/\/documents\/.+\/review/)

    await caption(page, 'Extract — Gemini (or mock) returns editable text blocks')
    await page.getByText('Extracted Text', { exact: true }).waitFor({ timeout: 20_000 })
    await hold(page, 8000)

    await caption(page, 'Translate Amharic → English. Block IDs and order stay the same')
    await page.getByRole('button', { name: 'Continue to Translation' }).click()
    await page.waitForURL(/\/documents\/.+\/translation/)
    await page.getByLabel('Issuer name').waitFor({ timeout: 20_000 })
    await hold(page, 8000)

    await caption(page, 'Issue — reserve an ID, build an Ethiopic PDF with a QR code, hash the bytes')
    await page.getByLabel('Issuer name').fill('Transly Demo Office')
    await page.getByRole('checkbox', { name: /Make the PDF public/i }).check()
    await hold(page, 1500)
    await page.locator('form').getByRole('button', { name: 'Issue PDF with QR code' }).click()
    await page.getByRole('dialog').waitFor({ timeout: 8000 })
    await hold(page, 1200)
    await page.getByRole('dialog').getByRole('button', { name: 'Issue PDF with QR code' }).click()
    await page.waitForURL(/\/documents\/issued\//, { timeout: 60_000 })
    await hold(page, 7000)

    await caption(page, 'Public verification — anyone with the QR can see valid, revoked, or not found')
    await page.getByRole('link', { name: 'Open the public verification page' }).click()
    await page.waitForURL(/\/v\//, { timeout: 15_000 })
    await hold(page, 8000)

    await caption(page, 'Accessibility — page and document reading in OM, AM, and EN')
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
    await hold(page, 800)
    await page.getByRole('button', { name: 'Open accessibility controls' }).first().click()
    await hold(page, 5000)

    await caption(page, 'Transly demo complete — mock path; live Gemini extract stays off until GEMINI_MOCK=false')
    await page.goto(BASE, { waitUntil: 'domcontentloaded' })
    await dismissChooser(page)
    const left = TARGET_MS - (Date.now() - t0)
    if (left > 500) await hold(page, left)
  } catch (err) {
    const shot = join(outDir, 'demo-failure.png')
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {})
    console.error('Demo failed. Screenshot:', shot)
    throw err
  } finally {
    await context.close()
    await browser.close()
  }

  const elapsed = Date.now() - t0
  console.log(`Recording wall time: ${(elapsed / 1000).toFixed(1)}s`)

  const destWebm = join(outDir, 'Transly-live-demo-3min.webm')
  const src = video ? await video.path() : null
  if (!src || !existsSync(src)) {
    const webms = readdirSync(rawDir).filter((f) => f.endsWith('.webm'))
    if (!webms.length) throw new Error('Playwright did not write a webm')
    copyFileSync(join(rawDir, webms.sort().at(-1)), destWebm)
  } else {
    copyFileSync(src, destWebm)
  }
  console.log('Wrote', destWebm)

  try {
    const ffmpegStatic = await import('ffmpeg-static')
    const bin = ffmpegStatic.default
    if (bin) {
      const destMp4 = join(outDir, 'Transly-live-demo-3min.mp4')
      const r = spawnSync(
        bin,
        ['-y', '-i', destWebm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-movflags', '+faststart', destMp4],
        { stdio: 'inherit' },
      )
      if (r.status === 0) console.log('Wrote', destMp4)
    }
  } catch {
    console.log('ffmpeg-static not available; keep the webm')
  }

  if (video) {
    const vpath = await video.path().catch(() => null)
    if (vpath) console.log('Playwright video:', vpath)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
