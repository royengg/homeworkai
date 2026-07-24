// Smoke test for the processor's compare-and-swap guard: if a job for an
// analysis that is already running/completed reaches the worker (stale retry,
// manual rerun overlap), the processor must skip the Gemini call entirely
// instead of producing a duplicate LLM run.

// Mock the LLM service so we can assert it was NOT called on a deduped job.
jest.mock("../src/services/analyze.service", () => ({
  runLLM: jest
    .fn()
    .mockResolvedValue({ data: { document_id: "doc-1", type: "homework" }, usage: null, model: "test" }),
  generateBlueprint: jest.fn(),
  generateSection: jest.fn(),
}));

// prisma.db re-exports the PrismaClient instance; stub the methods the
// processor uses. @prisma/client is already mapped to our mock via
// moduleNameMapper — but prisma.db imports it, so jest resolves the same mock.
jest.mock("../src/db/prisma.db", () => {
  const analysisResult = {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  };
  return {
    prisma: { analysisResult },
  };
});

import { processAnalyzeJob } from "../src/processors/analyze.processor";
import { runLLM } from "../src/services/analyze.service";
import { prisma } from "../src/db/prisma.db";
import type { Job } from "bullmq";

const VALID_ANALYSIS_ID = "550e8400-e29b-41d4-a716-446655440001";
const VALID_UPLOAD_ID = "550e8400-e29b-41d4-a716-446655440002";

function makeJob(data: any): Job<any> {
  return { data, id: "job-1", updateProgress: jest.fn() } as unknown as Job<any>;
}

describe("processAnalyzeJob — compare-and-swap guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls Gemini once when the row is still queued", async () => {
    (prisma.analysisResult.findUnique as jest.Mock).mockResolvedValueOnce({
      id: VALID_ANALYSIS_ID,
      status: "queued",
      uploadId: VALID_UPLOAD_ID,
      upload: { parseResult: { text: "Some homework text" } },
    });
    // Claim succeeds (count 1).
    (prisma.analysisResult.updateMany as jest.Mock).mockResolvedValueOnce({
      count: 1,
    });
    (prisma.analysisResult.update as jest.Mock).mockResolvedValue({});

    await processAnalyzeJob(
      makeJob({
        analysisId: VALID_ANALYSIS_ID,
        uploadId: VALID_UPLOAD_ID,
        mode: "homework",
      }),
    );

    expect(runLLM).toHaveBeenCalledTimes(1);
  });

  it("skips the LLM call when the row is already running/completed (count 0)", async () => {
    (prisma.analysisResult.findUnique as jest.Mock).mockResolvedValueOnce({
      id: VALID_ANALYSIS_ID,
      status: "running",
      uploadId: VALID_UPLOAD_ID,
      upload: { parseResult: { text: "Some homework text" } },
    });
    // Claim fails — another worker already flipped it to running.
    (prisma.analysisResult.updateMany as jest.Mock).mockResolvedValueOnce({
      count: 0,
    });

    await processAnalyzeJob(
      makeJob({
        analysisId: VALID_ANALYSIS_ID,
        uploadId: VALID_UPLOAD_ID,
        mode: "homework",
      }),
    );

    expect(runLLM).not.toHaveBeenCalled();
    // Should not flip the row to failed either — the skip is intentional.
    expect(prisma.analysisResult.update).not.toHaveBeenCalled();
  });

  it("rejects invalid job data (schema mismatch)", async () => {
    await expect(
      processAnalyzeJob(
        makeJob({ analysisId: "not-a-uuid", uploadId: "x", mode: "bad" }),
      ),
    ).rejects.toThrow();
    expect(runLLM).not.toHaveBeenCalled();
  });
});