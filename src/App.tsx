import {
  useEffect,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import "./App.css";

type FuelPriceData = {
  sourceUrl: string;
  scrapedAt: string | null;
  currency: string;
  goldWithTechron: string | null;
  platinumWithTechron: string | null;
  lastUpdated: string | null;
};

type CalculatorTarget = {
  label: string;
  pricePerLitre: number;
};

function App() {
  const [data, setData] = useState<FuelPriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<"serverless" | "cached" | null>(null);
  const [calculatorTarget, setCalculatorTarget] =
    useState<CalculatorTarget | null>(null);
  const [litresInput, setLitresInput] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadFuelPrices = async () => {
      setIsLoading(true);
      setError(null);
      setNotice(null);

      try {
        const endpointResponse = await fetch(
          `/api/fuel-prices?t=${Date.now()}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );

        if (endpointResponse.ok) {
          const serverlessData =
            (await endpointResponse.json()) as FuelPriceData;
          setData(serverlessData);
          setMode("serverless");
          return;
        }

        const response = await fetch(`/fuel-prices.json?t=${Date.now()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Could not load fuel prices JSON file.");
        }

        const payload = (await response.json()) as FuelPriceData;
        setData(payload);
        setMode("cached");
        setNotice("Serverless endpoint unavailable, showing cached values.");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        setError("Failed to load serverless and cached fuel prices.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadFuelPrices();

    return () => controller.abort();
  }, []);

  const hasPrices =
    data?.goldWithTechron && data?.platinumWithTechron && data?.lastUpdated;

  const goldPrice = Number.parseFloat(data?.goldWithTechron ?? "");
  const platinumPrice = Number.parseFloat(data?.platinumWithTechron ?? "");
  const hasNumericPrices =
    Number.isFinite(goldPrice) && Number.isFinite(platinumPrice);

  const discount_gold_price = hasNumericPrices
    ? (300 - (300 / goldPrice) * 11.38) / (350 / goldPrice)
    : null;
  const discount_platinum_price = hasNumericPrices
    ? (300 - (300 / platinumPrice) * 12.08) / (350 / platinumPrice)
    : null;

  const cheapestDiscountCard =
    discount_gold_price === null || discount_platinum_price === null
      ? null
      : discount_gold_price === discount_platinum_price
        ? "both"
        : discount_gold_price < discount_platinum_price
          ? "gold"
          : "platinum";

  const litres = Number.parseFloat(litresInput);
  const hasValidLitres = Number.isFinite(litres) && litres > 0;
  const calculatedTotal =
    calculatorTarget && hasValidLitres
      ? calculatorTarget.pricePerLitre * litres
      : null;

  const openCalculator = (label: string, pricePerLitre: number) => {
    if (!Number.isFinite(pricePerLitre)) {
      return;
    }

    setCalculatorTarget({ label, pricePerLitre });
    setLitresInput("");
  };

  const closeCalculator = () => {
    setCalculatorTarget(null);
    setLitresInput("");
  };

  const handleLitresInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    const sanitized = nextValue
      .replace(",", ".")
      .replace(/[^0-9.]/g, "")
      .replace(/(\..*)\./g, "$1");

    setLitresInput(sanitized);
  };

  const onCardKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    label: string,
    pricePerLitre: number | null,
  ) => {
    if (pricePerLitre === null || !Number.isFinite(pricePerLitre)) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCalculator(label, pricePerLitre);
    }
  };

  return (
    <main className="app-shell">
      <section className="panel">
        <p className="kicker">Caltex Hong Kong</p>
        <h1>Fuel Price Tracker</h1>
        <p className="subtitle">
          HSBC staff Discount: -HKD 11.38 / 12.08 per litre <br />
          Sunday Discount: HKD 50 off for every HKD 350 spent on fuel
        </p>

        <div className="status-row">
          {isLoading && (
            <span className="status status-loading">Loading...</span>
          )}
          {!isLoading && error && (
            <span className="status status-error">{error}</span>
          )}
          {!isLoading && !error && notice && (
            <span className="status status-loading">{notice}</span>
          )}
          {!isLoading && !error && !notice && (
            <span className="status status-ok">
              Latest data loaded{" "}
              {mode === "serverless" ? "(serverless)" : "(cached)"}
            </span>
          )}
        </div>

        <div className="grid">
          <article
            className="price-card price-card-clickable"
            role="button"
            tabIndex={0}
            onClick={() => openCalculator("Gold", goldPrice)}
            onKeyDown={(event) => onCardKeyDown(event, "Gold", goldPrice)}
          >
            <h2>Gold</h2>
            <p className="price-value">
              {hasPrices ? `${data?.currency} ${data?.goldWithTechron}` : "--"}
            </p>
          </article>

          <article
            className="price-card price-card-clickable"
            role="button"
            tabIndex={0}
            onClick={() => openCalculator("Platinum", platinumPrice)}
            onKeyDown={(event) =>
              onCardKeyDown(event, "Platinum", platinumPrice)
            }
          >
            <h2>Platinum</h2>
            <p className="price-value">
              {hasPrices
                ? `${data?.currency} ${data?.platinumWithTechron}`
                : "--"}
            </p>
          </article>
        </div>

        <div className="grid">
          <article
            className={`price-card price-card-clickable ${cheapestDiscountCard === "gold" || cheapestDiscountCard === "both" ? "cheapest" : ""}`}
            role="button"
            tabIndex={discount_gold_price === null ? -1 : 0}
            aria-disabled={discount_gold_price === null}
            onClick={() => {
              if (discount_gold_price !== null) {
                openCalculator("Gold (Discounts)", discount_gold_price);
              }
            }}
            onKeyDown={(event) =>
              onCardKeyDown(event, "Gold (Discounts)", discount_gold_price)
            }
          >
            <h2>Gold (Discounts)</h2>
            <p className="price-value">
              {hasPrices && discount_gold_price !== null
                ? `${data?.currency} ${discount_gold_price.toFixed(2)}`
                : "--"}
            </p>
          </article>

          <article
            className={`price-card price-card-clickable ${cheapestDiscountCard === "platinum" || cheapestDiscountCard === "both" ? "cheapest" : ""}`}
            role="button"
            tabIndex={discount_platinum_price === null ? -1 : 0}
            aria-disabled={discount_platinum_price === null}
            onClick={() => {
              if (discount_platinum_price !== null) {
                openCalculator("Platinum (Discounts)", discount_platinum_price);
              }
            }}
            onKeyDown={(event) =>
              onCardKeyDown(
                event,
                "Platinum (Discounts)",
                discount_platinum_price,
              )
            }
          >
            <h2>Platinum (Discounts)</h2>
            <p className="price-value">
              {hasPrices && discount_platinum_price !== null
                ? `${data?.currency} ${discount_platinum_price.toFixed(2)}`
                : "--"}
            </p>
          </article>
          <a
            href="https://www.caltex.com/hk/en/motorists/products-and-services/fuel-prices.html"
            target="_blank"
            rel="noreferrer"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            <article className="meta-card">
              <h2>Last Update By Caltex</h2>
              <p className="meta-value">
                {hasPrices ? data?.lastUpdated : "--"}
              </p>
            </article>
          </a>
        </div>

        <div className="footer">
          <p>
            Source:{" "}
            <a href={data?.sourceUrl} target="_blank" rel="noreferrer">
              Caltex Fuel Prices
            </a>
          </p>
          <p>Scraped at: {data?.scrapedAt ?? "--"} by Joooooooo1011</p>
        </div>
      </section>

      {calculatorTarget && (
        <div className="calculator-overlay" onClick={closeCalculator}>
          <section
            className="calculator-popup"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="calculator-close-icon"
              onClick={closeCalculator}
              aria-label="Close calculator"
            >
              x
            </button>

            <h2>{calculatorTarget.label} Calculator</h2>
            <p className="calculator-note">
              Formula: ({data?.currency ?? "HKD"}/L * L)
            </p>
            <p className="calculator-rate">
              Rate: {data?.currency ?? "HKD"}{" "}
              {calculatorTarget.pricePerLitre.toFixed(2)} / L
            </p>

            <label htmlFor="litres-input">Litres</label>
            <input
              id="litres-input"
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.]?[0-9]*"
              enterKeyHint="done"
              autoComplete="off"
              min="0"
              step="0.01"
              value={litresInput}
              onChange={handleLitresInputChange}
              placeholder="e.g. 35"
            />

            <p className="calculator-total">
              Total:{" "}
              {calculatedTotal !== null
                ? `${data?.currency ?? "HKD"} ${calculatedTotal.toFixed(2)}`
                : "--"}
            </p>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
