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

uploadRoutes.post("/presign", uploadLimiter, presignUpload);
uploadRoutes.post("/confirm", uploadLimiter, confirmUpload);
uploadRoutes.get("/list", listUpload);
uploadRoutes.get("/:uploadId", getUpload);
uploadRoutes.delete("/:uploadId/delete", deleteUpload);
uploadRoutes.post("/:uploadId/analyses/:analysisId/render", renderAnalysis);
uploadRoutes.get("/:uploadId/analyses/:analysisId/download", getDownloadUrl);

export default uploadRoutes;
