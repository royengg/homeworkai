const puppeteer = require("puppeteer");

const requiredEnv = [
  "BROWSER_TEST_EMAIL",
  "BROWSER_TEST_PASSWORD",
  "BROWSER_UPLOAD_ID",
];
const missing = requiredEnv.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Missing browser verification variables: ${missing.join(", ")}`);
}

const frontendUrl =
  process.env.BROWSER_FRONTEND_URL ?? "http://localhost:5173";
const screenshotPath =
  process.env.BROWSER_SCREENSHOT_PATH ?? "/tmp/homeworkai-browser-result.png";

async function verify() {
  const errors = [];
  const failedRequests = [];
  const httpErrors = [];
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });

    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(`console: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
    page.on("requestfailed", (request) => {
      if (!request.url().includes("favicon")) {
        failedRequests.push(
          `${request.method()} ${request.url()} ${
            request.failure()?.errorText ?? ""
          }`,
        );
      }
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        httpErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto(`${frontendUrl}/login`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.type("#email", process.env.BROWSER_TEST_EMAIL);
    await page.type("#password", process.env.BROWSER_TEST_PASSWORD);
    await page.click('button[type="submit"]');
    try {
      await page.waitForFunction(
        () => !window.location.pathname.startsWith("/login"),
        { timeout: 12_000 },
      );
    } catch {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      const state = await page.evaluate(() => ({
        url: window.location.href,
        body: document.body.innerText.slice(0, 1_000),
      }));
      throw new Error(
        `Login did not navigate: ${JSON.stringify({
          state,
          errors,
          failedRequests,
          httpErrors,
        })}`,
      );
    }
    errors.length = 0;
    failedRequests.length = 0;
    httpErrors.length = 0;

    await page.goto(
      `${frontendUrl}/upload/${process.env.BROWSER_UPLOAD_ID}`,
      { waitUntil: "domcontentloaded", timeout: 30_000 },
    );
    try {
      await page.waitForFunction(
        () =>
          document.body.innerText
            .toLowerCase()
            .includes("reviewed assignment"),
        { timeout: 15_000 },
      );
    } catch {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      const state = await page.evaluate(() => ({
        url: window.location.href,
        body: document.body.innerText.slice(0, 2_000),
      }));
      throw new Error(
        `Result view did not load: ${JSON.stringify({
          state,
          errors,
          failedRequests,
          httpErrors,
        })}`,
      );
    }

    const checks = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const normalizedText = bodyText.toLowerCase();
      return {
        url: window.location.href,
        bodyLength: bodyText.trim().length,
        title: normalizedText.includes(
          "biology assignment: the role of photosynthesis in supporting life",
        ),
        reviewed: normalizedText.includes("reviewed assignment"),
        evidence: normalizedText.includes("evidence used"),
        diagram: normalizedText.includes("process overview"),
        tables: document.querySelectorAll("table").length,
        overlay: Boolean(
          document.querySelector(
            "vite-error-overlay,.vite-error-overlay,#webpack-dev-server-client-overlay",
          ),
        ),
      };
    });

    await page.screenshot({ path: screenshotPath, fullPage: true });
    const passed =
      checks.bodyLength > 0 &&
      checks.title &&
      checks.reviewed &&
      checks.evidence &&
      checks.diagram &&
      checks.tables > 0 &&
      !checks.overlay &&
      errors.length === 0 &&
      failedRequests.filter((request) => !request.includes("ERR_ABORTED"))
        .length === 0 &&
      httpErrors.length === 0;

    console.log(
      JSON.stringify(
        {
          passed,
          checks,
          errors,
          failedRequests,
          httpErrors,
          screenshotPath,
        },
        null,
        2,
      ),
    );
    if (!passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

verify().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
