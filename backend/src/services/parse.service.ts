import pdf from "pdf-parse";
import { ParsedResult } from "../types/parsed-result.types";
import { logger } from "../config/logger.config";

/**
 * @deprecated Retained as legacy code. Production PDF parsing uses
 * document.parse.service.ts.
 */
export async function parsePDF(
  buffer: Buffer,
): Promise<Pick<ParsedResult, "text">> {
  try {
    const result = await pdf(buffer);
    return { text: result.text };
  } catch (e) {
    logger.error("Error parsing PDF", { request_error: e });
    throw new Error(e instanceof Error ? `Error parsing PDF: ${e.message}` : "Error parsing PDF");
  }
}
