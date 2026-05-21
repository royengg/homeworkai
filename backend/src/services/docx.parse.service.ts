import { OfficeParser } from "officeparser";

export async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const parser = await OfficeParser.parseOffice(buffer);
    return parser.toText();
  } catch (e) {
    throw new Error(
      e instanceof Error
        ? `Error parsing DOCX: ${e.message}`
        : "Error parsing DOCX",
    );
  }
}
