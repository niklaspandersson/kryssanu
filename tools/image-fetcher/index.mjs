import fs from 'fs/promises';
import puppeteer from 'puppeteer';

const delay = ms => new Promise(resolve => setTimeout(() => resolve(), ms));

const BaseDir = '../data/';
let latinNames = [];
async function main() {
  const birds = JSON.parse(
    await fs.readFile(BaseDir + 'sweden.json', { encoding: 'utf-8' })
  );
  latinNames = birds.map(bird => bird.latin.toLocaleLowerCase());
  // latinNames = latinNames.sort((a, b) => a.localeCompare(b));
  // await fs.writeFile(BaseDir + 'latin-names.json', JSON.stringify(latinNames));

  const files = await getAllFilenames(BaseDir + 'links/');
  const links = await Promise.all(files.map(extractLink));

  const browser = await puppeteer.launch();
  let result = [];
  try {
    for (let link of links) {
      await delay(Math.random() * 1000);
      result.push(await scrape(browser, link));
      console.log(`Fetched ${link}`);
    }
  } catch (err) {
    console.error(err);
  }
  await browser.close();
  await fs.writeFile(BaseDir + 'result.json', JSON.stringify(result));
}

main()
  .then(() => console.log('Done!'))
  .catch(e => console.error(e));

async function scrape(browser, url) {
  let data = { url };

  const page = await browser.newPage();
  await page.goto(url);

  const extracted = await page.evaluate(() => {
    const license = document.querySelector(
      '.rlicense-declaration a:last-child'
    );
    const licenseTitle = license?.textContent;
    const licenseLink = license?.href;

    const authorElement = document
      .querySelector('#fileinfotpl_aut')
      ?.parentElement?.querySelector('td:last-child');
    const authorLink = authorElement?.querySelector('a')?.href;
    const authorName = authorElement?.textContent?.trim();
    return {
      originalImageURL: document.querySelector(
        '#mw-content-text > div.fullMedia > p > a'
      )?.href,
      license: licenseTitle,
      licenseLink,
      author: authorName,
      authorLink,
      categories: Array.from(
        document.querySelectorAll('#mw-normal-catlinks li')
      ).map(el => el.textContent.toLocaleLowerCase()),
    };
  });

  extracted.latin =
    extracted.categories?.find(str => latinNames.includes(str)) ?? null;
  data = { ...data, ...extracted };
  return data;
}

async function getAllFilenames(path) {
  return await fs.readdir(path);
}

async function extractLink(filename) {
  const contents = await fs.readFile(BaseDir + 'links/' + filename, {
    encoding: 'utf-8',
  });
  return contents[0] === '<'
    ? parseMacOSShortcut(contents)
    : parseWindowsShortcur(contents);
}

function parseMacOSShortcut(str) {
  return str.match(/<string>(.*)<\/string>/i)?.[1];
}
function parseWindowsShortcur(str) {
  return str.match(/URL=(.*)[\s$]/i)?.[1];
}
