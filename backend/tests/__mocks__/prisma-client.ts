// Stub @prisma/client for tests. Provides the AnalysisStatus enum the
// processor imports and a no-op PrismaClient whose individual model methods
// are overridden per-test via jest.spyOn / jest.mock.

export const AnalysisStatus = {
  queued: "queued",
  running: "running",
  completed: "completed",
  completed_with_warnings: "completed_with_warnings",
  failed: "failed",
} as const;

export const Prisma = {
  // The auth controller checks for this on caught errors (P2002 unique violation).
  PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, { code }: { code: string }) {
      super(message);
      this.code = code;
    }
  },
};

export class PrismaClient {
  analysisResult = makeModelStub("analysisResult");
  upload = makeModelStub("upload");
  user = makeModelStub("user");
  $disconnect = jest.fn().mockResolvedValue(undefined);
  $connect = jest.fn().mockResolvedValue(undefined);
  $transaction = jest.fn().mockImplementation((operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );
}

function makeModelStub(_name: string) {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  };
}
