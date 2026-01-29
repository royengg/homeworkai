import { OfficeParser } from "officeparser";

export async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const parser = await OfficeParser.parseOffice(buffer);
    const text = parser.toText();
    const cleaned = text.replace(/```json\n?|```/g, "");

    return cleaned;
  } catch (e) {
    throw new Error(
      e instanceof Error
        ? `Error parsing DOCX: ${e.message}`
        : "Error parsing DOCX",
    );
  }
}
