import express from "express";
import { getCounts } from "../Stats/Stats.controller";

const router = express.Router();

router.get("/counts", getCounts);

export default router;
