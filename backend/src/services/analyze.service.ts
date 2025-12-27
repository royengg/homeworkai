import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
  type GenerationConfig,
} from "@google/generative-ai";
import { HOMEWORK_SOLVER_PROMPT } from "../utils/prompt.utils";
import { AnalysisOutput } from "../types/analysis-output.types";
import { logger } from "../config/logger.config";

const GOOGLE_API_KEY: string = process.env.GOOGLE_API_KEY as string;
if (!GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY is not set");
}

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

const generationConfig: GenerationConfig = {
  temperature: 0.2,
  maxOutputTokens: 8000,
  responseMimeType: "application/json",
  responseSchema: outputSchema,
};

const llm = new GoogleGenerativeAI(GOOGLE_API_KEY);

export async function runLLM(pdfData: string): Promise<AnalysisOutput> {
  const model = llm.getGenerativeModel({
    model: "gemini-3.0-flash",
    generationConfig,
  });

  const prompt = `${HOMEWORK_SOLVER_PROMPT}\n\nINPUT JSON: ${pdfData}`;
  logger.debug("LLM prompt generated", { promptLength: prompt.length });
  const res = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  logger.debug("LLM response received", { 
    candidatesCount: res.response.candidates?.length,
    usageMetadata: res.response.usageMetadata 
  });

  const text = res.response.text();
  logger.info("LLM analysis completed", { outputLength: text.length });

  // Clean up potential markdown code blocks
  const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();

  try {
    return JSON.parse(cleanText) as AnalysisOutput;
  } catch {
    throw new Error("LLM returned non-JSON output");
  }
}
