import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { motion } from "framer-motion";
import {
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  TableProperties,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import type {
  AnalysisOutput,
  AssignmentSection,
  ContentBlock,
  QuestionPart,
} from "@/lib/types";

function AnalysisWarnings({ warnings }: { warnings: string[] | undefined }) {
  if (!warnings?.length) return null;
  const uniqueWarnings = [...new Set(warnings)];
  return (
    <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" />
        Completed with review notes
      </div>
      <ul className="mt-3 space-y-1 pl-5 text-xs leading-5">
        {uniqueWarnings.map((warning) => (
          <li key={warning} className="list-disc">
            {warning}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Equation({ value }: { value: string }) {
  const markup = useMemo(
    () =>
      katex.renderToString(value.replace(/\s*->\s*/g, " \\rightarrow "), {
        displayMode: true,
        throwOnError: false,
        strict: "ignore",
      }),
    [value],
  );

  return (
    <div
      className="overflow-x-auto py-2 text-center"
      // KaTeX escapes untrusted input and returns library-owned markup.
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

function Evidence({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <span
      className="ml-2 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 align-middle font-mono text-[9px] font-semibold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"
      title="Source spans supporting this content"
    >
      {ids.join(", ")}
    </span>
  );
}

function ContentBlockView({ block }: { block: ContentBlock }) {
  const evidence = <Evidence ids={block.source_span_ids} />;

  switch (block.type) {
    case "heading":
      return block.level === 4 ? (
        <h4 className="mt-8 text-lg font-semibold tracking-tight">
          {block.content}
          {evidence}
        </h4>
      ) : (
        <h3 className="mt-10 text-2xl font-semibold tracking-tight">
          {block.content}
          {evidence}
        </h3>
      );
    case "paragraph":
      return (
        <p className="text-[15px] leading-8 text-zinc-700 dark:text-zinc-200">
          {block.content}
          {evidence}
        </p>
      );
    case "bullet_list":
      return (
        <div>
          <ul className="space-y-3 pl-1">
            {block.items.map((item, index) => (
              <li
                key={`${index}-${item.slice(0, 24)}`}
                className="flex items-start gap-3 text-[15px] leading-7 text-zinc-700 dark:text-zinc-200"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {evidence}
        </div>
      );
    case "equation":
      return (
        <figure className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-800/70">
          <Equation value={block.content} />
          {block.caption ? (
            <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
              {block.caption}
            </figcaption>
          ) : null}
          {evidence}
        </figure>
      );
    case "table":
      return (
        <figure className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
          {block.caption ? (
            <figcaption className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <TableProperties className="h-4 w-4" />
              {block.caption}
            </figcaption>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-indigo-50 text-indigo-950 dark:bg-indigo-950/50 dark:text-indigo-100">
                <tr>
                  {block.columns.map((column) => (
                    <th key={column} className="px-4 py-3 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-t border-zinc-100 dark:border-zinc-800"
                  >
                    {block.columns.map((_, columnIndex) => (
                      <td key={columnIndex} className="px-4 py-3 align-top">
                        {row[columnIndex] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-3">{evidence}</div>
        </figure>
      );
    case "callout":
      return (
        <aside className="rounded-r-2xl border-l-4 border-indigo-500 bg-indigo-50/70 p-5 dark:bg-indigo-950/30">
          <div className="flex items-center gap-2 font-semibold text-indigo-950 dark:text-indigo-100">
            <Lightbulb className="h-4 w-4" />
            {block.title}
          </div>
          <p className="mt-2 text-sm leading-7 text-indigo-950/80 dark:text-indigo-100/80">
            {block.content}
          </p>
          {evidence}
        </aside>
      );
    case "diagram": {
      const nodes = block.content
        .split(/\s*(?:→|->)\s*/)
        .map((node) => node.trim())
        .filter(Boolean);
      return (
        <figure className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-indigo-50 p-6 dark:border-zinc-700 dark:from-zinc-800 dark:to-indigo-950/40">
          <div className="font-semibold">{block.title}</div>
          <div className="my-5 flex flex-wrap items-center justify-center gap-3">
            {nodes.map((node, index) => (
              <div key={`${index}-${node}`} className="contents">
                {index > 0 ? (
                  <ChevronRight className="h-5 w-5 text-indigo-500" />
                ) : null}
                <div className="max-w-44 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-center text-sm font-medium shadow-sm dark:border-indigo-800 dark:bg-zinc-900">
                  {node}
                </div>
              </div>
            ))}
          </div>
          <figcaption className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            {block.caption}
          </figcaption>
          {evidence}
        </figure>
      );
    }
  }
}

function LegacySectionContent({ content }: { content: string }) {
  return (
    <>
      {content
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((paragraph, index) => (
          <p
            key={`${index}-${paragraph.slice(0, 24)}`}
            className="text-[15px] leading-8 text-zinc-700 dark:text-zinc-200"
          >
            {paragraph}
          </p>
        ))}
    </>
  );
}

function SourceNotes({ section }: { section: AssignmentSection }) {
  const sources =
    section.source_references ??
    section.citations?.map((excerpt, index) => ({
      span_id: `Reference ${index + 1}`,
      excerpt,
    })) ??
    [];
  if (sources.length === 0) return null;

  return (
    <aside className="mt-12 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-800/50">
      <h4 className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-300">
        <BookOpenCheck className="h-4 w-4" /> Evidence used
      </h4>
      <ol className="space-y-3">
        {sources.map((source) => (
          <li
            key={`${source.span_id}-${source.excerpt}`}
            className="grid grid-cols-[auto_1fr] gap-3 text-xs leading-6 text-zinc-600 dark:text-zinc-300"
          >
            <span className="rounded-md bg-white px-2 py-1 font-mono font-semibold text-indigo-600 shadow-sm dark:bg-zinc-900 dark:text-indigo-300">
              {source.span_id}
            </span>
            <span>{source.excerpt}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function AssignmentView({ content }: { content: AnalysisOutput }) {
  const assignment = content.assignment;
  if (!assignment) return null;
  const planById = new Map(
    assignment.blueprint.sections.map((section) => [section.id, section]),
  );

  return (
    <div className="space-y-16 pb-20">
      <AnalysisWarnings warnings={content.warnings} />
      <header className="space-y-5 border-b border-zinc-200 pb-12 text-center dark:border-zinc-700">
        <Badge
          variant="outline"
          className="border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
        >
          Reviewed assignment
        </Badge>
        <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground md:text-5xl">
          {assignment.title}
        </h1>
        <p className="mx-auto max-w-3xl text-lg font-medium leading-relaxed text-muted-foreground">
          {assignment.blueprint.description}
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          {assignment.blueprint.subject ? (
            <span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800">
              {assignment.blueprint.subject}
            </span>
          ) : null}
          {assignment.blueprint.target_word_count ? (
            <span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800">
              Target: {assignment.blueprint.target_word_count.toLocaleString()} words
            </span>
          ) : null}
        </div>
      </header>

      <div className="space-y-24">
        {assignment.sections?.map((section, index) => {
          const plan = planById.get(section.section_id);
          return (
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              key={section.section_id}
              className="relative"
            >
              <header className="mb-10 grid grid-cols-[auto_1fr] gap-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {index + 1}
                </div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    {plan?.title ?? `Section ${index + 1}`}
                  </h2>
                  {section.summary ? (
                    <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                      {section.summary}
                    </p>
                  ) : null}
                </div>
              </header>

              {section.status === "needs_review" ? (
                <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <strong>This section needs review.</strong>
                    <p className="mt-1 text-xs leading-5 opacity-80">
                      {section.error ??
                        "A reliable structured section could not be generated."}
                    </p>
                  </div>
                </div>
              ) : (
                <article className="space-y-6">
                  {section.blocks && section.blocks.length > 0 ? (
                    section.blocks.map((block, blockIndex) => (
                      <ContentBlockView
                        key={`${blockIndex}-${block.type}`}
                        block={block}
                      />
                    ))
                  ) : (
                    <LegacySectionContent content={section.content ?? ""} />
                  )}
                </article>
              )}

              {section.status !== "needs_review" && section.verification ? (
                <div className="mt-8 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <strong>
                      {section.verification.status === "revised"
                        ? "Reviewed and revised"
                        : "Quality verified"}
                    </strong>
                    {section.verification.issues_fixed.length > 0 ? (
                      <p className="mt-1 text-xs opacity-80">
                        {section.verification.issues_fixed.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <SourceNotes section={section} />
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}

function HomeworkPart({ part }: { part: QuestionPart }) {
  return (
    <section className="relative space-y-6">
      <div className="absolute -left-[21px] top-4 h-2 w-2 rounded-full bg-zinc-900 dark:bg-zinc-100 md:-left-[45px]" />
      <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">
        Part {part.label}
      </span>

      {part.given?.length || part.assumptions?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {part.given?.length ? (
            <div className="rounded-2xl bg-zinc-50 p-5 dark:bg-zinc-800/60">
              <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Given
              </h4>
              <ul className="space-y-2 text-sm">
                {part.given.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {part.assumptions?.length ? (
            <div className="rounded-2xl bg-amber-50 p-5 dark:bg-amber-950/20">
              <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                Assumptions
              </h4>
              <ul className="space-y-2 text-sm">
                {part.assumptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {part.steps && part.steps.length > 0 ? (
        <ol className="space-y-5">
          {part.steps.map((step, index) => (
            <li key={`${index}-${step.title}`} className="grid grid-cols-[auto_1fr] gap-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-indigo-500 text-xs font-bold text-indigo-600">
                {index + 1}
              </span>
              <div>
                <h4 className="font-semibold">{step.title}</h4>
                <p className="mt-1 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  {step.explanation}
                </p>
                {step.equation ? (
                  <div className="mt-3 rounded-xl bg-zinc-50 px-4 dark:bg-zinc-800">
                    <Equation value={step.equation} />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : part.workings ? (
        <LegacySectionContent content={part.workings} />
      ) : null}

      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-7 text-white dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-900">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">
          Final answer
        </span>
        <p className="mt-2 text-xl font-bold leading-relaxed">{part.answer}</p>
      </div>

      {part.verification ? (
        <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Independent check</strong>
            <p className="mt-1 leading-6 opacity-80">{part.verification}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function HomeworkView({ content }: { content: AnalysisOutput }) {
  return (
    <div className="space-y-16">
      <AnalysisWarnings warnings={content.warnings} />
      {content.questions?.map((question, questionIndex) => (
        <motion.section
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: questionIndex * 0.08 }}
          key={question.qid}
          className="space-y-10"
        >
          <header className="flex items-start gap-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-lg font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
              {question.qid.replace(/Q/i, "")}
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Problem analysis
              </span>
              <h3 className="mt-1 text-2xl font-bold tracking-tight">
                {question.question_text}
              </h3>
            </div>
          </header>
          {question.status === "needs_review" ? (
            <div className="ml-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>This question needs review.</strong>
                <p className="mt-1 text-xs leading-5 opacity-80">
                  {question.error ??
                    "A reliable structured solution could not be generated."}
                </p>
              </div>
            </div>
          ) : (
            <div className="ml-6 space-y-12 border-l border-zinc-200 pl-4 dark:border-zinc-700 md:pl-10">
              {question.parts.map((part, index) => (
                <HomeworkPart key={`${index}-${part.label}`} part={part} />
              ))}
            </div>
          )}
          {questionIndex < (content.questions?.length ?? 0) - 1 ? (
            <Separator className="opacity-40" />
          ) : null}
        </motion.section>
      ))}
    </div>
  );
}

export function AnalysisRenderer({ content }: { content: AnalysisOutput }) {
  if (content.type === "assignment" && content.assignment) {
    return <AssignmentView content={content} />;
  }
  if (content.type === "homework" && content.questions?.length) {
    return <HomeworkView content={content} />;
  }
  return (
    <div className="rounded-3xl border border-zinc-200 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
      No structured analysis is available for this document.
    </div>
  );
}
