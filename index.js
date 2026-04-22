const puppeteer = require('puppeteer');
const express = require('express');
const app = express();

// --- CONFIGURACIÓN DE ALTO RENDIMIENTO ---
let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos (ahorra procesador y evita bloqueos)

const fetchRates = async () => {
    const now = Date.now();
    if (cachedData && (now - lastFetchTime < CACHE_DURATION)) {
        console.log("Serviendo desde el caché para ahorrar energía...");
        return cachedData;
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: '/usr/bin/google-chrome-stable', // Ruta exacta en Docker
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Vital para que no explote en servidores pequeños
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        
        // Bloqueamos imágenes y CSS para que cargue a la velocidad de la luz
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");

        await page.goto('https://www.monitordivisasvenezuela.com/', { 
            waitUntil: 'domcontentloaded', // Más rápido que networkidle2
            timeout: 45000 
        });

        // Esperamos a que el selector de los precios aparezca
        await page.waitForSelector('.text-2xl.font-bold', { timeout: 10000 });

        const rates = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('.text-2xl.font-bold'));
            return {
                bcv: elements[0] ? elements[0].innerText.split(' ')[0] : "N/A",
                euro: elements[1] ? elements[1].innerText.split(' ')[0] : "N/A",
                usdt: elements[2] ? elements[2].innerText.split(' ')[0] : "N/A",
                timestamp: new Date().toISOString()
            };
        });

        cachedData = rates;
        lastFetchTime = now;
        return rates;

    } catch (error) {
        console.error("Error en el Scraping:", error.message);
        if (cachedData) return cachedData; // Si falla, servimos lo último que tengamos
        throw error;
    } finally {
        if (browser) await browser.close();
    }
};

// --- RUTA PRINCIPAL ---
app.get('/', async (req, res) => {
    try {
        const data = await fetchRates();
        res.set('Access-Control-Allow-Origin', '*'); // Para que tu App de Android no tenga líos de CORS
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: "VEpay Engine Error", detalle: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    ====================================
    🚀 VEpay ENGINE TRABAJANDO
    Puerto: ${PORT}
    Estado: 10,000% Robusto
    ====================================
    `);
});
