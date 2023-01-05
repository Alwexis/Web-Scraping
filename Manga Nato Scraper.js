const puppeteer = require('puppeteer');
const fs = require('fs');

const MAIN_DIRECTORY = 'src/DataScrapper/data/';
const _GENRES_ID = [2, 4, 6, 7, 9, 10, 48, 12, 14, 15, 16, 45, 17,
    19, 21, 22, 24, 25, 26, 27, 28, 29,
    30, 31, 32, 33, 34, 35, 37, 38, 39, 40];

let _GLOBAL_DATA = [];

/**
 * @description Scrape all Manga's data from a given URL.
 * @param { string } url The URL from the manga that we want to scrape. 
 * @returns { Promise<Object> } A promise that will resolve with the manga's data as an Object.
 */
async function scrapeManga(url) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    await page.goto(url);
    await page.waitForSelector('.panel-story-info')
    try {
        const links = await page.evaluate(() => {
            //let mangaTitle = document.getElementsByClassName('manga-info-text')[0].children[0].children[0].textContent;
            let generalInfo = document.querySelector('.story-info-right')
            let mangaTitle = generalInfo.querySelector('h1').textContent.replace('\n', '').trim();
            //const mangaImage = document.querySelector('.story-info-left').querySelector('img').getAttribute('src');
            const mangaImage = document.querySelector('.panel-story-info').querySelector('img').getAttribute('src');
            //* Description
            // We are going to remove the first 2 lines of the description. Cuz they're useless.
            document.querySelector('#panel-story-info-description').children[0].remove();
            const mangaDesc = document.querySelector('#panel-story-info-description').textContent.replace('\n', '').trim();
            //* General Info
            const _generalInfo_Collection = generalInfo.querySelectorAll('table tr');
            const alternativeName = _generalInfo_Collection[0].children[1].textContent.split(';').map(item => item.trim());
            const author = _generalInfo_Collection[1].children[1].textContent.replace('\n', '').trim();
            const status = _generalInfo_Collection[2].children[1].textContent;
            const genres = Array.from(_generalInfo_Collection[3].children[1].children).map(item => item.textContent);
            // Getting average rating
            const ratingRow = document.querySelector('#rate_row_cmd');
            const ratingElements = Array.from(ratingRow.querySelectorAll('em')).filter(item => ['v:average', 'v:best', 'v:votes'].includes(item.getAttribute('property')))
            let rating_votes = 0;
            let rating_best = 0;
            let rating_average = 0;
            for (let rating of ratingElements) {
                if (rating.getAttribute('property') === 'v:votes') {
                    rating_votes = rating.textContent;
                    continue;
                } else if (rating.getAttribute('property') === 'v:best') {
                    rating_best = rating.textContent;
                    continue;
                } else if (rating.getAttribute('property') === 'v:average') {
                    rating_average = rating.textContent;
                    continue;
                }
            }
            //const chapters = document.getElementsByClassName('chapter-list')[0].children;
            const chapterContainer = document.querySelector('.panel-story-chapter-list');
            const chapters = chapterContainer.querySelectorAll('li');
            let chapterList = [];
            for (let chapter of chapters) {
                //let title = chapter.children[0].textContent;
                const title = chapter.children[0].textContent
                const link = chapter.children[0].getAttribute('href');
                const date = chapter.children[2].getAttribute('title');
                chapterList.push({ 'title': title, 'url': link, 'date': date });
            }
            return { 'title': mangaTitle, 'image': mangaImage, 'description': mangaDesc, 'alternativeName': alternativeName, 'author': author, 'status': status, 'genres': genres, 'rating': { 'votes': rating_votes, 'average': rating_average, 'best': rating_best }, 'chapters': chapterList }
        });
        browser.close();
        return links;
    } catch (error) {
        console.error('Cannot scrape manga: ' + url);
        console.error('Error', error);
    }
}

function writeJsonFile(data, fileName, asList = true) {
    if (!fs.existsSync(fileName) || fs.readFileSync(fileName).length === 0) {
        try {
            let dataParsed = undefined;
            if (asList) {
                const listData = [data]
                dataParsed = JSON.stringify(listData, null, 2);
            } else {
                dataParsed = JSON.stringify(data, null, 2);
            }
            fs.appendFileSync(fileName, dataParsed);
        } catch (error) {
            console.error('An error ocurred while creating JSON File.');
        }
        return;
    }
    let fileContentAsJson = undefined;
    if (asList) {
        const fileContent = fs.readFileSync(fileName);
        fileContentAsJson = JSON.parse(fileContent);
        fileContentAsJson.push(data);
    } else {
        fileContentAsJson = data;
    }
    fs.writeFileSync(fileName, JSON.stringify(fileContentAsJson, null, 2));
    console.log('File written successfully!');
}

/**
 * @description Checks if a manga exists in the toScrap.json file.
 * @param { string } mangaId The ID of the manga to check, e.g: zp951872.
 * @returns { Boolean }
 */
function checkIfMangaExists(mangaId) {
    const data = fs.readFileSync(MAIN_DIRECTORY + 'toScrap.json');
    if (data.byteLength === 0) return false;
    const json = JSON.parse(data);
    return json.some(manga => manga.id === mangaId)
}

/**
 * @description Scrape all mangas from a given page.
 * @param { string } filter The filter to use. Can be 'newest', 'mostview', 'update'. 
 * @param { string } pageUrl The page number to scrape. Can be '1', '2', '3', etc. 
 * @param { boolean } byGenre If true, the scraper will use the genreId parameter. 
 * @param { string } genreId Genre ID to use as parameter. E.g: 2 for Action.
 * @returns { Promise<Array> } An array of manga basic info, such like title, id and url.
 */
async function scrapeMangas(filter = '', pageUrl = '', byGenre = false, genreId = '') {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    let _URL = 'https://manganato.com/'
    if (!byGenre) {
        _URL += 'genre-all/' + pageUrl + '/' + filter;
    } else {
        _URL += 'genre-' + genreId + '/' + pageUrl + '?type=topview'
    }
    await page.goto(_URL);
    await page.waitForSelector('.panel-content-genres');
    const links = await page.evaluate(() => {
        const rawItems = document.querySelectorAll('.panel-content-genres .content-genres-item .genres-item-info');
        const items = Array.from(rawItems).slice(0, rawItems.length / 2 + 1);
        const mangasToScrap = [];
        for (let item of items) {
            const name = item.querySelector('.genres-item-name').textContent;
            const url = item.querySelector('.genres-item-name').getAttribute('href');
            const id = url.split('-')[url.split('-').length - 1];
            mangasToScrap.push({ 'id': id, 'name': name, 'url': url });
        }
        return mangasToScrap;
    });
    browser.close();
    //console.log(links);
    addToScrap(links);
}

/**
 * @description Adds a list of mangas to the toScrap.json file.
 * @param { Array } data The list of mangas to add. 
 * @returns { void }
 */
function addToScrap(data) {
    let actualData;
    try {
        actualData = fs.readFileSync(MAIN_DIRECTORY + 'toScrap.json');
    } catch (error) {
        console.log('Error reading file: ' + error);
    }
    let actualDataParsed = [];
    if (actualData.byteLength > 0) {
        actualDataParsed = JSON.parse(actualData);
    }
    const dataFiltered = data.filter(manga => !checkIfMangaExists(manga.id));
    const newData = actualDataParsed.concat(dataFiltered);
    writeJsonFile(newData, MAIN_DIRECTORY + 'toScrap.json', false);
}

/**
 * @description Scrape the top mangas of the week.
 * @returns { Array } An array of manga basic info, such like title, id and url.
 */
async function scrapeTopWeek() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    await page.goto('https://manganato.com');
    await page.waitForSelector('#owl-slider');
    const data = await page.evaluate(() => {
        const items = document.querySelectorAll('#owl-slider .owl-item .item .slide-caption');
        const topMangas = [];
        for (let item of items) {
            const name = item.querySelector('a').getAttribute('title');
            const url = item.querySelector('a').getAttribute('href');
            const id = url.split('-')[url.split('-').length - 1];
            topMangas.push({ 'id': id, 'name': name, 'url': url });
        }
        return topMangas;
    });
    const filteredData = data.filter(manga => !checkIfMangaExists(manga.id));
    const parsedMangas = JSON.stringify(filteredData);
    browser.close();
    return parsedMangas;
}

/**
 * @description Main function that scrapes everything (top week, new, hotest, genres, etc.) and adds 
 * @returns { void }
 */
async function scrapeEverything() {
    let currentlyScraping = 0;
    console.log('Scraping everything...');
    for (let genre of _GENRES_ID) {
        console.log('Scraping genre ' + genre + '...');
        await scrapeMangas('?type=topview', '', true, genre);
        currentlyScraping++;
        console.log('Genre ' + genre + ' scraped! ' + (_GENRES_ID.length - currentlyScraping) + ' genres left 😸');
    }
    console.log('Scraping top week...');
    scrapeTopWeek();
    console.log('Scraping new...');
    await scrapeMangas('?type=newest', '', false, '');
    console.log('Scraping hotest...');
    await scrapeMangas('?type=topview', '', false, '');
    console.log('Scraping done!');
}

/**
 * @description Scrapes a mangas from toScrap.json File and saves it into TMOCluster.json.
 * @returns { void }
 */
async function scrapeMangaFromFile() {
    const now = new Date();
    console.log('Scraping from file at ' + now + '...');
    const data = fs.readFileSync(MAIN_DIRECTORY + 'toScrap.json');
    const json = JSON.parse(data);
    for (let manga of json) {
        let scrapedManga = await scrapeManga(manga.url);
        _GLOBAL_DATA.push(scrapedManga);
        console.log('Scraped ' + manga.name + ' (' + manga.id + ')');
    }
    console.log('Scraping finished from file at ' + now + '...');
    console.log('Writing to file...');
    writeJsonFile(_GLOBAL_DATA, MAIN_DIRECTORY + 'TMOCluster.json', false);
    console.log('Writing to file finished!');
}

scrapeMangaFromFile();
