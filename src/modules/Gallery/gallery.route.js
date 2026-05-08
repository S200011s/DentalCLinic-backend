import express from "express";
import {
  getAllImages,
} from "./gallery.controller.js";


const router = express.Router();
router.get("/", getAllImages);

export default router;
