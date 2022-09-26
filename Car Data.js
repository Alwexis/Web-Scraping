/* Obtener datos de un Auto (Rut y nombre de propetario, Patente, Tipo, Marca, Año, Color, etc) */

const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://www.patentechile.com');
    await page.waitForSelector('#txtTerm');
    await page.type('#txtTerm', 'AB2412');
    await page.click('#btnConsultar');
    await page.waitForSelector('#tblDataVehicle');
    try {
        const datos = await page.evaluate(() => {
            const elementos = document.querySelectorAll('tr');
            const data = [];
            for (let elemento of elementos) {
                let firstElement = elemento.firstChild.childNodes[0].textContent;
                try {
                    let secondElement = elemento.lastChild.childNodes[0].textContent;
                    if (!firstElement.includes('\n') && !firstElement.includes('Información')) {
                        data.push({ 'Nombre Dato': firstElement, 'Valor': secondElement });
                    }
                } catch (error) {
                }
            }
            return data;
        });
        console.table(datos);
    } catch (error) {
        console.log('Se ha producido un error encontrando los Datos. Intente nuevamente.');
    }
    await browser.close();
})();
