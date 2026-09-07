import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

// Run against the publish folder, so a source-only fix cannot pass this check.
const root = new URL('../dist/', import.meta.url);
const origin = 'https://dualsense.studio';
const pages = ['index.html', 'streamer.html'];
const read = path => readFile(new URL(path, root), 'utf8');
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map(([tag]) => attributes(tag));
const meta = (html, key) => tags(html, 'meta').find(tag => tag.name === key || tag.property === key)?.content;
const canonical = html => tags(html, 'link').filter(tag => tag.rel === 'canonical');
const sitemapUrls = async () => [...(await read('sitemap.xml')).matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);

test('each public landing page has one clean canonical, unique metadata and a crawlable heading', async () => {
  const titles = new Set(), descriptions = new Set();
  for (const page of pages) {
    const html = await read(page), expected = origin + (page === 'index.html' ? '/' : '/' + page);
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert.ok(title?.includes('DualSense Studio'), page);
    assert.ok(meta(html, 'description')?.length > 80, page);
    assert.equal(canonical(html).length, 1, page);
    assert.equal(canonical(html)[0].href, expected, page);
    assert.equal(meta(html, 'og:url'), expected, page);
    assert.equal(meta(html, 'og:site_name'), 'DualSense Studio');
    assert.doesNotMatch(meta(html, 'robots'), /noindex|nofollow/);
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
    assert.match(html, /<html lang="en">/);
    titles.add(title); descriptions.add(meta(html, 'description'));
    // Metadata stays stable for all appearance/preset query combinations.
    assert.equal(new URL(expected).search, '');
  }
  assert.equal(titles.size, pages.length);
  assert.equal(descriptions.size, pages.length);
});

test('social previews use real wide PNGs with accurate dimensions and accessible descriptions', async () => {
  for (const page of pages) {
    const html = await read(page), url = new URL(meta(html, 'og:image'));
    assert.equal(url.origin, origin);
    assert.equal(meta(html, 'twitter:card'), 'summary_large_image');
    assert.equal(meta(html, 'twitter:image'), url.href);
    assert.ok(meta(html, 'og:image:alt')); assert.ok(meta(html, 'twitter:image:alt'));
    const png = await readFile(new URL('.' + url.pathname, root));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), Number(meta(html, 'og:image:width')));
    assert.equal(png.readUInt32BE(20), Number(meta(html, 'og:image:height')));
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    assert.ok(width >= 1200 && height >= 600, 'Large sharing cards need sufficient image resolution');
    assert.ok(width / height >= 1.8 && width / height <= 2, 'Sharing image should have a wide card aspect ratio');
    // The Streamer page uses the approved illustrated PNG cover; the homepage uses a simpler graphic.
    const budget = page === 'streamer.html' ? 2_000_000 : 300_000;
    assert.ok(png.length < budget, `${page}: social preview exceeds its image budget`);
  }
});

test('sitemap includes exactly indexable destinations; capture stays crawlable but noindex', async () => {
  const urls = await sitemapUrls();
  assert.deepEqual(urls, [origin + '/', origin + '/streamer.html']);
  const robots = await read('robots.txt');
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Sitemap: https:\/\/dualsense\.studio\/sitemap\.xml/);
  assert.doesNotMatch(robots, /Disallow:\s*\/(?:\s|$)|Disallow:.*(?:overlay|controller|assets)/m);
  for (const page of ['overlay.html', '404.html']) {
    const html = await read(page);
    assert.match(meta(html, 'robots'), /noindex/);
    assert.ok(!urls.includes(origin + '/' + page));
    assert.equal(canonical(html).length, 0, 'No contradictory canonical on an excluded page');
  }
  for (const url of urls) {
    const path = new URL(url).pathname;
    const html = await read(path === '/' ? 'index.html' : path.slice(1));
    assert.equal(canonical(html)[0].href, url);
  }
});

test('structured data describes the actual app and agrees with canonical page identity', async () => {
  for (const page of pages) {
    const html = await read(page);
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 1);
    const data = JSON.parse(scripts[0][1]);
    assert.equal(data['@context'], 'https://schema.org');
    const webPage = data['@graph'].find(item => item['@type'] === 'WebPage');
    assert.equal(webPage.url, canonical(html)[0].href);
    const app = data['@graph'].find(item => item['@id'] === webPage.mainEntity['@id']);
    assert.equal(app['@type'], 'WebApplication');
    assert.equal(app.url, webPage.url);
    assert.doesNotMatch(scripts[0][1], /aggregateRating|reviewCount|ratingValue/);
    if (page === 'index.html') assert.equal(data['@graph'].find(item => item['@type'] === 'WebSite').name, 'DualSense Studio');
  }
});

test('all static local links, assets and fragment targets survive the build', async () => {
  for (const page of [...pages, 'overlay.html', '404.html']) {
    const html = await read(page), base = new URL(page, origin + '/');
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
    assert.equal(new Set(ids).size, ids.length, `${page}: duplicate element ID`);
    for (const tag of [...tags(html, 'link'), ...tags(html, 'script'), ...tags(html, 'a'), ...tags(html, 'img')]) {
      const value = tag.src || tag.href;
      if (!value) continue;
      const url = new URL(value, base);
      if (url.origin !== origin) continue;
      const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      assert.ok((await stat(new URL(file, root))).isFile(), `${page} → ${value}`);
      if (url.hash && file === page) assert.ok(ids.includes(url.hash.slice(1)), `${page}: missing ${url.hash}`);
    }
  }
});

test('essential feature descriptions and honest limitations are present without rendering JavaScript', async () => {
  const html = (await read('index.html')).split('<section class="site-info"')[1]?.split('</main>')[0];
  assert.ok(html);
  for (const text of ['stick drift', 'Controller diagnostics', 'touchpad', 'gyro', 'Chrome or Edge', 'does not repair', 'not affiliated']) assert.ok(html.includes(text), text);
  assert.match(await read('index.html'), /<noscript>/);
});

test('Streamer search content explains setup and the free offer in the published HTML', async () => {
  const html = await read('streamer.html');
  const help = html.match(/<section class="streamer-help"[\s\S]*?<\/section>/)?.[0];
  assert.ok(help, 'Setup help must be readable before the 3D app loads');
  for (const text of ['free to use', 'OBS Browser source', 'Chroma Key', 'Try demo', 'Chrome or Edge', 'USB or Bluetooth', 'L2/R2']) assert.ok(help.includes(text), text);
  assert.ok([...help.matchAll(/<details\b[^>]*>/g)].length >= 5);
  assert.match(html, /<noscript>[\s\S]*?href="#obs-setup"/);
  assert.match(await read('index.html'), /href="\.\/streamer\.html"/);
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const app = data['@graph'].find(item => item['@type'] === 'WebApplication');
  const webPage = data['@graph'].find(item => item['@type'] === 'WebPage');
  assert.equal(app.isAccessibleForFree, true);
  assert.equal(app.offers.price, 0);
  assert.equal(app.offers.url, canonical(html)[0].href);
  assert.equal(app.image, meta(html, 'og:image'));
  assert.equal(webPage.primaryImageOfPage.url, app.image);
  assert.equal(webPage.primaryImageOfPage.width, Number(meta(html, 'og:image:width')));
  assert.equal(webPage.primaryImageOfPage.height, Number(meta(html, 'og:image:height')));
});
