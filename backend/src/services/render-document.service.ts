import katex from "katex";
import type { z } from "zod";
import type {
  assignmentSectionSchema,
  contentBlockSchema,
  questionPartSchema,
} from "../schema/result.schema";
import type { AnalysisOutput } from "../types/analysis-output.types";

type AssignmentSection = z.infer<typeof assignmentSectionSchema>;
type ContentBlock = z.infer<typeof contentBlockSchema>;
type QuestionPart = z.infer<typeof questionPartSchema>;

const HTML_ESCAPE_PATTERN = /[&<>"']/g;
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    HTML_ESCAPE_PATTERN,
    (character) => HTML_ENTITIES[character] ?? character,
  );
}

function renderInline(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderEquation(value: string): string {
  try {
    const normalized = value.replace(/\s*->\s*/g, " \\rightarrow ");
    return katex.renderToString(normalized, {
      displayMode: true,
      throwOnError: false,
      output: "mathml",
      strict: "ignore",
    });
  } catch {
    return `<code>${escapeHtml(value)}</code>`;
  }
}

function renderLegacyText(value: string): string {
  const groups = value.trim().split(/\n\s*\n/).filter(Boolean);
  return groups
    .map((group) => {
      const lines = group.split("\n").map((line) => line.trim()).filter(Boolean);
      const heading = lines[0]?.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        const level = Math.min(4, heading[1]?.length ?? 3);
        return `<h${level}>${renderInline(heading[2] ?? "")}</h${level}>`;
      }
      if (lines.every((line) => /^[-*•]\s+/.test(line))) {
        return `<ul>${lines
          .map((line) => `<li>${renderInline(line.replace(/^[-*•]\s+/, ""))}</li>`)
          .join("")}</ul>`;
      }
      return `<p>${lines.map(renderInline).join("<br>")}</p>`;
    })
    .join("");
}

function renderBlock(block: ContentBlock): string {
  const evidence =
    block.source_span_ids.length > 0
      ? `<span class="evidence">${block.source_span_ids.map(escapeHtml).join(", ")}</span>`
      : "";

  switch (block.type) {
    case "heading":
      return `<h${block.level}>${renderInline(block.content)}${evidence}</h${block.level}>`;
    case "paragraph":
      return `<p>${renderInline(block.content)}${evidence}</p>`;
    case "bullet_list":
      return `<ul>${block.items
        .map((item) => `<li>${renderInline(item)}</li>`)
        .join("")}</ul>${evidence}`;
    case "equation":
      return `<figure class="equation">${renderEquation(block.content)}${
        block.caption
          ? `<figcaption>${renderInline(block.caption)}</figcaption>`
          : ""
      }${evidence}</figure>`;
    case "table": {
      const columnCount = block.columns.length;
      return `<figure class="table-figure">${
        block.caption
          ? `<figcaption>${renderInline(block.caption)}</figcaption>`
          : ""
      }<table><thead><tr>${block.columns
        .map((column) => `<th>${renderInline(column)}</th>`)
        .join("")}</tr></thead><tbody>${block.rows
        .map(
          (row) =>
            `<tr>${Array.from({ length: columnCount }, (_, index) =>
              `<td>${renderInline(row[index] ?? "")}</td>`,
            ).join("")}</tr>`,
        )
        .join("")}</tbody></table>${evidence}</figure>`;
    }
    case "callout":
      return `<aside class="callout"><strong>${renderInline(block.title)}</strong><p>${renderInline(block.content)}</p>${evidence}</aside>`;
    case "diagram": {
      const nodes = block.content
        .split(/\s*(?:→|->)\s*/)
        .map((node) => node.trim())
        .filter(Boolean);
      return `<figure class="diagram"><div class="diagram-title">${renderInline(block.title)}</div><div class="flow">${nodes
        .map(
          (node, index) =>
            `${index > 0 ? '<span class="arrow">→</span>' : ""}<span class="node">${renderInline(node)}</span>`,
        )
        .join("")}</div><figcaption>${renderInline(block.caption)}</figcaption>${evidence}</figure>`;
    }
  }
}

function renderSourceNotes(section: AssignmentSection): string {
  if (section.source_references.length === 0) return "";
  return `<aside class="source-notes"><h4>Evidence used</h4><ol>${section.source_references
    .map(
      (reference) =>
        `<li><strong>${escapeHtml(reference.span_id)}</strong> ${renderInline(reference.excerpt)}</li>`,
    )
    .join("")}</ol></aside>`;
}

function renderAnalysisWarnings(data: AnalysisOutput): string {
  if (!data.warnings?.length) return "";
  return `<aside class="analysis-warnings">
    <h2>Items to review</h2>
    <ul>${data.warnings.map((warning) => `<li>${renderInline(warning)}</li>`).join("")}</ul>
  </aside>`;
}

function renderAssignment(data: AnalysisOutput): string {
  const assignment = data.assignment;
  if (!assignment) return "";
  const blueprint = assignment.blueprint;
  const sections = assignment.sections ?? [];

  return `
    <section class="cover">
      <div class="brand">HOMEWORK<span>AI</span></div>
      <div class="cover-rule"></div>
      <p class="eyebrow">${escapeHtml(blueprint.subject)}</p>
      <h1>${escapeHtml(assignment.title)}</h1>
      <p class="dek">${escapeHtml(blueprint.description)}</p>
      <dl class="cover-meta">
        <div><dt>Topic</dt><dd>${escapeHtml(blueprint.topic)}</dd></div>
        <div><dt>Audience</dt><dd>${escapeHtml(blueprint.audience)}</dd></div>
        <div><dt>Target length</dt><dd>${blueprint.target_word_count.toLocaleString()} words</dd></div>
      </dl>
    </section>
    <section class="toc page-break">
      <p class="eyebrow">Document map</p>
      <h2>Contents</h2>
      <p class="lead">${escapeHtml(blueprint.description)}</p>
      <ol>${blueprint.sections
        .map(
          (section, index) =>
            `<li><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(section.title)}</strong><small>${section.objectives.map(escapeHtml).join(" · ")}</small></div></li>`,
        )
        .join("")}</ol>
    </section>
    ${renderAnalysisWarnings(data)}
    ${sections
      .map((section, index) => {
        const plan = blueprint.sections.find(
          (candidate) => candidate.id === section.section_id,
        );
        const body =
          section.status === "needs_review"
            ? `<aside class="review-needed"><strong>Review needed</strong><p>${renderInline(section.error ?? "This section could not be generated reliably.")}</p></aside>`
            : section.blocks.length > 0
              ? section.blocks.map(renderBlock).join("")
              : renderLegacyText(section.content ?? "");
        return `<section class="chapter page-break">
          <header class="chapter-header">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <div><p class="eyebrow">${escapeHtml(blueprint.subject)}</p><h2>${escapeHtml(plan?.title ?? `Section ${index + 1}`)}</h2></div>
          </header>
          ${section.summary ? `<p class="chapter-summary">${renderInline(section.summary)}</p>` : ""}
          <article>${body}</article>
          ${renderSourceNotes(section)}
        </section>`;
      })
      .join("")}
  `;
}

function renderHomeworkPart(part: QuestionPart): string {
  const steps =
    part.steps.length > 0
      ? `<ol class="steps">${part.steps
          .map(
            (step) =>
              `<li><h4>${renderInline(step.title)}</h4><p>${renderInline(step.explanation)}</p>${
                step.equation
                  ? `<div class="step-equation">${renderEquation(step.equation)}</div>`
                  : ""
              }</li>`,
          )
          .join("")}</ol>`
      : renderLegacyText(part.workings ?? "");
  return `<section class="part">
    <div class="part-label">${escapeHtml(part.label)}</div>
    ${
      part.given.length > 0 || part.assumptions.length > 0
        ? `<div class="givens">${
            part.given.length > 0
              ? `<div><h4>Given</h4><ul>${part.given.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul></div>`
              : ""
          }${
            part.assumptions.length > 0
              ? `<div><h4>Assumptions</h4><ul>${part.assumptions.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul></div>`
              : ""
          }</div>`
        : ""
    }
    ${steps}
    <div class="answer"><span>Final answer</span><strong>${renderInline(part.answer)}</strong></div>
    ${part.verification ? `<div class="verification"><strong>Check</strong><p>${renderInline(part.verification)}</p></div>` : ""}
  </section>`;
}

function renderHomework(data: AnalysisOutput): string {
  return `
    <section class="homework-title">
      <div class="brand">HOMEWORK<span>AI</span></div>
      <p class="eyebrow">Guided solution</p>
      <h1>Homework analysis</h1>
      <p class="dek">A structured solution with explicit givens, reproducible steps, and an independent final check.</p>
      <small>Document ${escapeHtml(data.document_id)}</small>
    </section>
    ${renderAnalysisWarnings(data)}
    ${(data.questions ?? [])
      .map(
        (question, index) => `<section class="problem page-break">
          <header class="chapter-header"><span>${String(index + 1).padStart(2, "0")}</span><div><p class="eyebrow">${escapeHtml(question.qid)}</p><h2>${renderInline(question.question_text)}</h2></div></header>
          ${
            question.status === "needs_review"
              ? `<aside class="review-needed"><strong>Review needed</strong><p>${renderInline(question.error ?? "This question could not be solved reliably.")}</p></aside>`
              : question.parts.map(renderHomeworkPart).join("")
          }
        </section>`,
      )
      .join("")}
  `;
}

const DOCUMENT_STYLES = `
  :root{--ink:#172033;--muted:#64748b;--line:#dbe3ee;--soft:#f3f6fa;--brand:#3757d5;--brand2:#7c3aed}
  *{box-sizing:border-box}
  @page{size:A4;margin:18mm}
  html{font-family:Arial,"Noto Sans",sans-serif;color:var(--ink);font-size:10.5pt;line-height:1.62}
  body{margin:0;background:white}
  .sheet{padding:0}
  .page-break{break-before:page}
  .cover{min-height:250mm;padding:30mm 8mm 20mm;display:flex;flex-direction:column;justify-content:center}
  .brand{font-size:11pt;font-weight:900;letter-spacing:.16em;color:var(--ink);margin-bottom:25mm}.brand span{color:var(--brand)}
  .cover-rule{height:3px;width:24mm;background:linear-gradient(90deg,var(--brand),var(--brand2));margin-bottom:10mm}
  .eyebrow{text-transform:uppercase;letter-spacing:.17em;color:var(--brand);font-weight:800;font-size:8.5pt;margin:0 0 4mm}
  h1{font-size:34pt;line-height:1.06;letter-spacing:-.035em;margin:0 0 7mm;max-width:155mm}
  .dek{font-size:14pt;line-height:1.5;color:var(--muted);max-width:145mm;margin:0}
  .cover-meta{display:grid;grid-template-columns:1.2fr 1fr .8fr;gap:6mm;margin:24mm 0 0;border-top:1px solid var(--line);padding-top:7mm}
  .cover-meta div{min-width:0}.cover-meta dt{font-size:7.5pt;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);font-weight:700}.cover-meta dd{margin:1.5mm 0 0;font-weight:700}
  .toc,.chapter,.problem{padding:15mm 8mm 10mm}
  .toc h2,.chapter h2,.problem h2{font-size:24pt;line-height:1.15;letter-spacing:-.025em;margin:0}
  .lead,.chapter-summary{font-size:12.5pt;color:var(--muted);border-left:3px solid var(--brand);padding-left:5mm;margin:8mm 0 12mm}
  .toc>ol{list-style:none;padding:0;margin:12mm 0 0}.toc>ol>li{display:flex;gap:5mm;padding:5mm 0;border-bottom:1px solid var(--line);break-inside:avoid}
  .toc>ol>li>span{font:700 9pt monospace;color:var(--brand)}.toc small{display:block;color:var(--muted);margin-top:1mm}
  .chapter-header{display:grid;grid-template-columns:16mm 1fr;gap:5mm;align-items:start;border-bottom:1px solid var(--line);padding-bottom:7mm;margin-bottom:10mm}
  .chapter-header>span{font:700 11pt monospace;color:white;background:linear-gradient(135deg,var(--brand),var(--brand2));border-radius:4mm;padding:4mm 2mm;text-align:center}
  article p{margin:0 0 5mm;text-align:justify;orphans:3;widows:3}article h3,article h4{break-after:avoid;margin:9mm 0 3mm;line-height:1.25}article h3{font-size:16pt}article h4{font-size:12.5pt}
  article ul,.part ul{padding-left:6mm;margin:2mm 0 6mm}article li,.part li{margin-bottom:2mm}
  code{font-family:"DejaVu Sans Mono",monospace;background:#eef2f7;padding:.2em .4em;border-radius:3px;font-size:.9em}
  .evidence{display:inline-block;margin-left:2mm;color:var(--brand);background:#edf1ff;border-radius:99px;padding:.4mm 1.8mm;font:700 6.8pt monospace;vertical-align:middle}
  figure{break-inside:avoid;margin:7mm 0}figcaption{font-size:8.5pt;color:var(--muted);margin-top:2mm}
  .equation,.step-equation{background:var(--soft);border:1px solid var(--line);border-radius:4mm;padding:5mm;text-align:center;overflow-wrap:anywhere}
  .table-figure{overflow:hidden;border:1px solid var(--line);border-radius:3mm}.table-figure figcaption{padding:3mm 4mm;margin:0;background:var(--soft);font-weight:700;color:var(--ink)}
  table{width:100%;border-collapse:collapse;font-size:9pt}th{background:#e8edfb;text-align:left}th,td{padding:2.7mm 3mm;border-top:1px solid var(--line);vertical-align:top}
  .callout{break-inside:avoid;background:#eef2ff;border-left:4px solid var(--brand);padding:5mm 6mm;border-radius:0 3mm 3mm 0;margin:7mm 0}.callout p{margin:1mm 0 0;text-align:left}
  .diagram{border:1px solid var(--line);border-radius:4mm;padding:5mm;background:linear-gradient(145deg,#f8fafc,#eef2ff)}.diagram-title{font-weight:800;margin-bottom:4mm}.flow{display:flex;align-items:center;justify-content:center;gap:2mm;flex-wrap:wrap}.node{background:white;border:1px solid #b9c5e8;padding:3mm 4mm;border-radius:3mm;font-weight:700;max-width:40mm;text-align:center}.arrow{color:var(--brand);font-size:16pt;font-weight:900}
  .source-notes{break-inside:avoid;margin-top:12mm;padding:5mm;background:#f8fafc;border-top:2px solid var(--line)}.source-notes h4{margin:0 0 3mm;text-transform:uppercase;letter-spacing:.12em;font-size:8pt}.source-notes ol{margin:0;padding-left:6mm;color:var(--muted);font-size:8.5pt}.source-notes li{margin-bottom:2mm}
  .homework-title{padding:22mm 8mm 8mm}.homework-title h1{font-size:30pt}.homework-title small{display:block;margin-top:10mm;color:var(--muted);font-family:monospace}
  .part{position:relative;margin:8mm 0 12mm;padding-left:12mm}.part-label{position:absolute;left:0;top:0;background:var(--ink);color:white;border-radius:99px;padding:1.2mm 2.5mm;font-weight:800}
  .givens{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-bottom:6mm}.givens>div{background:var(--soft);border-radius:3mm;padding:4mm}.givens h4{margin:0 0 2mm;font-size:8pt;text-transform:uppercase;letter-spacing:.12em}
  .steps{list-style:none;counter-reset:steps;padding:0;margin:0}.steps>li{counter-increment:steps;position:relative;padding:0 0 6mm 10mm;border-left:1px solid var(--line);break-inside:avoid}.steps>li:before{content:counter(steps);position:absolute;left:-3.4mm;top:0;width:6.5mm;height:6.5mm;border-radius:50%;background:white;border:2px solid var(--brand);color:var(--brand);font:700 8pt Arial;text-align:center;line-height:5.6mm}.steps h4{margin:0 0 1mm}.steps p{margin:0}
  .answer{break-inside:avoid;background:linear-gradient(135deg,#172033,#293958);color:white;border-radius:4mm;padding:5mm 6mm;margin:3mm 0}.answer span{display:block;text-transform:uppercase;letter-spacing:.14em;color:#b9c7e6;font-size:7.5pt;font-weight:700;margin-bottom:1.5mm}.answer strong{font-size:13pt}
  .verification{break-inside:avoid;border:1px solid #b8e1cf;background:#f0fdf7;border-radius:3mm;padding:4mm 5mm;margin-top:4mm}.verification strong{color:#08724b;text-transform:uppercase;letter-spacing:.12em;font-size:7.5pt}.verification p{margin:1mm 0 0}
  .analysis-warnings,.review-needed{break-inside:avoid;border:1px solid #f3c77a;background:#fffbeb;border-radius:3mm;padding:5mm 6mm;color:#713f12}
  .analysis-warnings{margin:8mm}.analysis-warnings h2{font-size:13pt;margin:0 0 2mm}.analysis-warnings ul{margin:0;padding-left:5mm}.analysis-warnings li{margin-bottom:1mm}
  .review-needed{margin:6mm 0}.review-needed strong{display:block;text-transform:uppercase;letter-spacing:.12em;font-size:8pt}.review-needed p{margin:2mm 0 0}
  math{font-size:1.1em}
`;

export function buildAnalysisDocumentHtml(data: AnalysisOutput): string {
  const title =
    data.assignment?.title ??
    (data.type === "homework" ? "Homework analysis" : "Academic assignment");
  const body =
    data.type === "assignment" && data.assignment
      ? renderAssignment(data)
      : renderHomework(data);

  return `<!doctype html>
  <html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${DOCUMENT_STYLES}</style></head>
  <body><main class="sheet">${body}</main></body></html>`;
}
