import { Router } from "express";
import {
  presignUpload,
  confirmUpload,
  listUpload,
  getUpload,
  deleteUpload,
} from "../controller/upload.controller";
import { renderAnalysis, getDownloadUrl } from "../controller/render.controller";
import { uploadLimiter } from "../middleware/ratelimit.middleware";

const uploadRoutes: Router = Router();

// All authenticated upload-related routes share the per-user uploadLimiter so a
// single account cannot abuse list/get/render/delete endpoints.
uploadRoutes.use(uploadLimiter);

uploadRoutes.post("/presign", presignUpload);
uploadRoutes.post("/confirm", confirmUpload);
uploadRoutes.get("/list", listUpload);
uploadRoutes.get("/:uploadId", getUpload);
uploadRoutes.delete("/:uploadId/delete", deleteUpload);
// POST renders the solution PDF (idempotent — cache hit returns the existing
// download URL). GET /download only presigns an already-rendered artifact and
// returns 404 if it has not been rendered yet.
uploadRoutes.post("/:uploadId/analyses/:analysisId/render", renderAnalysis);
uploadRoutes.get("/:uploadId/analyses/:analysisId/download", getDownloadUrl);

export default uploadRoutes;