import {
  OfficeParser,
  type OfficeContentNode,
  type OfficeParserAST,
  type OfficeParserConfig,
} from "officeparser";
import pdf from "pdf-parse";
import { logger } from "../config/logger.config";
import type {
  ParsedBlock,
  ParsedBlockType,
  ParsedResult,
  ParseWarning,
} from "../types/parsed-result.types";
import { sanitizeTextInput } from "../utils/format.utils";

export type SupportedDocumentKind = "pdf" | "docx";

const PARSER_CONFIG: OfficeParserConfig = {
  extractAttachments: false,
  ocr: false,
  includeRawContent: false,
  // Notes often contain source material or assignment constraints.
  ignoreNotes: false,
  outputErrorToConsole: false,
};

const LOW_TEXT_PAGE_CHARACTERS = 24;
const PARSER_VERSION = "6.0.4";

type NodeMetadata = Record<string, unknown>;

function metadata(node: OfficeContentNode): NodeMetadata {
  return (node.metadata ?? {}) as NodeMetadata;
}

function cleanText(value: string | undefined): string {
  return sanitizeTextInput(value ?? "").replace(/[ \t]+\n/g, "\n").trim();
}

function tableRows(node: OfficeContentNode): string[][] {
  return (node.children ?? [])
    .filter((child) => child.type === "row")
    .map((row) =>
      (row.children ?? [])
        .filter((child) => child.type === "cell")
        .map((cell) => cleanText(cell.text)),
    )
    .filter((row) => row.some(Boolean));
}

function tableText(rows: string[][]): string {
  return rows.map((row) => row.join(" | ")).join("\n");
}

function nodeText(node: OfficeContentNode): string {
  if (node.type === "table") return tableText(tableRows(node));

  const text = cleanText(node.text);
  if (node.type !== "list" || !text) return text;

  const meta = metadata(node);
  const prefix = meta.listType === "ordered" ? "1." : "-";
  const indentation =
    typeof meta.indentation === "number" ? "  ".repeat(meta.indentation) : "";
  return `${indentation}${prefix} ${text}`;
}

function mapBlock(
  node: OfficeContentNode,
  id: string,
  page?: number,
): ParsedBlock | null {
  const supported = new Set<OfficeContentNode["type"]>([
    "heading",
    "paragraph",
    "list",
    "table",
    "note",
    "image",
    "chart",
  ]);
  if (!supported.has(node.type)) return null;

  const text = nodeText(node);
  const meta = metadata(node);
  const mapped: ParsedBlock = {
    id,
    type: node.type as ParsedBlockType,
    text,
    ...(page === undefined ? {} : { page }),
  };

  if (node.type === "heading" && typeof meta.level === "number") {
    mapped.level = meta.level;
  }
  if (node.type === "table") {
    mapped.rows = tableRows(node);
  }
  if (node.type === "image" && !text && typeof meta.altText === "string") {
    mapped.text = cleanText(meta.altText);
  }

  return mapped;
}

function visualWarning(
  block: ParsedBlock,
  warnings: ParseWarning[],
): void {
  if (block.type !== "image" && block.type !== "chart") return;
  warnings.push({
    code: "VISUAL_CONTENT",
    message: block.text
      ? `${block.type === "image" ? "Image" : "Chart"} content is represented only by its text description.`
      : `${block.type === "image" ? "Image" : "Chart"} content could not be represented as text.`,
    ...(block.page === undefined ? {} : { unit: block.page }),
  });
}

function normalizePdf(ast: OfficeParserAST): ParsedResult {
  const totalPages = ast.metadata.pages ?? ast.content.length;
  const warnings: ParseWarning[] = [];
  const blocks: ParsedBlock[] = [];
  const pageTexts: string[] = [];
  const seenPages = new Set<number>();
  let blockIndex = 0;

  for (const pageNode of ast.content) {
    const pageMeta = metadata(pageNode);
    const page =
      typeof pageMeta.pageNumber === "number"
        ? pageMeta.pageNumber
        : seenPages.size + 1;
    seenPages.add(page);

    const pageBlocks = (pageNode.children ?? [])
      .map((node) => mapBlock(node, `B${String(++blockIndex).padStart(5, "0")}`, page))
      .filter((block): block is ParsedBlock => block !== null);
    pageBlocks.forEach((block) => visualWarning(block, warnings));
    blocks.push(...pageBlocks);

    const text = cleanText(
      pageBlocks.map((block) => block.text).filter(Boolean).join("\n"),
    );
    pageTexts.push(text ? `--- Page ${page} ---\n${text}` : "");

    if (!text) {
      warnings.push({
        code: "EMPTY_PAGE",
        message: `Page ${page} contains no extractable text and may be blank or scanned.`,
        unit: page,
      });
    } else if (text.length < LOW_TEXT_PAGE_CHARACTERS) {
      warnings.push({
        code: "LOW_TEXT_PAGE",
        message: `Page ${page} contains very little extractable text.`,
        unit: page,
      });
    }
  }

  for (let page = 1; page <= totalPages; page++) {
    if (!seenPages.has(page)) {
      warnings.push({
        code: "UNREADABLE_PAGE",
        message: `Page ${page} could not be parsed.`,
        unit: page,
      });
    }
  }

  const parsedUnits = pageTexts.filter(Boolean).length;
  const text = cleanText(pageTexts.filter(Boolean).join("\n\n"));
  if (!text) {
    warnings.push({
      code: "NO_TEXT_CONTENT",
      message: "The PDF contains no extractable text.",
    });
  }

  return {
    text,
    blocks,
    numPages: totalPages,
    diagnostics: {
      parser: "officeparser",
      parserVersion: PARSER_VERSION,
      totalUnits: totalPages,
      parsedUnits,
      coverage: totalPages === 0 ? 0 : parsedUnits / totalPages,
      characterCount: text.length,
      visualFallbackRecommended:
        parsedUnits < totalPages ||
        warnings.some((warning) =>
          ["EMPTY_PAGE", "LOW_TEXT_PAGE", "VISUAL_CONTENT"].includes(
            warning.code,
          ),
        ),
      warnings,
    },
  };
}

function normalizeDocx(ast: OfficeParserAST): ParsedResult {
  const warnings: ParseWarning[] = [];
  const blocks: ParsedBlock[] = [];
  let blockIndex = 0;

  for (const node of ast.content) {
    const block = mapBlock(
      node,
      `B${String(++blockIndex).padStart(5, "0")}`,
    );
    if (!block) continue;
    blocks.push(block);
    visualWarning(block, warnings);

    const nested = [...(node.children ?? [])];
    while (nested.length > 0) {
      const child = nested.shift();
      if (!child) continue;
      nested.push(...(child.children ?? []));
      if (!["image", "chart", "note"].includes(child.type)) continue;

      const childBlock = mapBlock(
        child,
        `B${String(++blockIndex).padStart(5, "0")}`,
      );
      if (!childBlock) continue;
      blocks.push(childBlock);
      visualWarning(childBlock, warnings);
    }
  }

  const text = cleanText(
    blocks.map((block) => block.text).filter(Boolean).join("\n\n"),
  );
  const parsedUnits = blocks.filter((block) => Boolean(block.text)).length;
  if (!text) {
    warnings.push({
      code: "NO_TEXT_CONTENT",
      message: "The DOCX contains no extractable text.",
    });
  }

  return {
    text,
    blocks,
    diagnostics: {
      parser: "officeparser",
      parserVersion: PARSER_VERSION,
      totalUnits: blocks.length,
      parsedUnits,
      coverage: blocks.length === 0 ? 0 : parsedUnits / blocks.length,
      characterCount: text.length,
      visualFallbackRecommended: warnings.some(
        (warning) => warning.code === "VISUAL_CONTENT",
      ),
      warnings,
    },
  };
}

async function parsePdfFallback(
  buffer: Buffer,
  primaryError: unknown,
): Promise<ParsedResult> {
  const fallback = await pdf(buffer);
  const text = cleanText(fallback.text);
  if (!text) throw primaryError;

  logger.warn("Primary PDF parser failed; recovered text with fallback parser", {
    error:
      primaryError instanceof Error
        ? primaryError.message
        : String(primaryError),
    pages: fallback.numpages,
    characters: text.length,
  });

  return {
    text,
    blocks: [{ id: "B00001", type: "paragraph", text }],
    numPages: fallback.numpages,
    diagnostics: {
      parser: "pdf-parse",
      parserVersion: "1.1.1",
      totalUnits: fallback.numpages,
      parsedUnits: fallback.numpages,
      coverage: 1,
      characterCount: text.length,
      // The fallback preserves text but not page/block structure, so the
      // original PDF should also be shown to Gemini for layout and visuals.
      visualFallbackRecommended: true,
      warnings: [
        {
          code: "PARSER_FALLBACK",
          message:
            "Text was recovered with a fallback parser; page layout and visual content may need review.",
        },
      ],
    },
  };
}

export function normalizeOfficeDocument(
  ast: OfficeParserAST,
  expectedKind: SupportedDocumentKind,
): ParsedResult {
  if (ast.type !== expectedKind) {
    throw new Error(
      `Parser detected ${ast.type}, but ${expectedKind} content was expected`,
    );
  }
  return expectedKind === "pdf" ? normalizePdf(ast) : normalizeDocx(ast);
}

export async function parseDocument(
  buffer: Buffer,
  expectedKind: SupportedDocumentKind,
): Promise<ParsedResult> {
  try {
    const ast = await OfficeParser.parseOffice(buffer, {
      ...PARSER_CONFIG,
      // Word images are nested inside paragraph runs. Extracting attachment
      // metadata lets us report omitted visuals without running unbounded OCR.
      extractAttachments: expectedKind === "docx",
    });
    return normalizeOfficeDocument(ast, expectedKind);
  } catch (error) {
    if (expectedKind === "pdf") return parsePdfFallback(buffer, error);
    throw error;
  }
}
