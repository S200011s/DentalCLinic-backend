import mongoose from "mongoose"; 
import Doctor from "../../../DB/models/doctor.model.js";
import User from "../../../DB/models/user.model.js";
import Service from "../../../DB/models/service.model.js";
import Category from "../../../DB/models/serviceCategory.model.js";
import ReviewDoctors from "../../../DB/models/reviewDoctors.model.js";
import { v2 as cloudinary } from "cloudinary";
import { extractPublicId } from "../../../utils/extractPublicId.js";
import GalleryImage from "../../../DB/models/gallery.model.js";
import ReviewClinic from "../../../DB/models/reviewClinic.model.js";
import { sendDoctorReviewApprovalEmail, sendDoctorReviewRejectionEmail, sendClinicReviewApprovalEmail,sendClinicReviewRejectionEmail } from "../../../src/services/email.service.js";
import bcrypt from "bcryptjs";

/* ----------------- Doctor Management ----------------- */

/* ---------------------------- Create Doctor ---------------------------- */
export const createDoctor = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      specialization,
      experience,
      certifications,
      bio,
      availableTimes,
      services,
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "First name, last name, email, and password are required",
      });
    }

    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      return res.status(409).json({ message: "Email already in use" });
    }

    let parsedSpecialization = specialization;
    if (typeof specialization === "string") {
      try {
        parsedSpecialization = JSON.parse(specialization);
      } catch {
        parsedSpecialization = [specialization];
      }
    }

    let parsedCertifications = certifications;
    if (typeof certifications === "string") {
      try {
        parsedCertifications = JSON.parse(certifications);
      } catch {
        parsedCertifications = [certifications];
      }
    }

    let parsedAvailableTimes = availableTimes;
    if (typeof availableTimes === "string") {
      try {
        parsedAvailableTimes = JSON.parse(availableTimes);
      } catch {
        parsedAvailableTimes = [];
      }
    }

    if (services && !Array.isArray(services)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Services must be an array" });
    }

    const adminUploadedImage = req.files?.profileImage?.[0]?.path;
    if (!adminUploadedImage) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Profile image is required" });
    }

    if (!req.files?.workImages || req.files.workImages.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Work images are required" });
    }

    const workImages = req.files.workImages.map((file) => file.path);

    // 1. Create User
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "doctor",
      image: adminUploadedImage,
    });
    await newUser.save({ session });

    // 2. Create Doctor
    const doctor = new Doctor({
      firstName,
      lastName,
      specialization: parsedSpecialization || [],
      experience,
      certifications: parsedCertifications || [],
      bio,
      availableTimes: Array.isArray(parsedAvailableTimes)
        ? parsedAvailableTimes
        : [],
      profileImage: adminUploadedImage,
      workImages,
      services: services || [],
      userId: newUser._id,
    });

    await doctor.save({ session });

    if (services && services.length > 0) {
      await Service.updateMany(
        { _id: { $in: services } },
        { $addToSet: { doctors: doctor._id } }
      ).session(session);
    }

    await session.commitTransaction();

    res.status(201).json({
      message: "Doctor and User account created successfully",
      doctor: {
        _id: doctor._id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        fullName: `${doctor.firstName} ${doctor.lastName}`,
        specialization: doctor.specialization,
        experience: doctor.experience,
        profileImage: doctor.profileImage,
        userId: newUser._id,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

/* ---------------------------- Edit Doctor by ID --------------------------- */
export const updateDoctor = async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    const updatedData = { ...req.body };
    const oldDoctor = await Doctor.findById(doctorId);
    
    if (!oldDoctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    if (updatedData.availableTimes && typeof updatedData.availableTimes === 'string') {
      try {
        updatedData.availableTimes = JSON.parse(updatedData.availableTimes);
      } catch (error) {
        return res.status(400).json({ 
          message: "Invalid JSON format in availableTimes field",
          error: error.message 
        });
      }
    }

    if (updatedData.services && !Array.isArray(updatedData.services)) {
      return res.status(400).json({ message: "Services must be an array" });
    }
    if (updatedData.services === null) {
      updatedData.services = [];
    }

    if (updatedData.services && updatedData.services.length > 0) {
      for (const serviceId of updatedData.services) {
        const service = await Service.findById(serviceId);
        if (!service) {
          return res
            .status(400)
            .json({ message: `Invalid service ID: ${serviceId}` });
        }
      }
    }

    if (updatedData.specialization && typeof updatedData.specialization === 'string') {
      updatedData.specialization = [updatedData.specialization];
    }

    if (updatedData.certifications && typeof updatedData.certifications === 'string') {
      updatedData.certifications = [updatedData.certifications];
    }

    if (req.files?.profileImage?.length > 0) {
      updatedData.profileImage = req.files.profileImage[0].path;

      if (oldDoctor.profileImage) {
        const publicId = extractPublicId(oldDoctor.profileImage);
        await cloudinary.uploader.destroy(publicId);
      }
    } else {
      updatedData.profileImage = oldDoctor.profileImage;
    }

    if (req.files?.workImages?.length > 0) {
      if (oldDoctor.workImages && oldDoctor.workImages.length > 0) {
        for (const imageUrl of oldDoctor.workImages) {
          const publicId = extractPublicId(imageUrl);
          await cloudinary.uploader.destroy(publicId);
        }
      }

      updatedData.workImages = req.files.workImages.map((file) => file.path);
    }

    if (updatedData.services !== undefined) {
      const oldServicesStr = (oldDoctor.services || []).map(id => id.toString());
      const newServicesStr = (updatedData.services || []).map(id => id.toString());

      const servicesToRemove = oldServicesStr.filter(
        id => !newServicesStr.includes(id)
      );

      const servicesToAdd = newServicesStr.filter(
        id => !oldServicesStr.includes(id)
      );
      
      if (servicesToRemove.length > 0) {
        await Service.updateMany(
          { _id: { $in: servicesToRemove } },
          { $pull: { doctors: doctorId } }
        );
      }
      
      if (servicesToAdd.length > 0) {
        await Service.updateMany(
          { _id: { $in: servicesToAdd } },
          { $addToSet: { doctors: doctorId } }
        );
      }
    }

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      doctorId,
      updatedData,
      {
        new: true,
        runValidators: true,
      }
    ).populate("services");

    res.status(200).json({
      message: "Doctor updated successfully",
      doctor: updatedDoctor,
    });
  } catch (error) {
    console.error("Update doctor error:", error);
    next(error);
  }
};

/* --------------------------- Delete Doctor by ID -------------------------- */
export const deleteDoctorById = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const doctorId = req.params.id;
    const doctor = await Doctor.findById(doctorId).session(session);
    if (!doctor) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Doctor not found" });
    }
    
    // Delete Cloudinary images
    if (doctor.profileImage) {
      const publicId = extractPublicId(doctor.profileImage);
      await cloudinary.uploader.destroy(publicId);
    }
    if (doctor.workImages && doctor.workImages.length > 0) {
      for (const image of doctor.workImages) {
        const publicId = extractPublicId(image);
        await cloudinary.uploader.destroy(publicId);
      }
    }
    
    // Remove doctor from all services
    if (doctor.services && doctor.services.length > 0) {
      await Service.updateMany(
        { doctors: doctor._id },
        { $pull: { doctors: doctor._id } }
      ).session(session);
    }
    
    await ReviewDoctors.deleteMany({ doctor: doctor._id }).session(session);

    if (doctor.userId) {
      await User.findByIdAndDelete(doctor.userId).session(session);
    }
    await Doctor.findByIdAndDelete(doctorId).session(session);
    await session.commitTransaction();
    res.status(200).json({
      message: "Doctor and related data deleted successfully",
      doctor,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};


/* ----------------- Service Management ----------------- */

/* ---------------------------- Create Service ---------------------------- */


export const createServices = async (req, res, next) => {
  try {
    const { name, category, doctors } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: "Invalid category ID!" });
    }

    const existingService = await Service.findOne({ name });
    if (existingService) {
      return res.status(400).json({ message: "Service with this name already exists!" });
    }

    let validDoctors = [];
    if (doctors && Array.isArray(doctors) && doctors.length > 0) {
      validDoctors = await Doctor.find({ _id: { $in: doctors } });
      if (validDoctors.length !== doctors.length) {
        return res.status(400).json({ message: "Some doctors not found!" });
      }
    }

    const newService = await Service.create({
      ...req.body,
      doctors: doctors || [], // ✅ Can be empty array
      image: req.file.path,
    });

    if (doctors && doctors.length > 0) {
      await Doctor.updateMany(
        { _id: { $in: doctors } },
        { $addToSet: { services: newService._id } }
      );
    }
    res.status(201).json({
      message: "Service created successfully",
      service: newService,
      
    });
  } catch (err) {
    next(err);
  }
};


/* ---------------------------- Edit Service by ID ---------------------------- */
export const updateService = async (req, res, next) => {
  try {
    const serviceId = req.params.id;

    const oldService = await Service.findById(serviceId);
    if (!oldService) {
      return res.status(404).json({ message: "Service not found" });
    }

    let updatedData = { ...req.body };

    // ----------------- CATEGORY VALIDATION -----------------
    if (updatedData.category) {
      const categoryExists = await Category.findById(updatedData.category);
      if (!categoryExists) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
    }

    // ----------------- DOCTORS VALIDATION -----------------
    if (updatedData.doctors) {
      if (!Array.isArray(updatedData.doctors)) {
        return res.status(400).json({ message: "Doctors must be an array" });
      }

      for (const doctorId of updatedData.doctors) {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
          return res.status(400).json({ message: `Invalid doctor ID: ${doctorId}` });
        }
      }
    }

    // ----------------- IMAGE HANDLING -----------------
    if (req.file) {
      updatedData.image = req.file.path;

      if (oldService.image) {
        const publicId = extractPublicId(oldService.image);
        await cloudinary.uploader.destroy(publicId);
      }
    } else {
      updatedData.image = oldService.image;
    }

    // ----------------- MERGE (IMPORTANT PART) -----------------
    const finalData = {
      ...oldService.toObject(),
      ...updatedData,
    };

    // ----------------- UPDATE -----------------
    const updatedService = await Service.findByIdAndUpdate(
      serviceId,
      finalData,
      {
        new: true,
        runValidators: true,
      }
    );

    // ----------------- SYNC DOCTORS (same logic you already have) -----------------
    if (updatedData.doctors !== undefined) {
      const oldDoctorsStr = (oldService.doctors || []).map(id => id.toString());
      const newDoctorsStr = (updatedData.doctors || []).map(id => id.toString());

      const doctorsToRemove = oldDoctorsStr.filter(id => !newDoctorsStr.includes(id));
      const doctorsToAdd = newDoctorsStr.filter(id => !oldDoctorsStr.includes(id));

      if (doctorsToRemove.length > 0) {
        await Doctor.updateMany(
          { _id: { $in: doctorsToRemove } },
          { $pull: { services: updatedService._id } }
        );
      }

      if (doctorsToAdd.length > 0) {
        await Doctor.updateMany(
          { _id: { $in: doctorsToAdd } },
          { $addToSet: { services: updatedService._id } }
        );
      }
    }

    return res.status(200).json({
      message: "Service updated successfully",
      service: updatedService,
    });

  } catch (err) {
    next(err);
  }
};

/* ---------------------------- Delete Service by ID ---------------------------- */
export const deleteServiceById = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const deleteService = await Service.findById(req.params.id).session(session);
    if (!deleteService) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Service not found" });
    }
    
    // Remove service reference from all doctors
    await Doctor.updateMany(
      { services: deleteService._id },
      { $pull: { services: deleteService._id } }
    ).session(session);
    
    if (deleteService.image) {
      const publicId = extractPublicId(deleteService.image);
      await cloudinary.uploader.destroy(publicId);
    }

    await Service.findByIdAndDelete(req.params.id).session(session);
    await session.commitTransaction();

    res.status(200).json(deleteService);
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

/* ----------------- Category Management ----------------- */
/* ---------------------------- Create Category ---------------------------- */
export const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const existingServiceCategory = await Category.findOne({ name });
    if (existingServiceCategory) {
      return res.status(400).json({ message: "Category already exists!" });
    }

    const newServiceCategory = await Category.create({ name, description });
    res.status(201).json(newServiceCategory);
  } catch (err) {
    next(err);
  }
};


/* ------------------------ Update Category by ID ------------------------ */
export const updateCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const editServiceCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    );

    if (!editServiceCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json(editServiceCategory);
  } catch (err) {
    next(err);
  }
};

/* ------------------------ Delete Category by ID ------------------------ */
export const deleteCategory = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const categoryId = req.params.id;

    // 1. Check for linked services
    const hasServices = await Service.exists({ category: categoryId }).session(session);
    if (hasServices) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Cannot delete category: Please reassign or delete linked services first." });
    }

    const deleted = await Category.findByIdAndDelete(categoryId).session(session);
    if (!deleted) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Category not found" });
    }

    await session.commitTransaction();
    res.status(200).json({ message: "Category safely removed" });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};


/* ----------------- gallery Management ----------------- */

export const uploadImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    const newImage = await GalleryImage.create({
      imageUrl: file.path,
      publicId: file.filename, 
    });

    res.status(201).json(newImage);
  } catch (err) {
    res.status(500).json({ error: "Upload failed", details: err.message });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    const image = await GalleryImage.findById(id);
    if (!image) return res.status(404).json({ message: "Image not found" });

    console.log("Deleting image with ID:", id);
    console.log("Public ID to delete from Cloudinary:", image.publicId);

    const result = await cloudinary.uploader.destroy(image.publicId);
    console.log("Cloudinary destroy result:", result);

    await GalleryImage.findByIdAndDelete(id); 

    res.json({ message: "Image deleted successfully" });
  } catch (err) {
    console.error("Error in deleteImage:", err);
    res.status(500).json({ error: err.message });
  }
};

export const updateImage = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const oldImage = await GalleryImage.findById(id);
    if (!oldImage) {
      return res.status(404).json({ message: "Image not found" });
    }

    await cloudinary.uploader.destroy(oldImage.publicId);

    const updatedImage = await GalleryImage.findByIdAndUpdate(
      id,
      {
        imageUrl: file.path,
        publicId: file.filename,
      },
      { new: true }
    );

    res.status(200).json({ 
      message: "Image updated successfully", 
      image: updatedImage 
    });
  } catch (err) {
    console.error("Error in updateImage:", err);
    res.status(500).json({ error: "Update failed", details: err.message });
  }
};


// ===================== REVIEW MANAGEMENT (ADMIN) =====================


// ------------------ تحديث متوسط تقييم الدكتور ------------------
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

// ------------------ تقييمات الأطباء (للأدمن) ------------------
export const getAllDoctorReviewsForAdmin = async (req, res, next) => {
  try {
    const reviews = await ReviewDoctors.find()
      .populate("user", "firstName lastName email image")
      .populate("doctor", "firstName lastName specialization profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------ التقييمات قيد المراجعة (أطباء) ------------------
export const getPendingDoctorReviews = async (req, res, next) => {
  try {
    const pendingReviews = await ReviewDoctors.find({ status: "pending" })
      .populate("user", "firstName lastName email image")
      .populate("doctor", "firstName lastName specialization profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      count: pendingReviews.length, 
      pendingReviews 
    });
  } catch (err) {
    next(err);
  }
};

// ------------------ الموافقة على تقييم دكتور ------------------
export const approveDoctorReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    // const review = await ReviewDoctors.findByIdAndUpdate(id, { status:'approved',
    // approvedAt: new Date() }, { new: true })
    // .populate('user', 'firstName lastName email')
    // .populate('doctor', 'firstName lastName');

    const review = await ReviewDoctors.findByIdAndUpdate(
  id,
  {
    status: "approved",
    approvedAt: new Date()
  },
  { new: true }
)
.populate("user", "firstName lastName email")
.populate({
  path: "doctor",
  populate: {
    path: "user",
    select: "firstName lastName"
  }
});

    if (!review) return res.status(404).json({ message: "Review not found" });

    // review.status = "approved";
    // await review.save();

    await updateDoctorAverageRating(review.doctor);

    // إرسال إيميل للمستخدم
    await sendDoctorReviewApprovalEmail(review.user, review.doctor, review);
// await sendDoctorReviewApprovalEmail(review.user.email, review.user.firstName,
//     `Dr. ${review.doctor.firstName} ${review.doctor.lastName}`);
 
    
    res.status(200).json({ 
      success: true,
      message: "Review approved and user notified", 
      review 
    });
  } catch (err) {
    next(err);
  }
};

// ------------------ رفض تقييم دكتور ------------------
export const rejectDoctorReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // const review = await ReviewDoctors.findById(id)
    //   .populate("user")
    //   .populate("doctor");

    const review = await ReviewDoctors.findById(id)
  .populate("user", "firstName lastName email")
  .populate({
    path: "doctor",
    populate: {
      path: "user",
      select: "firstName lastName",
    },
  });

    if (!review) return res.status(404).json({ message: "Review not found" });

    review.status = "rejected";
    review.rejectionReason = reason || "Does not meet our review guidelines";
    await review.save();

    // إرسال إيميل للمستخدم
    await sendDoctorReviewRejectionEmail(review.user, review.doctor, review);

    res.status(200).json({ 
      success: true,
      message: "Review rejected and user notified", 
      review 
    });
  } catch (err) {
    next(err);
  }
};

// ------------------ التقييمات التي تحتوي على تعديلات معلقة (أطباء) ------------------
export const getDoctorReviewsWithPendingEdits = async (req, res, next) => {
  try {
    const pendingEdits = await ReviewDoctors.find({ 
      editStatus: "pending", 
      pendingEdit: { $ne: null } 
    })
      .populate("user", "firstName lastName email image")
      .populate("doctor", "firstName lastName specialization profileImage")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingEdits.length,
      pendingEdits,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------ الموافقة/رفض تعديل التقييم (أطباء) ------------------
export const handleDoctorReviewEditApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision } = req.body;

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ message: "Invalid decision" });
    }

    const review = await ReviewDoctors.findById(id);
    if (!review || !review.pendingEdit) {
      return res.status(404).json({ message: "No pending edit found" });
    }

    if (decision === "approved") {
      if (review.pendingEdit.comment) review.comment = review.pendingEdit.comment;
      if (typeof review.pendingEdit.rating === "number") review.rating = review.pendingEdit.rating;
      review.status = "approved";
    }

    review.pendingEdit = null;
    review.editStatus = decision;

    await review.save();

    if (decision === "approved") {
      await updateDoctorAverageRating(review.doctor);
    }

    res.status(200).json({
      success: true,
      message: `Edit has been ${decision}`,
      review,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------ حذف تقييم مرفوض (أطباء) ------------------
export const deleteRejectedDoctorReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await ReviewDoctors.findById(id);
    
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (review.status !== "rejected") {
      return res.status(400).json({ message: "Only rejected reviews can be deleted" });
    }

    await ReviewDoctors.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Rejected review deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// ===================== CLINIC REVIEWS (ADMIN) =====================

// ------------------ جميع تقييمات العيادة (للأدمن) ------------------
export const getAllClinicReviewsForAdmin = async (req, res, next) => {
  try {
    const reviews = await ReviewClinic.find()
      .populate("user", "firstName lastName email image")
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      count: reviews.length, 
      reviews 
    });
  } catch (error) {
    next(error);
  }
};

// ------------------ تقييمات العيادة قيد المراجعة ------------------
export const getPendingClinicReviews = async (req, res, next) => {
  try {
    const pendingReviews = await ReviewClinic.find({ status: "pending" })
      .populate("user", "firstName lastName email image")
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      count: pendingReviews.length, 
      pendingReviews 
    });
  } catch (err) {
    next(err);
  }
};

// ------------------ الموافقة على تقييم العيادة ------------------
export const approveClinicReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await ReviewClinic.findByIdAndUpdate(
      id,
      {
        status: "approved",
        approvedAt: new Date(),
      },
      { new: true }
    ).populate("user", "firstName lastName email image");

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    await sendClinicReviewApprovalEmail(
      review.user,
      review
    );

    res.status(200).json({
      success: true,
      message: "Clinic review approved and user notified",
      review,
    });
  } catch (error) {
    next(error);
  }
};
// ------------------ رفض تقييم العيادة ------------------
export const rejectClinicReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const review = await ReviewClinic.findByIdAndUpdate(
      id,
      {
        status: "rejected",
        rejectionReason: reason || "Does not meet our review guidelines",
      },
      { new: true }
    ).populate("user", "firstName lastName email image");

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    await sendClinicReviewRejectionEmail(
      review.user,
      review
    );

    res.status(200).json({
      success: true,
      message: "Clinic review rejected and user notified",
      review,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------ تقييمات العيادة مع تعديلات معلقة ------------------
export const getClinicReviewsWithPendingEdits = async (req, res, next) => {
  try {
    const pendingEdits = await ReviewClinic.find({
      editStatus: "pending",
      pendingEdit: { $ne: null },
    })
      .populate("user", "firstName lastName email image")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingEdits.length,
      pendingEdits,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------ الموافقة/رفض تعديل تقييم العيادة ------------------
export const handleClinicReviewEditApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision } = req.body;

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ message: "Invalid decision" });
    }

    const review = await ReviewClinic.findById(id);
    if (!review || !review.pendingEdit) {
      return res.status(404).json({ message: "No pending edit found" });
    }

    if (decision === "approved") {
      if (review.pendingEdit.comment) review.comment = review.pendingEdit.comment;
      if (typeof review.pendingEdit.rating === "number") review.rating = review.pendingEdit.rating;
      review.status = "approved";
    }

    review.pendingEdit = null;
    review.editStatus = decision;
    await review.save();

    res.status(200).json({ 
      success: true, 
      message: `Edit has been ${decision}`, 
      review 
    });
  } catch (error) {
    next(error);
  }
};

// ------------------ حذف تقييم عيادة مرفوض ------------------
export const deleteRejectedClinicReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await ReviewClinic.findById(id);
    
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (review.status !== "rejected") {
      return res.status(400).json({ message: "Only rejected reviews can be deleted" });
    }

    await ReviewClinic.findByIdAndDelete(id);

    res.status(200).json({ 
      success: true, 
      message: "Rejected clinic review deleted" 
    });
  } catch (err) {
    next(err);
  }
};

// ------------------ إحصائيات سريعة للتقييمات ------------------
export const getReviewStats = async (req, res, next) => {
  try {
    const doctorStats = await ReviewDoctors.aggregate([
      { $group: { 
        _id: "$status", 
        count: { $sum: 1 } 
      }}
    ]);

    const clinicStats = await ReviewClinic.aggregate([
      { $group: { 
        _id: "$status", 
        count: { $sum: 1 } 
      }}
    ]);

    const doctorPendingEdits = await ReviewDoctors.countDocuments({ editStatus: "pending" });
    const clinicPendingEdits = await ReviewClinic.countDocuments({ editStatus: "pending" });

    res.status(200).json({
      success: true,
      stats: {
        doctors: doctorStats,
        clinic: clinicStats,
        pendingEdits: {
          doctors: doctorPendingEdits,
          clinic: clinicPendingEdits
        }
      }
    });
  } catch (error) {
    next(error);
  }
};