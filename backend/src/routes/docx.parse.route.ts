import { Router } from "express";
import { parseDocxController } from "../controller/docx.parse.controller";
const docxParseRoutes = Router();

docxParseRoutes.post("/:uploadId", parseDocxController);

export default docxParseRoutes;
