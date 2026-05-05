    import express, { Router } from "express";
    import *as serviceCategoryController from "./serviceCategory.controller.js";
    import { validate,validateParams } from "../../middleware/validationMiddleware.js";
    import {categorySchema,serviceCategoryIdSchema } from "./serviceCategory.validation.js";

    const router=express.Router();

    router.get("/",serviceCategoryController.getServicesCategory);

    router.get(
        "/:id",
        validateParams(serviceCategoryIdSchema),
        serviceCategoryController.getServiceCategoryById
    );

    export default router;