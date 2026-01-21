const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

// Constants
const FINNHUB_API_KEY = 'd1o327hr01qtrauurg10d1o327hr01qtrauurg1g';
const CACHE_DURATION = 60 * 1000; // 60 seconds
const STOCK_SYMBOLS = ['AAPL','MSFT','TSLA','AMZN','GOOGL','NVDA','META','ORCL','NFLX'];
const GSE_SYMBOLS = ['GCB.GH', 'EGH.GH', 'CAL.GH','UNIL.GH','MTNGH','TLW.GH', 'SCB.GH', 'FML.GH', 'SOGEGH','TOTAL.GH','GOIL.GH', 'GGBL.GH','RBGH','ASG.GH'];

// In-memory cache
const cache = {
    stocks: { data: null, timestamp: 0 },
    forex: { data: null, timestamp: 0 },
    crypto: { data: null, timestamp: 0 },
    gse: { data: null, timestamp: 0 }
};

// 🔐 Helper: safely parse JSON
async function safeJson(res) {
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return await res.json();
    } else {
        const text = await res.text();
        console.error("⚠️ Non-JSON response from API:", text);
        return null;
    }
}

router.get('/api/market-data', async (req, res) => {
    try {
        const now = Date.now();

        // STOCKS
        if (!cache.stocks.data || now - cache.stocks.timestamp > CACHE_DURATION) {
            const stockData = await Promise.all(STOCK_SYMBOLS.map(async (symbol) => {
                try {
                    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
                    const data = await safeJson(response);
                    return { symbol, price: data?.c || null };
                } catch (err) {
                    console.error(`❌ Error fetching stock ${symbol}:`, err);
                    return { symbol, price: null };
                }
            }));
            cache.stocks = { data: stockData, timestamp: now };
        }

        // FOREX
        if (!cache.forex.data || now - cache.forex.timestamp > CACHE_DURATION) {
            const forexRes = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,AUD,CAD,CNY,CHF,HKD,ZAR,INR');
            const forexData = await safeJson(forexRes);
            cache.forex = { data: forexData, timestamp: now };
        }

        // CRYPTO
        if (!cache.crypto.data || now - cache.crypto.timestamp > CACHE_DURATION) {
            try {
                // Binance API for all prices (then filter)
                const cryptoRes = await fetch('https://api.binance.com/api/v3/ticker/price');
                const allPrices = await safeJson(cryptoRes);

                const cryptoData = {};

                // Filter and map the coins you need
                allPrices.forEach(item => {
                    switch(item.symbol) {
                        case 'BTCUSDT': cryptoData.bitcoin = { usd: parseFloat(item.price) }; break;
                        case 'ETHUSDT': cryptoData.ethereum = { usd: parseFloat(item.price) }; break;
                        case 'LTCUSDT': cryptoData.litecoin = { usd: parseFloat(item.price) }; break;
                        case 'XRPUSDT': cryptoData.ripple = { usd: parseFloat(item.price) }; break;
                        case 'SOLUSDT': cryptoData.solana = { usd: parseFloat(item.price) }; break;
                        case 'BNBUSDT': cryptoData.binancecoin = { usd: parseFloat(item.price) }; break;
                        case 'ADAUSDT': cryptoData.cardano = { usd: parseFloat(item.price) }; break;
                        case 'DOGEUSDT': cryptoData.dogecoin = { usd: parseFloat(item.price) }; break;
                        case 'SHIBUSDT': cryptoData['shiba-inu'] = { usd: parseFloat(item.price) }; break;
                    }
                });

                cache.crypto = { data: cryptoData, timestamp: now };

            } catch (error) {
                console.error('Binance batch failed, using CoinGecko:', error.message);

                // Original CoinGecko as fallback
                const cryptoRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,litecoin,ripple,solana,binancecoin,cardano,dogecoin,shiba-inu&vs_currencies=usd');
                const cryptoData = await safeJson(cryptoRes);
                cache.crypto = { data: cryptoData, timestamp: now };
            }
        }

        // GSE
        if (!cache.gse.data || now - cache.gse.timestamp > CACHE_DURATION) {
            const gseData = await Promise.all(GSE_SYMBOLS.map(async (symbol) => {
                try {
                    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
                    const data = await safeJson(response);
                    return { symbol, price: data?.c || null };
                } catch (err) {
                    console.error(`❌ Error fetching GSE ${symbol}:`, err);
                    return { symbol, price: null };
                }
            }));
            cache.gse = { data: gseData, timestamp: now };
        }

        res.json({
            stocks: cache.stocks.data,
            gse: cache.gse.data,
            forex: cache.forex.data,
            crypto: cache.crypto.data,
            lastUpdated: new Date(cache.stocks.timestamp).toISOString()
        });

    } catch (error) {
        console.error('Market data error:', error);
        res.status(500).json({ error: 'Failed to fetch market data' });
    }
});

module.exports = router;
