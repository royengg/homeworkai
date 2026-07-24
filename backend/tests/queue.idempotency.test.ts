// Smoke test for the queue idempotency contract: enqueuing the same analysis
// twice must not produce two jobs. The dedupe relies on a deterministic jobId
// (`analyze:<analysisId>`) and BullMQ rejecting a duplicate add. We mock
// BullMQ's Queue so we can simulate both the success path and the duplicate
// error without a live Redis.

// Mock bullmq before importing the module under test. We only need `Queue`.
jest.mock("bullmq", () => {
  const add = jest.fn();
  return {
    Queue: jest.fn().mockImplementation(() => ({ add })),
  };
});

// Mock ioredis so the queue's dedicated connection doesn't try to dial Redis.
jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue("OK"),
  }));
});

// Provide a REDIS_URL so redis.config doesn't warn / queue module's guard passes.
process.env.REDIS_URL = "redis://localhost:6379";

import { enqueueAnalysisJob } from "../src/queues/analysis.queue";

// Grab the mocked add function the Queue instance uses.
function getMockAdd(): jest.Mock {
  const jestMock = jest.requireMock("bullmq") as any;
  const QueueImpl = jestMock.Queue as jest.Mock;
  return QueueImpl.mock.results[0].value.add as jest.Mock;
}

describe("enqueueAnalysisJob — idempotency", () => {
  beforeEach(() => {
    getMockAdd().mockReset();
  });

  it("derives a deterministic jobId from analysisId", async () => {
    const add = getMockAdd();
    add.mockResolvedValueOnce({ id: "analyze:abc-123" });

    const job = await enqueueAnalysisJob("analyzeJobs", {
      analysisId: "abc-123",
      uploadId: "upload-1",
      mode: "homework",
    });

    expect(add).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith(
      "analyzeJobs",
      expect.objectContaining({ analysisId: "abc-123" }),
      { jobId: "analyze:abc-123" },
    );
    expect(job).not.toBeNull();
  });

  it("dedupes a second enqueue for the same analysisId (returns null, no throw)", async () => {
    const add = getMockAdd();
    // BullMQ throws when a jobId already exists in the queue.
    add.mockRejectedValueOnce(new Error("Job analyze:abc-123 already exists"));

    const job = await enqueueAnalysisJob("analyzeJobs", {
      analysisId: "abc-123",
      uploadId: "upload-1",
      mode: "homework",
    });

    expect(job).toBeNull();
  });

  it("rethrows non-duplicate queue errors", async () => {
    const add = getMockAdd();
    add.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    await expect(
      enqueueAnalysisJob("analyzeJobs", {
        analysisId: "abc-456",
        uploadId: "upload-2",
        mode: "assignment",
      }),
    ).rejects.toThrow("Failed to enqueue job");
  });
});