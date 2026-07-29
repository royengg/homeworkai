jest.mock("../src/services/analyze.service", () => ({
  extractHomeworkQuestions: jest.fn(),
  solveHomeworkQuestion: jest.fn(),
  generateBlueprint: jest.fn(),
  refineBlueprint: jest.fn(),
  generateSection: jest.fn(),
  reviewAssignmentSection: jest.fn(),
}));

jest.mock("../src/db/prisma.db", () => {
  const analysisResult = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  };
  return {
    prisma: { analysisResult },
  };
});

import { processAnalyzeJob } from "../src/processors/analyze.processor";
import {
  extractHomeworkQuestions,
  generateBlueprint,
  generateSection,
  reviewAssignmentSection,
  solveHomeworkQuestion,
} from "../src/services/analyze.service";
import { prisma } from "../src/db/prisma.db";
import type { Job } from "bullmq";

const VALID_ANALYSIS_ID = "550e8400-e29b-41d4-a716-446655440001";
const VALID_UPLOAD_ID = "550e8400-e29b-41d4-a716-446655440002";

function makeJob(data: any): Job<any> {
  return { data, id: "job-1", updateProgress: jest.fn() } as unknown as Job<any>;
}

function analysisFixture(status = "queued", output: unknown = {}) {
  return {
    id: VALID_ANALYSIS_ID,
    status,
    uploadId: VALID_UPLOAD_ID,
    output,
    model: null,
    usagePromptTokens: null,
    usageCompletionTokens: null,
    usageTotalTokens: null,
    upload: {
      uploadId: VALID_UPLOAD_ID,
      bucket: "test",
      key: "question.pdf",
      mime: "application/pdf",
      parseResult: {
        text: "Question 1: What is 2 + 2?\nQuestion 2: What is 3 + 3?",
        diagnostics: {
          visualFallbackRecommended: false,
          warnings: [],
        },
      },
    },
  };
}

function successfulSolution(answer = "4") {
  return {
    data: {
      parts: [
        {
          label: "(a)",
          given: [],
          assumptions: [],
          steps: [{ title: "Add", explanation: "Add the values." }],
          answer,
          verification: "Checked.",
          source_span_ids: ["S0001"],
        },
      ],
    },
    usage: null,
    model: "test-model",
  };
}

function assignmentBlueprint() {
  return {
    title: "Short assignment",
    description: "Explain two source topics.",
    subject: "General studies",
    topic: "Source topics",
    audience: "Student",
    target_word_count: 300,
    source_scope: "source_only",
    required_block_types: [],
    sections: [
      {
        id: "first",
        title: "First topic",
        objectives: ["Explain the first topic"],
        key_points: ["First"],
        target_word_count: 100,
      },
      {
        id: "second",
        title: "Second topic",
        objectives: ["Explain the second topic"],
        key_points: ["Second"],
        target_word_count: 100,
      },
    ],
  };
}

function successfulSection(sectionId: string) {
  return {
    data: {
      section_id: sectionId,
      summary: "A source-based explanation.",
      blocks: [
        {
          type: "paragraph",
          content: Array.from(
            { length: 90 },
            (_, index) => `source${index + 1}`,
          ).join(" "),
          source_span_ids: ["S0001"],
        },
      ],
      source_references: [],
    },
    usage: null,
    model: "test-model",
  };
}

describe("processAnalyzeJob", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.analysisResult.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.analysisResult.update as jest.Mock).mockResolvedValue({});
    (extractHomeworkQuestions as jest.Mock).mockResolvedValue({
      data: {
        questions: [
          {
            question_text: "What is 2 + 2?",
            source_span_ids: ["S0001"],
          },
        ],
        warnings: [],
      },
      usage: null,
      model: "test-model",
    });
    (solveHomeworkQuestion as jest.Mock).mockResolvedValue(
      successfulSolution(),
    );
    (generateBlueprint as jest.Mock).mockResolvedValue({
      data: assignmentBlueprint(),
      usage: null,
      model: "test-model",
    });
  });

  it("claims a queued row and checkpoints a solved question", async () => {
    (prisma.analysisResult.findUnique as jest.Mock).mockResolvedValue(
      analysisFixture(),
    );
    (prisma.analysisResult.updateMany as jest.Mock).mockResolvedValue({
      count: 1,
    });

    await processAnalyzeJob(
      makeJob({
        analysisId: VALID_ANALYSIS_ID,
        uploadId: VALID_UPLOAD_ID,
        mode: "homework",
      }),
    );

    expect(extractHomeworkQuestions).toHaveBeenCalledTimes(1);
    expect(solveHomeworkQuestion).toHaveBeenCalledTimes(1);
    expect(prisma.analysisResult.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "completed" }),
      }),
    );
  });

  it("skips Gemini when another worker already claimed the row", async () => {
    (prisma.analysisResult.findUnique as jest.Mock).mockResolvedValue(
      analysisFixture("running"),
    );
    (prisma.analysisResult.updateMany as jest.Mock).mockResolvedValue({
      count: 0,
    });

    await processAnalyzeJob(
      makeJob({
        analysisId: VALID_ANALYSIS_ID,
        uploadId: VALID_UPLOAD_ID,
        mode: "homework",
      }),
    );

    expect(extractHomeworkQuestions).not.toHaveBeenCalled();
    expect(solveHomeworkQuestion).not.toHaveBeenCalled();
    expect(prisma.analysisResult.update).not.toHaveBeenCalled();
  });

  it("preserves one solved question when another question fails", async () => {
    (prisma.analysisResult.findUnique as jest.Mock).mockResolvedValue(
      analysisFixture(),
    );
    (prisma.analysisResult.updateMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
    (extractHomeworkQuestions as jest.Mock).mockResolvedValue({
      data: {
        questions: [
          {
            question_text: "What is 2 + 2?",
            source_span_ids: ["S0001"],
          },
          {
            question_text: "What is 3 + 3?",
            source_span_ids: ["S0001"],
          },
        ],
        warnings: [],
      },
      usage: null,
      model: "test-model",
    });
    (solveHomeworkQuestion as jest.Mock)
      .mockResolvedValueOnce(successfulSolution("4"))
      .mockRejectedValueOnce(new Error("Invalid structured response"));

    await processAnalyzeJob(
      makeJob({
        analysisId: VALID_ANALYSIS_ID,
        uploadId: VALID_UPLOAD_ID,
        mode: "homework",
      }),
    );

    const finalUpdate = (prisma.analysisResult.update as jest.Mock).mock.calls.at(
      -1,
    )?.[0];
    expect(finalUpdate.data.status).toBe("completed_with_warnings");
    expect(finalUpdate.data.output.questions).toEqual([
      expect.objectContaining({ qid: "Q1", status: "completed" }),
      expect.objectContaining({ qid: "Q2", status: "needs_review", parts: [] }),
    ]);
  });

  it("throws for a queue retry when every identified question fails", async () => {
    (prisma.analysisResult.findUnique as jest.Mock).mockResolvedValue(
      analysisFixture(),
    );
    (prisma.analysisResult.updateMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
    (solveHomeworkQuestion as jest.Mock).mockRejectedValue(
      new Error("Invalid structured response"),
    );

    await expect(
      processAnalyzeJob(
        makeJob({
          analysisId: VALID_ANALYSIS_ID,
          uploadId: VALID_UPLOAD_ID,
          mode: "homework",
        }),
      ),
    ).rejects.toThrow("No homework question could be solved reliably");
  });

  it("preserves a completed assignment section when another section fails", async () => {
    (prisma.analysisResult.findUnique as jest.Mock).mockResolvedValue(
      analysisFixture(),
    );
    (prisma.analysisResult.updateMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
    (generateSection as jest.Mock)
      .mockResolvedValueOnce(successfulSection("first"))
      .mockRejectedValueOnce(new Error("Invalid structured response"));
    (reviewAssignmentSection as jest.Mock).mockResolvedValue(
      successfulSection("first"),
    );

    await processAnalyzeJob(
      makeJob({
        analysisId: VALID_ANALYSIS_ID,
        uploadId: VALID_UPLOAD_ID,
        mode: "assignment",
      }),
    );

    const finalUpdate = (prisma.analysisResult.update as jest.Mock).mock.calls.at(
      -1,
    )?.[0];
    expect(finalUpdate.data.status).toBe("completed_with_warnings");
    expect(finalUpdate.data.output.assignment.sections).toEqual([
      expect.objectContaining({ section_id: "first", status: "completed" }),
      expect.objectContaining({
        section_id: "second",
        status: "needs_review",
        blocks: [],
      }),
    ]);
  });

  it("rejects invalid job data before touching the model", async () => {
    await expect(
      processAnalyzeJob(
        makeJob({ analysisId: "not-a-uuid", uploadId: "x", mode: "bad" }),
      ),
    ).rejects.toThrow();
    expect(extractHomeworkQuestions).not.toHaveBeenCalled();
    expect(solveHomeworkQuestion).not.toHaveBeenCalled();
  });
});
