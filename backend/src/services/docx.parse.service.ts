import { OfficeParser, type OfficeParserConfig } from "officeparser";

// Explicitly disable attachments, OCR and raw content extraction. We only need
// the text of the document; enabling the extras would expand the attack surface
// (zip-bomb attachments, heavy OCR work) for no product benefit.
const PARSER_CONFIG: OfficeParserConfig = {
  extractAttachments: false,
  ocr: false,
  includeRawContent: false,
  ignoreNotes: true,
  outputErrorToConsole: false,
};

/**
 * @deprecated Retained as legacy code. Production DOCX parsing uses
 * document.parse.service.ts.
 */
export async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const parser = await OfficeParser.parseOffice(buffer, PARSER_CONFIG);
    return parser.toText();
  } catch (e) {
    throw new Error(
      e instanceof Error
        ? `Error parsing DOCX: ${e.message}`
        : "Error parsing DOCX",
    );
  }
}
