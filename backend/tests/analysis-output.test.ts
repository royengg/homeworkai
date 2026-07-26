import { makeLLMInputFromText } from "../src/utils/format.utils";
import { resultSchema } from "../src/schema/result.schema";
import { buildAnalysisDocumentHtml } from "../src/services/render-document.service";
import {
  countSectionWords,
  inferRequiredBlockTypes,
  normalizeGeneratedSection,
} from "../src/utils/analysis-normalization.util";
import {
  getPdfExportKey,
  getPdfExportPrefixes,
} from "../src/utils/export-key.util";

describe("analysis output contracts", () => {
  it("creates complete, stable source spans within the total character budget", () => {
    const input = JSON.parse(
      makeLLMInputFromText(
        [
          "Photosynthesis converts light energy into chemical energy.",
          "Chlorophyll absorbs light in plant chloroplasts.",
          "Glucose stores part of the captured energy.",
        ].join("\n"),
        { maxSpanLength: 60, maxTotalChars: 100 },
      ),
    );

    expect(input.spans.length).toBeGreaterThan(0);
    expect(input.spans[0].id).toBe("S0001");
    expect(
      input.spans.reduce(
        (total: number, span: { text: string }) => total + span.text.length,
        0,
      ),
    ).toBeLessThanOrEqual(100);
    expect(() => JSON.stringify(input)).not.toThrow();
  });

  it("continues long pasted lines instead of dropping their final instructions", () => {
    const longLine = `${"source ".repeat(160)}Include a process diagram and a table.`;
    const input = JSON.parse(
      makeLLMInputFromText(longLine, {
        maxSpanLength: 100,
        maxTotalChars: 2_000,
      }),
    );

    expect(input.spans.length).toBeGreaterThan(1);
    expect(input.spans.at(-1).text).toContain("diagram and a table");
  });

  it("keeps previously stored slim results readable", () => {
    const legacy = resultSchema.parse({
      document_id: "legacy-1",
      type: "homework",
      questions: [
        {
          qid: "Q1",
          question_text: "Solve x + 1 = 3.",
          parts: [{ label: "(a)", answer: "x = 2", workings: "Subtract 1." }],
        },
      ],
    });

    expect(legacy.questions?.[0]?.parts[0]?.steps).toEqual([]);
    expect(legacy.questions?.[0]?.parts[0]?.workings).toBe("Subtract 1.");
  });

  it("renders structured assignment blocks and escapes source content", () => {
    const result = resultSchema.parse({
      document_id: "assignment-test",
      type: "assignment",
      assignment: {
        title: "Photosynthesis <script>alert(1)</script>",
        blueprint: {
          title: "Photosynthesis",
          description: "A short evidence-based explanation.",
          subject: "Biology",
          topic: "Energy conversion",
          audience: "Secondary school",
          target_word_count: 500,
          source_scope: "source_only",
          sections: [
            {
              id: "mechanism",
              title: "Mechanism",
              objectives: ["Explain the process"],
              key_points: ["Inputs and outputs"],
              target_word_count: 250,
            },
            {
              id: "importance",
              title: "Importance",
              objectives: ["Evaluate importance"],
              key_points: ["Food webs"],
              target_word_count: 250,
            },
          ],
        },
        sections: [
          {
            section_id: "mechanism",
            summary: "Light is converted into stored chemical energy.",
            blocks: [
              {
                type: "paragraph",
                content: "Chlorophyll absorbs light.",
                source_span_ids: ["S0001"],
              },
              {
                type: "diagram",
                title: "Energy flow",
                content: "Light → Chloroplast → Glucose",
                caption: "Simplified energy transformation.",
                source_span_ids: ["S0001"],
              },
              {
                type: "table",
                columns: ["Input", "Output"],
                rows: [["Light", "Chemical energy"]],
                caption: "Process summary",
                source_span_ids: ["S0001"],
              },
            ],
            source_references: [
              { span_id: "S0001", excerpt: "Chlorophyll absorbs light." },
            ],
          },
        ],
      },
    });

    const html = buildAnalysisDocumentHtml(result);
    expect(html).toContain("Light");
    expect(html).toContain("S0001");
    expect(html).toContain("<table>");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("normalizes equivalent provider block fields before strict validation", () => {
    const section = normalizeGeneratedSection({
      section_id: "intro",
      summary: "A concise introduction.",
      blocks: [
        {
          type: "heading",
          title: "Introduction",
          source_span_ids: ["S0001"],
        },
        {
          type: "callout",
          content: "This is the key point.",
          source_span_ids: ["S0001"],
        },
        {
          type: "table",
          content: "Input | Output\nLight | Chemical energy",
          caption: "Energy conversion",
          source_span_ids: ["S0001"],
        },
      ],
      source_references: [
        { span_id: "S0001", excerpt: "A short source excerpt." },
      ],
    });

    expect(section.blocks).toEqual([
      {
        type: "heading",
        content: "Introduction",
        level: 3,
        source_span_ids: ["S0001"],
      },
      {
        type: "callout",
        title: "Key point",
        content: "This is the key point.",
        source_span_ids: ["S0001"],
      },
      {
        type: "table",
        columns: ["Input", "Output"],
        rows: [["Light", "Chemical energy"]],
        caption: "Energy conversion",
        source_span_ids: ["S0001"],
      },
    ]);
    expect(countSectionWords(section)).toBeGreaterThan(5);
  });

  it("deterministically preserves explicit presentation requirements", () => {
    expect(
      inferRequiredBlockTypes(
        '{"spans":[{"id":"S0001","text":"Include a process diagram and a table. Show the balanced equation."}]}',
        ["heading", "paragraph", "equation"],
      ),
    ).toEqual(["equation", "table", "diagram"]);
  });

  it("versions new PDF keys while retaining legacy cleanup coverage", () => {
    expect(getPdfExportKey("upload-1", "analysis-1")).toBe(
      "exports/v2/upload-1/analysis-1.pdf",
    );
    expect(getPdfExportPrefixes("upload-1")).toEqual([
      "exports/upload-1/",
      "exports/v2/upload-1/",
    ]);
  });
});
