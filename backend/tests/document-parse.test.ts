import { OfficeParser, type OfficeParserAST } from "officeparser";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  normalizeOfficeDocument,
  parseDocument,
} from "../src/services/document.parse.service";

function makeTextPdf(text: string): Buffer {
  const escaped = text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  const stream = `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(body);
}

describe("document parsing", () => {
  it("extracts a real text PDF with page-aware blocks", async () => {
    const parsed = await parseDocument(
      makeTextPdf("Question 1: What is 2 + 2?"),
      "pdf",
    );

    expect(parsed.text).toContain("--- Page 1 ---");
    expect(parsed.text).toContain("Question 1");
    expect(parsed.blocks).toEqual([
      expect.objectContaining({
        id: "B00001",
        type: "paragraph",
        page: 1,
        text: "Question 1: What is 2 + 2?",
      }),
    ]);
    expect(parsed.diagnostics).toMatchObject({
      totalUnits: 1,
      parsedUnits: 1,
      coverage: 1,
      visualFallbackRecommended: false,
      warnings: [],
    });
  });

  it("recovers a real PDF when the primary parser rejects it", async () => {
    const parseSpy = jest
      .spyOn(OfficeParser, "parseOffice")
      .mockRejectedValueOnce(new Error("Primary parser failed"));

    try {
      const parsed = await parseDocument(
        readFileSync(
          join(dirname(require.resolve("pdf-parse")), "test/data/01-valid.pdf"),
        ),
        "pdf",
      );
      expect(parsed.text.length).toBeGreaterThan(0);
      expect(parsed.diagnostics.parser).toBe("pdf-parse");
      expect(parsed.diagnostics.visualFallbackRecommended).toBe(true);
      expect(parsed.diagnostics.warnings).toContainEqual(
        expect.objectContaining({ code: "PARSER_FALLBACK" }),
      );
    } finally {
      parseSpy.mockRestore();
    }
  });

  it("preserves readable PDF pages when another page is missing or empty", () => {
    const ast = {
      type: "pdf",
      metadata: { pages: 3 },
      attachments: [],
      content: [
        {
          type: "page",
          metadata: { pageNumber: 1 },
          children: [{ type: "paragraph", text: "Readable first page" }],
        },
        {
          type: "page",
          metadata: { pageNumber: 3 },
          children: [],
        },
      ],
      toText: () => "Readable first page",
    } as OfficeParserAST;

    const parsed = normalizeOfficeDocument(ast, "pdf");

    expect(parsed.text).toContain("Readable first page");
    expect(parsed.diagnostics.coverage).toBeCloseTo(1 / 3);
    expect(parsed.diagnostics.visualFallbackRecommended).toBe(true);
    expect(parsed.diagnostics.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNREADABLE_PAGE", unit: 2 }),
        expect.objectContaining({ code: "EMPTY_PAGE", unit: 3 }),
      ]),
    );
  });

  it("keeps DOCX headings, lists, tables, and visual-content warnings", () => {
    const ast = {
      type: "docx",
      metadata: {},
      attachments: [],
      content: [
        { type: "heading", text: "Energy", metadata: { level: 1 } },
        {
          type: "list",
          text: "Define kinetic energy",
          metadata: { listType: "ordered", indentation: 0 },
        },
        {
          type: "table",
          children: [
            {
              type: "row",
              children: [
                { type: "cell", text: "Quantity" },
                { type: "cell", text: "Unit" },
              ],
            },
            {
              type: "row",
              children: [
                { type: "cell", text: "Energy" },
                { type: "cell", text: "Joule" },
              ],
            },
          ],
        },
        {
          type: "paragraph",
          text: "",
          children: [
            {
              type: "image",
              text: "",
              metadata: { attachmentName: "scan.png" },
            },
          ],
        },
      ],
      toText: () => "",
    } as OfficeParserAST;

    const parsed = normalizeOfficeDocument(ast, "docx");

    expect(parsed.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "heading", level: 1 }),
        expect.objectContaining({
          type: "list",
          text: "1. Define kinetic energy",
        }),
        expect.objectContaining({
          type: "table",
          rows: [
            ["Quantity", "Unit"],
            ["Energy", "Joule"],
          ],
        }),
        expect.objectContaining({ type: "image", text: "" }),
      ]),
    );
    expect(parsed.text).toContain("Quantity | Unit");
    expect(parsed.diagnostics.warnings).toContainEqual(
      expect.objectContaining({ code: "VISUAL_CONTENT" }),
    );
  });
});
