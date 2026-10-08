import express from "express";
import { registeringUser, loggingUser } from "../controllers/auth.controllers.js";



const router = express.Router();

router.post("/register", registeringUser );
router.post("/login", loggingUser)

export default router;
