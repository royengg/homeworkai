import { Router } from "express";
import { pasteText } from "../controller/paste.controller";

const pasteRoutes: Router = Router();

pasteRoutes.post("/", pasteText);

export default pasteRoutes;
