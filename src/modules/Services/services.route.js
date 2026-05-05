import express from "express";
import * as serviceController from "./services.controller.js";
import { validate,validateParams } from "../../middleware/validationMiddleware.js";
import { servicesSchema, servicesIdSchema,updateServiceSchema } from "./services.validation.js";
const router = express.Router();

router.get("/", serviceController.getAllServices);

router.get(
  "/:id",
  validateParams(servicesIdSchema),
  serviceController.getServiceById
);


export default router;
