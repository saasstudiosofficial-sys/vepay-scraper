const puppeteer = require('puppeteer');
const express = require('express');
const app = express();

app.get('/', async (req, res) => {
    let browser;
    try {
        // Quitamos la ruta fija para que Puppeteer use la que el servidor instale por defecto
        browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");

        // Vamos a la página de las tasas
        await page.goto('https://www.monitordivisasvenezuela.com/', { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        const rates = await page.evaluate(() => {
            const prices = Array.from(document.querySelectorAll('.text-2xl.font-bold'));
            return {
                bcv: prices[0] ? prices[0].innerText.split(' ')[0] : "0.00",
                euro: prices[1] ? prices[1].innerText.split(' ')[0] : "0.00",
                usdt: prices[2] ? prices[2].innerText.split(' ')[0] : "0.00"
            };
        });

        await browser.close();
        res.json(rates);
    } catch (e) {
        if (browser) await browser.close();
        res.status(500).json({ error: "Error en el servidor", detalle: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`VEpay bot activo` ));
