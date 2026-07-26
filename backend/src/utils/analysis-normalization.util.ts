type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(asString).filter((item) => item.length > 0)
    : [];
}

function sourceIds(block: UnknownRecord): string[] {
  return asStrings(block.source_span_ids);
}

function contentLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function parseCompactTable(value: string): {
  columns: string[];
  rows: string[][];
} | null {
  const lines = contentLines(value)
    .map((line) => line.replace(/^\||\|$/g, ""))
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean))
    .filter(
      (row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell)),
    );
  const columns = lines[0] ?? [];
  const rows = lines.slice(1);
  return columns.length > 0 && rows.length > 0 ? { columns, rows } : null;
}

function normalizeBlock(value: unknown): UnknownRecord | null {
  const block = asRecord(value);
  const type = asString(block.type);
  const content =
    asString(block.content) ||
    asString(block.title) ||
    asStrings(block.items).join(" ");
  const ids = sourceIds(block);

  switch (type) {
    case "heading":
      return content
        ? {
            type,
            content,
            level: block.level === 4 ? 4 : 3,
            source_span_ids: ids,
          }
        : null;
    case "paragraph":
      return content ? { type, content, source_span_ids: ids } : null;
    case "bullet_list": {
      const items = asStrings(block.items);
      const normalizedItems =
        items.length > 0 ? items : contentLines(content);
      return normalizedItems.length > 0
        ? { type, items: normalizedItems, source_span_ids: ids }
        : null;
    }
    case "equation":
      return content
        ? {
            type,
            content,
            ...(asString(block.caption)
              ? { caption: asString(block.caption) }
              : {}),
            source_span_ids: ids,
          }
        : null;
    case "table": {
      const explicitColumns = asStrings(block.columns);
      const explicitRows = Array.isArray(block.rows)
        ? block.rows
            .filter(Array.isArray)
            .map((row) => asStrings(row))
            .filter((row) => row.length > 0)
        : [];
      const compactTable = parseCompactTable(content);
      const columns =
        explicitColumns.length > 0
          ? explicitColumns
          : compactTable?.columns ?? [];
      const rows =
        explicitRows.length > 0 ? explicitRows : compactTable?.rows ?? [];
      if (columns.length === 0 || rows.length === 0) return null;
      return {
        type,
        columns,
        rows,
        ...(asString(block.caption)
          ? { caption: asString(block.caption) }
          : {}),
        source_span_ids: ids,
      };
    }
    case "callout":
      return content
        ? {
            type,
            title: asString(block.title) || "Key point",
            content,
            source_span_ids: ids,
          }
        : null;
    case "diagram":
      return content
        ? {
            type,
            title: asString(block.title) || "Process overview",
            content,
            caption:
              asString(block.caption) || "Simplified conceptual flow.",
            source_span_ids: ids,
          }
        : null;
    default:
      // Unknown variants are safer as prose than silently discarded, provided
      // the model supplied meaningful content.
      return content
        ? { type: "paragraph", content, source_span_ids: ids }
        : null;
  }
}

/**
 * Adapts Gemini's flat response schema into our discriminated block union.
 * This boundary is intentionally narrow: it only repairs equivalent field
 * placements/default labels, then Zod performs the authoritative validation.
 */
export function normalizeGeneratedSection(value: unknown): UnknownRecord {
  const section = asRecord(value);
  const verification = asRecord(section.verification);
  const status = asString(verification.status);

  return {
    ...section,
    section_id: asString(section.section_id),
    summary: asString(section.summary),
    blocks: Array.isArray(section.blocks)
      ? section.blocks.map(normalizeBlock).filter(Boolean)
      : [],
    source_references: Array.isArray(section.source_references)
      ? section.source_references
          .map(asRecord)
          .map((reference) => ({
            span_id: asString(reference.span_id),
            excerpt: asString(reference.excerpt),
          }))
          .filter(
            (reference) =>
              reference.span_id.length > 0 && reference.excerpt.length > 0,
          )
      : [],
    ...(status === "verified" || status === "revised"
      ? {
          verification: {
            status,
            issues_fixed: asStrings(verification.issues_fixed),
          },
        }
      : {}),
  };
}

export function countSectionWords(value: unknown): number {
  const section = asRecord(value);
  if (!Array.isArray(section.blocks)) return 0;

  const text = section.blocks
    .map(asRecord)
    .flatMap((block) => {
      const rows = Array.isArray(block.rows)
        ? block.rows.flatMap((row) => asStrings(row))
        : [];
      return [
        asString(block.title),
        asString(block.content),
        asString(block.caption),
        ...asStrings(block.items),
        ...asStrings(block.columns),
        ...rows,
      ];
    })
    .join(" ");

  return text.match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu)?.length ?? 0;
}

const SPECIAL_BLOCK_TYPES = new Set([
  "bullet_list",
  "equation",
  "table",
  "callout",
  "diagram",
]);

export function inferRequiredBlockTypes(
  sourceInput: string,
  modelRequirements: unknown,
): string[] {
  const requirements = asStrings(modelRequirements).filter((type) =>
    SPECIAL_BLOCK_TYPES.has(type),
  );
  const source = sourceInput.toLowerCase();

  const add = (type: string) => {
    if (!requirements.includes(type)) requirements.push(type);
  };
  if (/\b(table|tabular)\b/.test(source)) add("table");
  if (/\b(diagram|flowchart|flow chart|process map)\b/.test(source)) {
    add("diagram");
  }
  if (/\b(equation|formula)\b/.test(source)) add("equation");
  if (/\b(bullet(?:ed)? list|bullet points)\b/.test(source)) {
    add("bullet_list");
  }
  if (/\b(callout|key takeaway box)\b/.test(source)) add("callout");

  return requirements;
}
