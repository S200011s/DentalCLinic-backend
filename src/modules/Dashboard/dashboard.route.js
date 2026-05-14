import { Router } from "express";
import * as dashController from "./dashboard.controller.js";
import { isAuth } from "../../middleware/isauthMiddleware.js";
import { allowRoles } from "../../middleware/checkRole.js";
import { validate, validateParams } from "../../middleware/validationMiddleware.js";
import { cleanBody } from "../../middleware/cleanBodyMiddleware.js";
import { upload } from "../../middleware/upload.js";
import { parseDoctorFields,parseServiceFields  } from "../../middleware/fieldsToParse.js";
import * as dashVal from "./dashboard.validation.js";


const router = Router();

// Global Admin Protection
router.use(isAuth, allowRoles("admin"));

/* ----------------- Doctor Management ----------------- */
router.post("/doctors",
  upload.fields([{ name: "profileImage", maxCount: 1 }, { name: "workImages", maxCount: 5 }]),
  parseDoctorFields,
  validate(dashVal.DoctorSchema),
  dashController.createDoctor
);

router.put("/doctors/:id",
  validateParams(dashVal.doctorIdSchema),
  upload.fields([{ name: "profileImage", maxCount: 1 }, { name: "workImages", maxCount: 5 }]),
  cleanBody,
  parseDoctorFields,
  validate(dashVal.editDoctorSchema),
  dashController.updateDoctor
);

router.delete("/doctors/:id",
  validateParams(dashVal.doctorIdSchema),
  dashController.deleteDoctorById
);

/* ----------------- Service Management ----------------- */
router.post("/services",
  upload.single("image"),
  parseServiceFields ,
  validate(dashVal.servicesSchema),
  dashController.createServices
);

router.put("/services/:id",
  validateParams(dashVal.servicesIdSchema),
  upload.single("image"),
  cleanBody,

  validate(dashVal.updateServiceSchema),
  dashController.updateService
);

router.delete("/services/:id",
  validateParams(dashVal.servicesIdSchema),
    dashController.deleteServiceById
);

/* ----------------- Category Management ----------------- */
router.post("/categories",
  validate(dashVal.categorySchema),
  dashController.createCategory
);

router.put("/categories/:id",
  validateParams(dashVal.serviceCategoryIdSchema),
  validate(dashVal.categorySchema),
  dashController.updateCategory
);

router.delete("/categories/:id",
  validateParams(dashVal.serviceCategoryIdSchema),
  dashController.deleteCategory
);


/* ----------------- gallery Management ----------------- */


router.post(
  "/upload",
  upload.single("image"),
  dashController.uploadImage
);
router.delete(
  "/gallery/:id",
  dashController.deleteImage
);

  router.put(
  "/gallery/:id",
  upload.single("image"),
  dashController.updateImage
);



/* ----------------- Review Management (Admin) ----------------- */

// ------------------ Doctor Reviews Admin ------------------
router.get("/reviews/doctors", 
  dashController.getAllDoctorReviewsForAdmin
);

router.get("/reviews/doctors/pending", 
  dashController.getPendingDoctorReviews
);

router.patch("/reviews/doctors/:id/approve", 
  dashController.approveDoctorReview
);

router.patch("/reviews/doctors/:id/reject", 
  dashController.rejectDoctorReview
);

router.get("/reviews/doctors/pending-edits", 
  dashController.getDoctorReviewsWithPendingEdits
);

router.put("/reviews/doctors/:id/edit-decision", 
  dashController.handleDoctorReviewEditApproval
);

router.delete("/reviews/doctors/rejected/:id", 
  dashController.deleteRejectedDoctorReview
);

// ------------------ Clinic Reviews Admin ------------------
router.get("/reviews/clinic", 
  dashController.getAllClinicReviewsForAdmin
);

router.get("/reviews/clinic/pending", 
  dashController.getPendingClinicReviews
);

router.patch("/reviews/clinic/:id/approve", 
  dashController.approveClinicReview
);

router.patch("/reviews/clinic/:id/reject", 
  dashController.rejectClinicReview
);

router.get("/reviews/clinic/pending-edits", 
  dashController.getClinicReviewsWithPendingEdits
);

router.put("/reviews/clinic/:id/edit-decision", 
  dashController.handleClinicReviewEditApproval
);

router.delete("/reviews/clinic/rejected/:id", 
  dashController.deleteRejectedClinicReview
);

// ------------------ Review Stats ------------------
router.get("/reviews/stats", 
  dashController.getReviewStats
);

export default router;