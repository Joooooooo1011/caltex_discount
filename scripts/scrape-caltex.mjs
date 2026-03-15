import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const TARGET_URL =
  'https://www.caltex.com/hk/en/motorists/products-and-services/fuel-prices.html'

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractPrice(text, label) {
  const pattern = new RegExp(
    `${escapeRegex(label)}[\\s\\S]{0,160}?(?:HK\\$|HKD\\s*)?\\s*(\\d+(?:\\.\\d{1,2})?)`,
    'i',
  )

  const match = text.match(pattern)
  return match?.[1] ?? null
}

function extractLastUpdated(text) {
  const patterns = [
    /Last\s*updated\s*(?:on|at)?\s*[:\-]?\s*([^\n\r]+)/i,
    /Updated\s*(?:on|at)?\s*[:\-]?\s*([^\n\r]+)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      return match[1].trim()
    }
  }

  return null
}

async function scrapeFuelPrices() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await page.waitForLoadState('networkidle', { timeout: 120000 })

    const pageText = await page.locator('body').innerText()

    const goldPrice = extractPrice(pageText, 'Gold with Techron')
    const platinumPrice = extractPrice(pageText, 'Platinum with Techron')
    const lastUpdated = extractLastUpdated(pageText)

    if (!goldPrice || !platinumPrice || !lastUpdated) {
      throw new Error(
        'Could not extract one or more required fields from the Caltex page. Check selectors/patterns.',
      )
    }

    const data = {
      sourceUrl: TARGET_URL,
      scrapedAt: new Date().toISOString(),
      currency: 'HKD',
      goldWithTechron: goldPrice,
      platinumWithTechron: platinumPrice,
      lastUpdated,
    }

    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const outputPath = path.resolve(__dirname, '../public/fuel-prices.json')

    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')

    console.log('Fuel prices scraped successfully.')
    console.log(data)
  } finally {
    await page.close()
    await browser.close()
  }
}

scrapeFuelPrices().catch((error) => {
  console.error('Scrape failed:', error.message)
  process.exitCode = 1
})
