import { useEffect, useState } from 'react'
import './App.css'

type FuelPriceData = {
  sourceUrl: string
  scrapedAt: string | null
  currency: string
  goldWithTechron: string | null
  platinumWithTechron: string | null
  lastUpdated: string | null
}

function App() {
  const [data, setData] = useState<FuelPriceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [mode, setMode] = useState<'serverless' | 'cached' | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const loadFuelPrices = async () => {
      setIsLoading(true)
      setError(null)
      setNotice(null)

      try {
        const endpointResponse = await fetch(`/api/fuel-prices?t=${Date.now()}`, {
          signal: controller.signal,
          cache: 'no-store',
        })

        if (endpointResponse.ok) {
          const serverlessData = (await endpointResponse.json()) as FuelPriceData
          setData(serverlessData)
          setMode('serverless')
          return
        }

        const response = await fetch(`/fuel-prices.json?t=${Date.now()}`, {
          signal: controller.signal,
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Could not load fuel prices JSON file.')
        }

        const payload = (await response.json()) as FuelPriceData
        setData(payload)
        setMode('cached')
        setNotice('Serverless endpoint unavailable, showing cached values.')
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }

        setError('Failed to load serverless and cached fuel prices.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadFuelPrices()

    return () => controller.abort()
  }, [])

  const hasPrices =
    data?.goldWithTechron && data?.platinumWithTechron && data?.lastUpdated
  
  const discount_gold_price = (300-(300/parseFloat(data?.goldWithTechron || '0'))*11.38)/(350/parseFloat(data?.goldWithTechron || '0'))
  const discount_platinum_price = (300-(300/parseFloat(data?.platinumWithTechron || '0'))*12.08)/(350/parseFloat(data?.platinumWithTechron || '0'))
  return (
    <main className="app-shell">
      <section className="panel">
        <p className="kicker">Caltex Hong Kong</p>
        <h1>Fuel Price Tracker</h1>
        <p className="subtitle">
          HSBC staff Discount: -HKD 11.38 / 12.08 per litre <br/>
          Sunday Discount: HKD 50 off for every HKD 350 spent on fuel 

        </p>

        <div className="status-row">
          {isLoading && <span className="status status-loading">Loading...</span>}
          {!isLoading && error && <span className="status status-error">{error}</span>}
          {!isLoading && !error && notice && (
            <span className="status status-loading">{notice}</span>
          )}
          {!isLoading && !error && !notice && (
            <span className="status status-ok">
              Latest data loaded {mode === 'serverless' ? '(serverless)' : '(cached)'}
            </span>
          )}
        </div>

        <div className="grid">
          <article className="price-card">
            <h2>Gold</h2>
            <p className="price-value">
              {hasPrices ? `${data?.currency} ${data?.goldWithTechron}` : '--'}
            </p>
          </article>

          <article className="price-card">
            <h2>Platinum</h2>
            <p className="price-value">
              {hasPrices ? `${data?.currency} ${data?.platinumWithTechron}` : '--'}
            </p>
          </article>

          <article className="meta-card">
            <h2>Last Updated Time</h2>
            <p className="meta-value">{hasPrices ? data?.lastUpdated : '--'}</p>
          </article>

          <article className="price-card">
            <h2>Gold (Discounts)</h2>
            <p className="price-value">
              {hasPrices ? `${data?.currency} ${discount_gold_price.toFixed(2)}` : '--'}
            </p>
          </article>

          <article className="price-card">
            <h2>Platinum (Discounts)</h2>
            <p className="price-value">
              {hasPrices ? `${data?.currency} ${discount_platinum_price.toFixed(2)}` : '--'}
            </p>
          </article>
        </div>

        <div className="footer">
          <p>
            Source:{' '}
            <a href={data?.sourceUrl} target="_blank" rel="noreferrer">
              Caltex Fuel Prices
            </a>
          </p>
          <p>Scraped at: {data?.scrapedAt ?? '--'}</p>
        </div>
      </section>
    </main>
  )
}

export default App
