const TARGET_URL =
  'https://www.caltex.com/hk/en/motorists/products-and-services/fuel-prices.html'

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractPrice(text, label) {
  const pattern = new RegExp(
    `${escapeRegex(label)}[\\s\\S]{0,120}?(?:HK\\$|HKD)\\s*(\\d{1,2}\\.\\d{1,2})`,
    'i',
  )
  return text.match(pattern)?.[1] ?? null
}

function extractLastUpdated(text) {
  const patterns = [
    /Last\s*updated\s*time\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}\s*(?:AM|PM))/i,
    /Last\s*updated\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}\s*(?:AM|PM))/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      return match[1].trim()
    }
  }

  return null
}

export default async function handler(_req, res) {
  try {
    const response = await fetch(TARGET_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      res.status(502).json({ error: 'Failed to fetch target fuel price page.' })
      return
    }

    const htmlText = await response.text()
    const pageText = htmlToText(htmlText)

    const goldPrice = extractPrice(pageText, 'Gold with Techron')
    const platinumPrice = extractPrice(pageText, 'Platinum with Techron')
    const lastUpdated = extractLastUpdated(pageText)

    if (!goldPrice || !platinumPrice || !lastUpdated) {
      res.status(500).json({
        error: 'Could not parse one or more fuel price fields from Caltex page.',
      })
      return
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600')
    res.status(200).json({
      sourceUrl: TARGET_URL,
        scrapedAt: new Date().toLocaleString('en-HK', { timeZone: 'Asia/Hong_Kong' }),
      currency: 'HKD',
      goldWithTechron: goldPrice,
      platinumWithTechron: platinumPrice,
      lastUpdated,
    })
  } catch (_error) {
    res.status(500).json({ error: 'Serverless scrape failed.' })
  }
}
