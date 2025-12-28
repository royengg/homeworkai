import pdfkit from "pdfkit";
import { PassThrough } from "stream";
import { AnalysisOutput } from "../types/analysis-output.types";

function sanitizeForPdf(text: string): string {
  if (!text) return "";
  return String(text)
    .replace(/[^\x00-\x7F\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2192]/g, " ")
    .replace(/\r\n/g, "\n");
}

function renderMarkdown(doc: PDFKit.PDFDocument, text: string) {
  const lines = text.split("\n");
  
  lines.forEach((line) => {
    let trimmed = line.trim();
    if (!trimmed) {
      doc.moveDown(0.5);
      return;
    }

    const headerMatch = trimmed.match(/^(#{1,6})\s*(.*)$/);
    if (headerMatch && headerMatch[1] && headerMatch[2]) {
      const level = headerMatch[1].length;
      const titleText = headerMatch[2].trim();
      
      const sizes = [11, 24, 20, 16, 14, 12, 11];
      const colors: string[] = ["#000000", "#000000", "#111827", "#1F2937", "#374151", "#4B5563", "#4B5563"];
      
      doc.fontSize(sizes[level] || 11)
         .font("Helvetica-Bold")
         .fillColor(colors[level] || "#000000");
         
      renderInlineMarkdown(doc, sanitizeForPdf(titleText), { lineGap: 2 });
      doc.moveDown(0.5);
      return;
    }

    if (trimmed.startsWith("[DIAGRAM:") || trimmed.startsWith("```mermaid") || (trimmed.startsWith("[") && trimmed.endsWith("]Diagram]"))) {
      renderDiagramPlaceholder(doc, trimmed);
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      const bulletLevel = line.search(/\S/);
      const bulletText = trimmed.replace(/^[-*•]\s*/, "");
      
      doc.fontSize(11).font("Helvetica").fillColor("#374151");
      renderInlineMarkdown(doc, sanitizeForPdf(bulletText), { 
        indent: bulletLevel + 15, 
        bullet: "• ",
        align: "left"
      });
      doc.moveDown(0.2);
      return;
    } 

    doc.fontSize(11).font("Helvetica").fillColor("#374151");
    renderInlineMarkdown(doc, sanitizeForPdf(trimmed), { align: "left" });
    doc.moveDown(0.6);
  });
}

function renderDiagramPlaceholder(doc: PDFKit.PDFDocument, text: string) {
  const label = text.replace(/\[DIAGRAM:|\]|```mermaid|```|Diagram/g, "").trim() || "Technical Diagram";
  
  doc.moveDown(0.5);
  const width = doc.page.width - 100;
  const height = 110;

  if (doc.y + height > doc.page.height - 50) {
    doc.addPage();
  }

  const currentY = doc.y;
  
  doc.roundedRect(50, currentY, width, height, 6).fillColor("#F9FAFB").fill();
  doc.roundedRect(50, currentY, width, height, 6).lineWidth(0.5).strokeColor("#D1D5DB").stroke();
  
  doc.circle(50 + width / 2, currentY + 35, 12).lineWidth(1.5).strokeColor("#3B82F6").stroke();
  doc.moveTo(50 + width / 2 - 8, currentY + 35).lineTo(50 + width / 2 + 8, currentY + 35).stroke();
  doc.moveTo(50 + width / 2, currentY + 35 - 8).lineTo(50 + width / 2, currentY + 35 + 8).stroke();
  
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#111827").text(label.toUpperCase(), 50, currentY + 60, { align: "center", width });
  doc.fontSize(7).font("Helvetica-Oblique").fillColor("#6B7280").text("[ Logic Flowchart & Technical Architecture Visualization ]", 50, currentY + 75, { align: "center", width });
  doc.fontSize(7).font("Helvetica").fillColor("#9CA3AF").text("Figure: Conceptual Diagram representing " + label, 50, currentY + 90, { align: "center", width });
  
  doc.x = 50;
  doc.y = currentY + height + 15;
}

function renderInlineMarkdown(doc: PDFKit.PDFDocument, text: string, options: any) {
  const normalized = text.replace(/__/g, "**");
  const parts = normalized.split("**");
  
  const marginOffset = options.indent || 0;
  const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right - marginOffset;
  
  const baseOptions = { 
    lineGap: 2.5, 
    width: availableWidth,
    ...options 
  };
  
  if (options.bullet) {
    doc.text(options.bullet, { ...baseOptions, continued: true });
  }

  parts.forEach((part, i) => {
    const isBold = i % 2 === 1;
    const isLast = i === parts.length - 1;
    
    if (part === "" && !isLast) return;

    doc.font(isBold ? "Helvetica-Bold" : "Helvetica");
    doc.text(part, { ...baseOptions, continued: !isLast });
  });

  if (parts.length > 0 && !options.continued) {
    doc.moveDown(0.2);
  }
}

export function renderOutputToPdfStream(data: any) {
  const doc = new pdfkit({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
  });

  const stream = new PassThrough();
  doc.pipe(stream);

  const isAssignment = data.type === 'assignment' || !!data.assignment;

  if (isAssignment && data.assignment) {
    const { assignment } = data;
    
    doc.rect(0, 0, doc.page.width, doc.page.height).fillColor("#F9FAFB").fill();
    
    doc.fillColor("#1F2937");
    doc.fontSize(26).font("Helvetica-Bold").text(sanitizeForPdf(assignment.title || "Untitled Assignment"), 50, 220, { align: "center", width: doc.page.width - 100 });
    
    doc.moveDown(1.5);
    
    let subject = assignment.blueprint?.subject;
    let topic = assignment.blueprint?.topic;
    
    if (!subject && assignment.title?.includes(":")) {
      const parts = assignment.title.split(":");
      subject = parts[0].trim();
      topic = parts.slice(1).join(":").trim();
    }
    
    subject = subject || "Academic Research & Analysis";
    
    doc.fontSize(16).font("Helvetica").fillColor("#3B82F6").text(sanitizeForPdf(subject), { align: "center" });
    if (topic) {
      doc.moveDown(0.5);
      doc.fontSize(12).font("Helvetica-Oblique").fillColor("#6B7280").text(sanitizeForPdf(topic), { align: "center", width: doc.page.width - 120 });
    }
    
    doc.moveDown(2);
    doc.fontSize(11).font("Helvetica").fillColor("#4B5563").text("Academic Comprehensive Assignment Solution", { align: "center" });
    
    doc.moveTo(150, 400).lineTo(450, 400).lineWidth(1.5).strokeColor("#E5E7EB").stroke();
    
    doc.fontSize(10).fillColor("#9CA3AF").text(`Document Generated for Academic Purposes`, 0, 720, { align: "center", width: doc.page.width });
    doc.text(`Reference Date: ${new Date().toLocaleDateString()}`, { align: "center" });
    
    const contentfulSections = (assignment.sections && Array.isArray(assignment.sections)) 
      ? assignment.sections.filter((s: any) => s && s.content && s.content.trim().length > 0)
      : [];

    const hasBlueprintSections = assignment.blueprint?.sections && assignment.blueprint.sections.length > 0;

    if (hasBlueprintSections || contentfulSections.length > 0) {
      if (hasBlueprintSections) {
        doc.addPage();
        doc.fillColor("#000");
        doc.fontSize(22).font("Helvetica-Bold").text("Table of Contents").moveDown(1.5);
        
        assignment.blueprint.sections.forEach((s: any, i: number) => {
          doc.fontSize(12).font("Helvetica").fillColor("#374151");
          doc.text(`${i + 1}.`, { continued: true });
          doc.text(` ${sanitizeForPdf(s.title || 'Untitled Section')}`, { indent: 20 });
          doc.moveDown(0.5);
        });
      }

      if (contentfulSections.length > 0) {
        doc.addPage();
        contentfulSections.forEach((section: any, i: number) => {
          const blueprintSection = assignment.blueprint?.sections?.find((s: any) => s.id === section.section_id);
          
          doc.fontSize(24).font("Helvetica-Bold").fillColor("#111827").text(`${i + 1}. ${sanitizeForPdf(blueprintSection?.title || 'Section')}`).moveDown(1);
          
          renderMarkdown(doc, section.content);
          
          if (section.citations?.length) {
            doc.moveDown(2);
            doc.fontSize(10).font("Helvetica-Bold").fillColor("#4B5563").text("References & Citations");
            doc.rect(doc.x, doc.y - 2, 150, 1).fill("#E5E7EB");
            doc.moveDown(0.5);
            section.citations.forEach((c: any) => {
              if (c) {
                doc.fontSize(9).font("Helvetica").fillColor("#6B7280").text(`• ${sanitizeForPdf(c)}`, { indent: 15 }).moveDown(0.2);
              }
            });
          }
          
          if (i < contentfulSections.length - 1) {
            doc.addPage();
          }
        });
      }
    }
  } else {
    doc.fontSize(20).fillColor("#000").text("Homework Solution", { align: "center" }).moveDown(0.5);
    doc.fontSize(10).fillColor("#555").text(`Document ID: ${data.document_id}`, { align: "center" });
    doc.moveDown(1.5);

    for (const q of data.questions || []) {
      doc.font("Helvetica-Bold").fontSize(14).fillColor("#000").text(`${q.qid} — ${sanitizeForPdf(q.question_text)}`);
      doc.moveDown(0.4);

      for (const p of q.parts || []) {
        doc.font("Helvetica-Bold").fontSize(12).text(sanitizeForPdf(`${p.label} Answer: ${p.answer}`));
        doc.moveDown(0.2);
        
        if (p.workings) {
          renderMarkdown(doc, p.workings);
        }
      }
      doc.moveDown(0.8);
    }
  }

  const range = doc.bufferedPageRange();
  const docTitle = sanitizeForPdf(data.assignment?.title || data.document_id || "HomeworkAI Solution");
  
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    if (i > range.start) {
      doc.fontSize(8).fillColor("#9CA3AF").font("Helvetica").text(docTitle, 50, 30, { align: "left" });
      doc.rect(50, 42, doc.page.width - 100, 0.5).fill("#E5E7EB");
    }

    doc.fontSize(8).fillColor("#9CA3AF").font("Helvetica").text(
      `HomeworkAI v2.3 Optimized • Page ${i + 1} of ${range.count}`, 
      0, 
      doc.page.height - 35, 
      { align: "center", width: doc.page.width, lineBreak: false }
    );

    doc.page.margins.bottom = originalBottomMargin;
  }

  doc.end();

  const done = new Promise<{ pages: number }>((resolve, reject) => {
    stream.on("finish", () => resolve({ pages: range.count }));
    stream.on("error", reject);
  });

  return { stream, done };
}

export async function renderSlimToPdfBuffer(data: any) {
  const { stream, done } = renderOutputToPdfStream(data);
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    stream.on("data", (c) =>
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
    );
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  const { pages } = await done;
  return { buffer: Buffer.concat(chunks), pages };
}
