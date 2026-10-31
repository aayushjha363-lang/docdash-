# DocDash — Journal & PDF Tools

DocDash combines a college journal sheet with practical PDFs and provides browser-based PDF tools. Selected documents are processed locally in your browser and are not uploaded by the app.

## Run locally

Open this folder in VS Code and use Live Server, or run a static HTTP server from this folder:

```powershell
python -m http.server 5500
```

Then open `http://localhost:5500`. Opening `index.html` directly also works, but a local server is recommended for testing the same way as production.

## Deploy

This is a static website. There is no build step, package installation, database, or server-side runtime.

1. Before publishing, review `privacy.html` and the counter setting in `js/config.js`. The current counter uses the external Abacus service. Set `base` to an empty string to disable it, or change `ns` to a unique namespace you control.
2. Deploy the contents of this `journal-maker` folder (including `index.html`, `privacy.html`, `favicon.svg`, `css`, `js`, and `vendor`) to a static host.
3. Use the folder itself as the publish directory. If the host asks for a build command, leave it blank.
4. Enable HTTPS in the hosting provider's settings, then open the HTTPS URL and test uploads, previews, conversions and downloads on desktop and mobile.

Compatible options include GitHub Pages, Netlify, and Cloudflare Pages. The `_headers` file provides additional security headers on hosts that support this file format; unsupported hosts can ignore it.

Google Fonts and the optional usage counter require an internet connection. The bundled PDF libraries and core PDF tools work locally. The privacy policy explains browser storage and third-party requests.

## Features

- Combine a journal sheet with one or more practical PDFs.
- Position details, choose sheet placement, add page numbers, and append a theory sheet.
- Organize, convert, compress, number, and watermark PDFs.
- Keep document processing in the browser. Images to PDF and Word to PDF can send their result into the journal workflow.

## Main files

- `index.html`: application and SEO metadata
- `privacy.html`: privacy policy
- `favicon.svg`: browser icon
- `css/style.css`: theme and layout
- `js/app.js`: journal workflow and live preview
- `js/tools.js`, `js/common.js`, `js/pdftools.js`: tools and shared PDF operations
- `js/config.js`: usage counter configuration
- `js/merge.js`: journal PDF builder
- `vendor/`: bundled PDF, image, and document libraries
