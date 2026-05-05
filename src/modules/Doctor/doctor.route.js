import express from "express";
import *as doctorController from "./doctor.controller.js";
import { validate,validateParams } from "../../middleware/validationMiddleware.js";
import {DoctorSchema,editDoctorSchema,doctorIdSchema} from "./doctor.validation.js";

const router = express.Router();

router.get("/",
  doctorController.getAllDoctors);

router.get("/specializations",
  doctorController.getAllSpecializations);

router.get("/:id",
  validateParams(doctorIdSchema),
  doctorController.getDoctorById
);


export default router;