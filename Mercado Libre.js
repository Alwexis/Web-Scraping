const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://mercadolibre.cl/');
    await page.type('.nav-search-input', 'Pokémon');
    await page.click('.nav-search-btn');
    await page.waitForSelector('.ui-search-result__wrapper');
    const links = await page.evaluate(() => {
        const elementos = document.getElementsByClassName('ui-search-result__content-wrapper');
        const items = [];
        for (let elemento of elementos) {
            let title = elemento.getElementsByClassName('ui-search-item__title')[0].textContent;
            let link = elemento.getElementsByClassName('ui-search-link')[0].href;
            let precio = elemento.getElementsByClassName('price-tag-amount')[0].textContent;
            items.push({'Producto': title, 'Enlace': link, 'Precio': precio});
        }
        return items;
    });
    console.table(links);
    await browser.close();
})();
