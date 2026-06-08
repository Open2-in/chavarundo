const fs = require('fs');
const path = require('path');

const destDir = path.join(__dirname, '../public/leaflet');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const assets = [
  {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    dest: 'marker-icon-2x.png'
  },
  {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    dest: 'marker-icon.png'
  },
  {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    dest: 'marker-shadow.png'
  }
];

async function download(url, destPath) {
  console.log(`Downloading ${url} -> ${destPath}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
}

async function main() {
  for (const asset of assets) {
    const destPath = path.join(destDir, asset.dest);
    try {
      await download(asset.url, destPath);
    } catch (e) {
      console.error(`Error downloading ${asset.dest}:`, e);
    }
  }
  console.log('Done downloading Leaflet assets.');
}

main();
