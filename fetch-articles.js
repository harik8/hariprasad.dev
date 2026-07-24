#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

function fetchArticles() {
  return new Promise((resolve, reject) => {
    https.get('https://dev.to/api/articles?username=harik8&per_page=6', {
      headers: { 'User-Agent': 'hariprasad.dev' }
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          console.error('JSON parse error, data length:', data.length);
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  try {
    console.log('Fetching dev.to articles...');
    const articles = await fetchArticles();

    if (!Array.isArray(articles) || articles.length === 0) {
      console.error('No articles found');
      process.exit(1);
    }

    const articlesJson = JSON.stringify(articles);
    fs.writeFileSync('./src/articles.json', articlesJson);
    console.log(`✓ Fetched ${articles.length} articles and saved to src/articles.json`);
  } catch (error) {
    console.error('Error fetching articles:', error.message);
    process.exit(1);
  }
}

main();
