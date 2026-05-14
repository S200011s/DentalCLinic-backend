import mongoose from "mongoose";
import ReviewDoctors from "../../../DB/models/reviewDoctors.model.js";
import Doctor from "../../../DB/models/doctor.model.js";
import Appointment from "../../../DB/models/booking.model.js";
import ReviewClinic from "../../../DB/models/reviewClinic.model.js";
import User from "../../../DB/models/user.model.js";
import { sendDoctorReviewApprovalEmail, sendDoctorReviewRejectionEmail,sendClinicReviewApprovalEmail,sendClinicReviewRejectionEmail } from "../../../src/services/email.service.js";

// ------------------ تحديث تقييم الدكتور ------------------
const updateDoctorAverageRating = async (doctorId) => {
  const reviews = await ReviewDoctors.find({ doctor: doctorId, status: "approved" });

  let averageRating = 0;
  let numberOfReviews = reviews.length;

  if (reviews.length > 0) {
    const totalRatings = reviews.reduce((sum, review) => sum + review.rating, 0);
    averageRating = Number((totalRatings / reviews.length).toFixed(1));
  }

  await Doctor.findByIdAndUpdate(doctorId, { 
    averageRating, 
    numberOfReviews 
  });
};

// ------------------ إنشاء تقييم دكتور ------------------
export const createDoctorReview = async (req, res, next) => {
  try {
    const user = req.user._id;
    const { doctorId, appointmentId, comment, rating } = req.body;

    // التحقق من وجود الموعد
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // التحقق من ملكية الموعد
    if (appointment.user.toString() !== String(user)) {
      return res.status(403).json({ message: "Unauthorized to review this appointment" });
    }

    // التحقق من اكتمال الموعد
    if (appointment.status !== "completed") {
      return res.status(400).json({ message: "You can only review completed appointments" });
    }

    // التحقق من عدم وجود تقييم مسبق (مع السماح بإعادة المحاولة بعد الرفض)
    const existingReview = await ReviewDoctors.findOne({ 
      user, 
      doctor: doctorId,
      appointment: appointmentId,
      status: { $in: ["pending", "approved"] }
    });
    
    if (existingReview) {
      if (existingReview.status === "pending") {
        return res.status(400).json({ message: "Your review is being processed" });
      }
      if (existingReview.status === "approved") {
        return res.status(400).json({ message: "You have already reviewed this appointment" });
      }
    }

    // إذا كان هناك تقييم مرفوض، نحذفه ونسمح بتقييم جديد
    await ReviewDoctors.deleteOne({ user, doctor: doctorId, appointment: appointmentId, status: "rejected" });

    const newReview = await ReviewDoctors.create({
      user,
      doctor: doctorId,
      appointment: appointmentId,
      comment,
      rating,
      status: "pending",
    });

    // ✅ رسالة موحدة بدون ذكر "pending approval"
    res.status(201).json({
      success: true,
      message: "Thank you for your feedback!",
      data: newReview,
    });

  } catch (error) {
    next(error);
  }
};

// ------------------ عرض كل تقييمات دكتور (للعرض العام) ------------------
export const getAllReviewsForDoctor = async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    const reviews = await ReviewDoctors.find({
      doctor: doctorId,
      status: "approved",
    })
      .populate("user", "firstName lastName image")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (err) {
    next(err);
  }
};

// ------------------ الحصول على حالة التقييم لموعد معين ------------------
export const getReviewStatusForAppointment = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user._id;

    const review = await ReviewDoctors.findOne({ appointment: appointmentId, user: userId });
    
    if (!review) {
      return res.status(200).json({ exists: false });
    }

    res.status(200).json({
      exists: true,
      status: review.status,
      rejectionReason: review.rejectionReason,
      review: review.status === "approved" ? review : null,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------ تعديل تقييم ------------------
export const editDoctorReviewById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { comment, rating } = req.body;

    const review = await ReviewDoctors.findById(id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    if (review.user.toString() !== String(userId)) {
      return res.status(403).json({ message: "Unauthorized to edit this review" });
    }

    if (review.status !== "approved") {
      return res.status(400).json({ message: "You can only edit an approved review" });
    }

    review.pendingEdit = {
      comment: comment || review.comment,
      rating: typeof rating === "number" ? rating : review.rating,
    };
 review.editStatus = "pending";

    await review.save();

    res.status(200).json({ 
      success: true,
      message: "Your edit request has been submitted for review" 
    });
  } catch (err) {
    next(err);
  }
};

// ------------------ حذف تقييم ------------------
export const deleteDoctorReviewById = async (req, res, next) => {
  try {
    const review = await ReviewDoctors.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    if (review.status !== "approved") {
      return res.status(403).json({ message: "Only approved reviews can be deleted" });
    }

    await ReviewDoctors.findByIdAndDelete(req.params.id);
    await updateDoctorAverageRating(review.doctor);

    res.status(200).json({ 
      success: true,
      message: "Review deleted successfully" 
    });
  } catch (err) {
    next(err);
  }
};

// ===================== CLINIC REVIEWS (مشابه) =====================

export const getClinicReviews = async (req, res, next) => {
  try {
    const reviews = await ReviewClinic.find({ status: "approved" })
      .populate("user", "firstName lastName image")
      .sort({ createdAt: -1 });
      
    res.status(200).json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    next(error);
  }
};

export const addClinicReview = async (req, res, next) => {
  try {
    const user = req.user._id;
    const { comment, rating , appointmentId } = req.body;
    if (!appointmentId) {
      return res.status(400).json({ message: 'appointmentId is required' });
    }
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment)
      return res.status(404).json({ message: 'Appointment not found' });
    if (appointment.user.toString() !== String(user))
      return res.status(403).json({ message: 'Unauthorized' });
    if (appointment.status !== 'completed')
      return res.status(400).json({ message: 'Appointment must be completed first' });


    const existingReview = await ReviewClinic.findOne({ user, status: { $in: ["pending", "approved"] } });
    if (existingReview) {
      if (existingReview.status === "pending") {
        return res.status(400).json({ message: "Your review is being processed" });
      }
      if (existingReview.status === "approved") {
        return res.status(400).json({ message: "You have already reviewed the clinic" });
      }
    }

    await ReviewClinic.deleteOne({ user, status: "rejected" });

    const newReview = await ReviewClinic.create({
      user,
      comment,
      rating,
      status: "pending",
    });

    const populatedReview = await newReview.populate("user", "firstName lastName email");

    res.status(201).json({
      success: true,
      message: "Thank you for your feedback!",
      review: populatedReview,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteClinicReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await ReviewClinic.findById(id);
    
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (review.status !== "approved") {
      return res.status(403).json({ message: "Only approved reviews can be deleted" });
    }

    await ReviewClinic.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Clinic review deleted" });
  } catch (error) {
    next(error);
  }
};

export const editClinicReviewById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { comment, rating } = req.body;

    const review = await ReviewClinic.findById(id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (review.user.toString() !== String(userId)) {
      return res.status(403).json({ message: "Unauthorized to edit this review" });
    }
    if (review.status !== "approved") {
      return res.status(400).json({ message: "You can only edit an approved review" });
    }

    review.pendingEdit = {
      comment: comment || review.comment,
      rating: typeof rating === "number" ? rating : review.rating,
    };
    review.editStatus = "pending";
    await review.save();

    res.status(200).json({ success: true, message: "Edit request submitted for review" });
  } catch (error) {
    next(error);
  }
};
