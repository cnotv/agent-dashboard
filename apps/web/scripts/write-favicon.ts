// Writes public/favicon.svg from the same function that draws the logo in the app, so the tab
// icon and the sidebar mark cannot drift apart. Run it after changing the logo; a test fails
// while the committed file is out of date.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { faviconColor, logoSvgDocument } from '../src/lib/dashi-logo.ts'

writeFileSync(fileURLToPath(new URL('../public/favicon.svg', import.meta.url)), logoSvgDocument(faviconColor))
