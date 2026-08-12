import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputPublicDir = path.join(rootDir, ".output", "public");
const assetsDir = path.join(outputPublicDir, "assets");
const indexHtmlPath = path.join(outputPublicDir, "index.html");

if (!fs.existsSync(outputPublicDir)) {
  console.error("Output directory .output/public does not exist!");
  process.exit(1);
}

if (!fs.existsSync(assetsDir)) {
  console.error("Assets directory .output/public/assets does not exist!");
  process.exit(1);
}

const assetFiles = fs.readdirSync(assetsDir);

const cssFile = assetFiles.find((f) => f.endsWith(".css"));
const indexJsFile = assetFiles.find((f) => f.startsWith("index-") && f.endsWith(".js"));

console.log("Found CSS asset:", cssFile);
console.log("Found JS index asset:", indexJsFile);

let html = fs.readFileSync(indexHtmlPath, "utf8");

// Convert root-absolute paths to relative paths for Android WebView compatibility
html = html.replaceAll('href="/', 'href="./');

let headInsert = "";
if (cssFile) {
  headInsert += `\n    <link rel="stylesheet" href="./assets/${cssFile}" />`;
}

if (headInsert) {
  html = html.replace("</head>", `${headInsert}\n  </head>`);
}

if (indexJsFile) {
  html = html.replace(
    /<script type="module" src="\/src\/start\.ts"><\/script>/,
    `<script type="module" src="./assets/${indexJsFile}"></script>`
  );
  html = html.replace(
    /<script type="module" src="\/src\/main\.tsx"><\/script>/,
    `<script type="module" src="./assets/${indexJsFile}"></script>`
  );
}

// Add inline dark background style to body so there is no flash while JS loads
html = html.replace('<body class="', '<body style="background-color: #0b0f14; color: #ffffff;" class="');

fs.writeFileSync(indexHtmlPath, html, "utf8");
console.log("Successfully prepared .output/public/index.html for Capacitor Android!");
