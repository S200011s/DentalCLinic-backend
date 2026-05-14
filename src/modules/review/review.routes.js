import express from "express";
import * as puplicReview from "./review.controller.js";
import { isAuth } from "../../middleware/isauthMiddleware.js";
import { allowRoles } from "../../middleware/checkRole.js";
import { validate } from "../../middleware/validationMiddleware.js";
import reviewJoiSchema  from "./review.validation.js";

const router = express.Router();
router.get("/doctor/:doctorId", puplicReview.getAllReviewsForDoctor);
// router.get("/doctor/id/:id", puplicReview.getDoctorReviewById);
router.post("/doctor", isAuth, validate(reviewJoiSchema), puplicReview.createDoctorReview);
router.put("/doctor/:id", isAuth, puplicReview.editDoctorReviewById);
router.delete("/doctor/:id", isAuth, puplicReview.deleteDoctorReviewById);
router.get("/clinic", puplicReview.getClinicReviews);
router.post("/clinic", isAuth, puplicReview.addClinicReview);
router.delete("/clinic/:id", isAuth, puplicReview.deleteClinicReview);
router.put('/clinic/:id', isAuth, puplicReview.editClinicReviewById);
router.get("/appointment/:appointmentId/status", isAuth, puplicReview.getReviewStatusForAppointment);

export default router;