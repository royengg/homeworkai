import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
  type GenerationConfig,
} from "@google/generative-ai";
import {
  HOMEWORK_SOLVER_PROMPT,
  ASSIGNMENT_BLUEPRINT_PROMPT,
  ASSIGNMENT_SECTION_PROMPT,
} from "../utils/prompt.utils";
import { AnalysisOutput } from "../types/analysis-output.types";
import { logger } from "../config/logger.config";

const GOOGLE_API_KEY: string = process.env.GOOGLE_API_KEY as string;
if (!GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY is not set");
}

const llm = new GoogleGenerativeAI(GOOGLE_API_KEY);

const outputSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    document_id: { type: SchemaType.STRING },
    questions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          qid: { type: SchemaType.STRING },
          question_text: { type: SchemaType.STRING },
          parts: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                label: { type: SchemaType.STRING },
                answer: { type: SchemaType.STRING },
                workings: { type: SchemaType.STRING },
              },
              required: ["label", "answer", "workings"],
            },
          },
        },
        required: ["qid", "question_text", "parts"],
      },
    },
  },
  required: ["document_id", "questions"],
};

const blueprintSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    sections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING },
          objectives: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          key_points: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ["id", "title", "objectives", "key_points"],
      },
    },
  },
  required: ["title", "description", "sections"],
};

const sectionSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    section_id: { type: SchemaType.STRING },
    content: { type: SchemaType.STRING },
    citations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["section_id", "content"],
};

const MODELS_FALLBACK_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash-lite",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractRetryDelay(error: any): number | null {
  try {
    if (error.errorDetails) {
      for (const detail of error.errorDetails) {
        if (detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo") {
          const retryDelay = detail.retryDelay;
          if (retryDelay) {
            const match = retryDelay.match(/(\d+(?:\.\d+)?)s?/);
            if (match) {
              const seconds = parseFloat(match[1]);
              return Math.ceil(seconds * 1000);
            }
          }
        }
      }
    }

    const errorMessage = error.message || "";
    const retryMatch = errorMessage.match(/retry in ([\d.]+)s/i);
    if (retryMatch) {
      const seconds = parseFloat(retryMatch[1]);
      return Math.ceil(seconds * 1000);
    }
  } catch (e) {}

  return null;
}

function isRateLimitError(error: any): boolean {
  const errorMessage = (error.message || "").toLowerCase();
  const status = error.status || error.statusCode;

  return (
    status === 429 ||
    errorMessage.includes("quota") ||
    errorMessage.includes("429") ||
    errorMessage.includes("rate limit") ||
    errorMessage.includes("too many requests")
  );
}

async function callModelResiliently(config: any, prompt: string) {
  let lastError: any = null;
  const MAX_RETRIES_PER_MODEL = 2;
  const BASE_DELAY_MS = 1000;

  for (const modelName of MODELS_FALLBACK_CHAIN) {
    let retryCount = 0;

    while (retryCount <= MAX_RETRIES_PER_MODEL) {
      try {
        const model = llm.getGenerativeModel({
          model: modelName,
          generationConfig: config,
        });
        const res = await model.generateContent(prompt);
        const rawText = res.response.text();

        const cleaned = rawText
          .replace(/```json\n?|```/g, "")
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
          .trim();

        try {
          return JSON.parse(cleaned);
        } catch (parseErr) {
          logger.error(`JSON Parse Error with ${modelName}`, {
            error: parseErr instanceof Error ? parseErr.message : parseErr,
            snippet: cleaned.substring(0, 100) + "...",
          });
          lastError = parseErr;
          break;
        }
      } catch (e: any) {
        lastError = e;

        if (isRateLimitError(e)) {
          const retryDelay = extractRetryDelay(e) || extractRetryDelay(e.error);

          if (retryDelay && retryCount < MAX_RETRIES_PER_MODEL) {
            const delay = retryDelay + retryCount * BASE_DELAY_MS;
            logger.warn(
              `Rate limit hit for ${modelName}, retrying in ${Math.ceil(
                delay / 1000
              )}s (attempt ${retryCount + 1}/${MAX_RETRIES_PER_MODEL + 1})...`
            );
            await sleep(delay);
            retryCount++;
            continue;
          } else {
            logger.warn(
              `Quota or Rate Limit hit for ${modelName}, falling back to next model...`
            );

            await sleep(BASE_DELAY_MS);
            break;
          }
        } else {
          throw e;
        }
      }
    }
  }

  throw (
    lastError ||
    new Error("All models in fallback chain failed to provide valid output")
  );
}

export async function runLLM(pdfData: string): Promise<AnalysisOutput> {
  const config = {
    temperature: 0.2,
    maxOutputTokens: 8000,
    responseMimeType: "application/json",
    responseSchema: outputSchema,
  };
  const prompt = `${HOMEWORK_SOLVER_PROMPT}\n\nINPUT JSON: ${pdfData}`;
  return await callModelResiliently(config, prompt);
}

export async function generateBlueprint(pdfData: string): Promise<any> {
  const config = {
    temperature: 0.3,
    responseMimeType: "application/json",
    responseSchema: blueprintSchema,
  };
  const prompt = `${ASSIGNMENT_BLUEPRINT_PROMPT}\n\nINPUT SOURCE MATERIAL: ${pdfData}`;
  return await callModelResiliently(config, prompt);
}

export async function generateSection(
  blueprint: any,
  section: any,
  pdfData: string
): Promise<any> {
  const config = {
    temperature: 0.5,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
    responseSchema: sectionSchema,
  };
  const prompt = `${ASSIGNMENT_SECTION_PROMPT}\n\nBLUEPRINT: ${JSON.stringify(
    blueprint
  )}\n\nTARGET SECTION: ${JSON.stringify(
    section
  )}\n\nSOURCE MATERIAL: ${pdfData}`;
  return await callModelResiliently(config, prompt);
}
