export type SpanOptions = {
  maxSpanLength?: number;
  maxSpans?: number;
  maxTotalChars?: number;
  maxChunkChars?: number;
  prependPrompt?: string;
  normalizeWhitespace?: boolean;
};

export type SourceSpan = {
  id: string;
  text: string;
};

export type SourceInput = {
  manifest: {
    chunkIndex: number;
    chunkCount: number;
    totalSpans: number;
    totalCharacters: number;
  };
  spans: SourceSpan[];
};

export function buildSpansFromText(
  text: string,
  opts: SpanOptions = {}
): string[] {
  const {
    maxSpanLength = 800,
    maxSpans = Number.MAX_SAFE_INTEGER,
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
  const maxTotalChars = opts.maxTotalChars ?? Number.MAX_SAFE_INTEGER;
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
  const spans = buildSourceSpans(text, opts);
  const totalCharacters = spans.reduce(
    (total, span) => total + span.text.length,
    0,
  );
  return JSON.stringify({
    manifest: {
      chunkIndex: 1,
      chunkCount: 1,
      totalSpans: spans.length,
      totalCharacters,
    },
    spans,
  } satisfies SourceInput);
}

/**
 * Splits a complete source corpus at span boundaries. Every extracted span is
 * included exactly once, and IDs stay stable across chunks so checkpoints and
 * citations remain valid when large documents are resumed.
 */
export function makeLLMInputsFromText(
  text: string,
  opts: SpanOptions = {},
): string[] {
  const maxChunkChars = opts.maxChunkChars ?? 120_000;
  if (maxChunkChars < (opts.maxSpanLength ?? 800)) {
    throw new Error("maxChunkChars must be at least maxSpanLength");
  }

  const spans = buildSourceSpans(text, {
    ...opts,
    maxTotalChars: Number.MAX_SAFE_INTEGER,
  });
  if (spans.length === 0) return [];

  const chunks: SourceSpan[][] = [];
  let current: SourceSpan[] = [];
  let currentCharacters = 0;

  for (const span of spans) {
    if (
      current.length > 0 &&
      currentCharacters + span.text.length > maxChunkChars
    ) {
      chunks.push(current);
      current = [];
      currentCharacters = 0;
    }
    current.push(span);
    currentCharacters += span.text.length;
  }
  if (current.length > 0) chunks.push(current);

  const totalCharacters = spans.reduce(
    (total, span) => total + span.text.length,
    0,
  );
  return chunks.map((chunk, index) =>
    JSON.stringify({
      manifest: {
        chunkIndex: index + 1,
        chunkCount: chunks.length,
        totalSpans: spans.length,
        totalCharacters,
      },
      spans: chunk,
    } satisfies SourceInput),
  );
}

export function parseSourceInputs(inputs: string[]): SourceInput {
  const parsed = inputs.map((input) => JSON.parse(input) as SourceInput);
  const spans = parsed.flatMap((input) => input.spans);
  return {
    manifest: {
      chunkIndex: 1,
      chunkCount: parsed.length,
      totalSpans: spans.length,
      totalCharacters: spans.reduce(
        (total, span) => total + span.text.length,
        0,
      ),
    },
    spans,
  };
}

function queryTerms(query: string): Set<string> {
  return new Set(
    query
      .toLowerCase()
      .match(/[\p{L}\p{N}]{3,}/gu)
      ?.filter(
        (term) =>
          !["this", "that", "with", "from", "what", "when", "where"].includes(
            term,
          ),
      ) ?? [],
  );
}

/**
 * Selects source spans for one question/section without renumbering them.
 * Matching spans are prioritized, then nearby spans are added for context.
 */
export function selectRelevantSource(
  source: SourceInput,
  query: string,
  maxCharacters = 120_000,
  preferredSpanIds: string[] = [],
): string {
  const terms = queryTerms(query);
  const scored = source.spans.map((span, index) => {
    const lower = span.text.toLowerCase();
    const score = [...terms].reduce(
      (total, term) => total + (lower.includes(term) ? 1 : 0),
      0,
    );
    return { span, index, score };
  });
  scored.sort((left, right) => right.score - left.score || left.index - right.index);

  const selected = new Map<number, SourceSpan>();
  let used = 0;
  const add = (index: number) => {
    const span = source.spans[index];
    if (!span || selected.has(index) || used + span.text.length > maxCharacters) {
      return;
    }
    selected.set(index, span);
    used += span.text.length;
  };

  const preferredIds = new Set(preferredSpanIds);
  source.spans.forEach((span, index) => {
    if (preferredIds.has(span.id)) {
      add(index - 1);
      add(index);
      add(index + 1);
    }
  });

  for (const match of scored) {
    if (used >= maxCharacters) break;
    add(match.index);
    if (match.score > 0) {
      add(match.index - 1);
      add(match.index + 1);
    }
  }

  const spans = [...selected.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, span]) => span);
  return JSON.stringify({
    manifest: {
      chunkIndex: 1,
      chunkCount: 1,
      totalSpans: source.manifest.totalSpans,
      totalCharacters: source.manifest.totalCharacters,
    },
    spans,
  } satisfies SourceInput);
}

export function sanitizeTextInput(text: string): string {
  return text
    .replace(/\0/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}
