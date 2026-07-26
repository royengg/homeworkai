import pdf from "pdf-parse";
import puppeteer from "puppeteer";
import { env } from "../config/env.schema";
import { buildAnalysisDocumentHtml } from "./render-document.service";
import type { AnalysisOutput } from "../types/analysis-output.types";

const PDF_RENDER_TIMEOUT_MS = 90_000;

/**
 * Renders the analysis through Chromium's print engine. Keeping document
 * composition in HTML/CSS gives us predictable tables, Unicode, page breaks,
 * and reusable visual components without coupling model output to PDFKit calls.
 */
export async function renderSlimToPdfBuffer(data: AnalysisOutput) {
  const browser = await puppeteer.launch({
    headless: true,
    ...(env.PUPPETEER_EXECUTABLE_PATH
      ? { executablePath: env.PUPPETEER_EXECUTABLE_PATH }
      : {}),
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    timeout: PDF_RENDER_TIMEOUT_MS,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(buildAnalysisDocumentHtml(data), {
      waitUntil: "load",
      timeout: PDF_RENDER_TIMEOUT_MS,
    });
    await page.emulateMediaType("print");

    const bytes = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate:
        '<div style="width:100%;font:9px Arial,sans-serif;color:#64748b;padding:0 18mm;"><span>HomeworkAI · Study-ready analysis</span></div>',
      footerTemplate:
        '<div style="width:100%;font:9px Arial,sans-serif;color:#64748b;padding:0 18mm;display:flex;justify-content:space-between;"><span class="date"></span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
      margin: { top: "18mm", right: "0", bottom: "18mm", left: "0" },
      tagged: true,
      outline: true,
    });

    const buffer = Buffer.from(bytes);
    const parsed = await pdf(buffer);
    return { buffer, pages: parsed.numpages };
  } finally {
    await browser.close();
  }
}
