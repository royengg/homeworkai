import { Router } from "express";
import { parseDocxController } from "../controller/document.parse.controller";
const docxParseRoutes = Router();

docxParseRoutes.post("/:uploadId", parseDocxController);

export default docxParseRoutes;
