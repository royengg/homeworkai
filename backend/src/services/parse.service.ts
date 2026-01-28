import pdf from "pdf-parse";
import { ParsedResult } from "../types/parsed-result.types";
import { logger } from "../config/logger.config";

export async function parsePDF(buffer: Buffer): Promise<ParsedResult> {
  try {
    let parser: any;
    try {
      parser = require("pdf-parse");
    } catch (e) {
      parser = pdf;
    }

    if (typeof parser !== 'function' && parser?.default) {
      parser = parser.default;
    }

    if (typeof parser !== 'function') {
      logger.error("pdf-parse library is not a function", { 
        type: typeof parser, 
        keys: Object.keys(parser || {}),
        value: parser 
      });
      throw new Error("pdf-parse library import failed");
    }

    const result = await parser(buffer);
    const { text } = result;
    return { text };
  } catch (e) {
    logger.error("Error parsing PDF", { request_error: e });
    throw new Error(e instanceof Error ? `Error parsing PDF: ${e.message}` : "Error parsing PDF");
  }
}
