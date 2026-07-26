export type SpanOptions = {
  maxSpanLength?: number;
  maxSpans?: number;
  maxTotalChars?: number;
  prependPrompt?: string;
  normalizeWhitespace?: boolean;
};

export type SourceSpan = {
  id: string;
  text: string;
};

export function buildSpansFromText(
  text: string,
  opts: SpanOptions = {}
): string[] {
  const {
    maxSpanLength = 800,
    maxSpans = 3000,
    prependPrompt,
    normalizeWhitespace = true,
  } = opts;

  const rawLines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const normalizedLines = normalizeWhitespace
    ? rawLines.map((l) => l.replace(/\s+/g, " "))
    : rawLines;
  const lines = normalizedLines.flatMap((line) => {
    if (line.length <= maxSpanLength) return [line];
    const chunks: string[] = [];
    let remaining = line;
    while (remaining.length > maxSpanLength) {
      const window = remaining.slice(0, maxSpanLength + 1);
      const whitespace = window.lastIndexOf(" ");
      const splitAt =
        whitespace >= Math.floor(maxSpanLength * 0.6)
          ? whitespace
          : maxSpanLength;
      chunks.push(remaining.slice(0, splitAt).trim());
      remaining = remaining.slice(splitAt).trimStart();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
  });

  const spans: string[] = [];
  let current = "";

  for (const line of lines) {
    if (!current.length) {
      current = line;
      continue;
    }

    if (current.length + 1 + line.length <= maxSpanLength) {
      current += " " + line;
    } else {
      spans.push(current);
      current = line;
      if (spans.length >= maxSpans) break;
    }
  }
  if (current && spans.length < maxSpans) spans.push(current);

  if (prependPrompt) {
    spans.unshift(prependPrompt.slice(0, maxSpanLength));
  }

  return spans.slice(0, maxSpans);
}

/**
 * Builds a complete, addressable source document without ever slicing its
 * serialized JSON. This keeps the payload valid and gives the model stable
 * evidence IDs it can cite in generated content.
 */
export function buildSourceSpans(
  text: string,
  opts: SpanOptions = {},
): SourceSpan[] {
  const maxTotalChars = opts.maxTotalChars ?? 120_000;
  const spans = buildSpansFromText(text, opts);
  const sourceSpans: SourceSpan[] = [];
  let usedChars = 0;

  for (const span of spans) {
    if (sourceSpans.length > 0 && usedChars + span.length > maxTotalChars) break;

    const remaining = maxTotalChars - usedChars;
    const safeText = span.slice(0, Math.max(0, remaining));
    if (!safeText) break;

    sourceSpans.push({
      id: `S${String(sourceSpans.length + 1).padStart(4, "0")}`,
      text: safeText,
    });
    usedChars += safeText.length;
  }

  return sourceSpans;
}

export function makeLLMInputFromText(text: string, opts?: SpanOptions): string {
  return JSON.stringify({ spans: buildSourceSpans(text, opts) });
}

export function sanitizeTextInput(text: string): string {
  return text
    .replace(/\0/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}
