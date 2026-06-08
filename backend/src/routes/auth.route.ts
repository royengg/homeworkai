import { Router } from "express";
import { login, register } from "../controller/auth.controller";

const authRoutes: Router = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);

export default authRoutes;
