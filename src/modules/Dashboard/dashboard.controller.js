import mongoose from "mongoose"; 
import Doctor from "../../../DB/models/doctor.model.js";
import User from "../../../DB/models/user.model.js";
import Service from "../../../DB/models/service.model.js";
import Category from "../../../DB/models/serviceCategory.model.js";
import ReviewDoctors from "../../../DB/models/reviewDoctors.model.js";
import { v2 as cloudinary } from "cloudinary";
import { extractPublicId } from "../../../utils/extractPublicId.js";



/* ----------------- Doctor Management ----------------- */

/* ---------------------------- Create Doctor ---------------------------- */
export const createDoctor = async (req, res, next) => {
  try {
    const {
      firstName,        
      lastName, 
      specialization,
      experience,
      certifications,
      bio,
      availableTimes,
      services,
    } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ message: "First name and last name are required" });
    }
    
    let parsedSpecialization = specialization;
    if (typeof specialization === 'string') {
      try {
        parsedSpecialization = JSON.parse(specialization);
      } catch {
        parsedSpecialization = [specialization];
      }
    }

    let parsedCertifications = certifications;
    if (typeof certifications === 'string') {
      try {
        parsedCertifications = JSON.parse(certifications);
      } catch {
        parsedCertifications = [certifications];
      }
    }
    if (services && !Array.isArray(services)) {
      return res.status(400).json({ message: "Services must be an array" });
    }

    if (services && services.length > 0) {
      const validServices = await Service.find({ _id: { $in: services } });
      if (validServices.length !== services.length) {
        return res.status(400).json({ message: "Some services not found" });
      }
    }

    const adminUploadedImage = req.files?.profileImage?.[0]?.path;
    if (!adminUploadedImage) {
      return res.status(400).json({ message: "Profile image is required" });
    }

    if (!req.files?.workImages || req.files.workImages.length === 0) {
      return res.status(400).json({ message: "Work images are required" });
    }

    const workImages = req.files.workImages.map((file) => file.path);

    const doctor = new Doctor({
      firstName,
      lastName,
      specialization: parsedSpecialization || [],
      experience,
      certifications: parsedCertifications || [],
      bio,
      availableTimes: Array.isArray(availableTimes) ? availableTimes : []     ,
      profileImage: adminUploadedImage,
      workImages,
      services: services || [],
    });

    await doctor.save();

    if (services && services.length > 0) {
      await Service.updateMany(
        { _id: { $in: services } },
        { $addToSet: { doctors: doctor._id } }
      );
    }

    res.status(201).json({
      message: "Doctor created successfully",
      doctor: {
        _id: doctor._id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        fullName: `${doctor.firstName} ${doctor.lastName}`,
        specialization: doctor.specialization,
        experience: doctor.experience,
        profileImage: doctor.profileImage,
      },
    });
  } catch (error) {
    next(error);
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

// ✅ Allow doctors to be optional or empty array
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

    // ✅ Only add service to doctors if doctors exist
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
    const updatedData = { ...req.body };

    const oldService = await Service.findById(req.params.id);
    if (!oldService) {
      return res.status(404).json({ message: "Service not found" });
    }

    if (updatedData.name && updatedData.name !== oldService.name) {
      const existing = await Service.findOne({ name: updatedData.name });
      if (existing) {
        return res.status(400).json({ message: "Service name already exists" });
      }
    }

    if (updatedData.category) {
      const categoryExists = await Category.findById(updatedData.category);
      if (!categoryExists) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
    }

    // Validate doctors type if provided
    if (updatedData.doctors && !Array.isArray(updatedData.doctors)) {
      return res.status(400).json({ message: "Doctors must be an array" });
    }

    if (updatedData.doctors && updatedData.doctors.length > 0) {
      for (const doctorId of updatedData.doctors) {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
          return res
            .status(400)
            .json({ message: `Invalid doctor ID: ${doctorId}` });
        }
      }
    }

    if (req.file) {
      updatedData.image = req.file.path;

      if (oldService.image) {
        const publicId = extractPublicId(oldService.image);
        await cloudinary.uploader.destroy(publicId);
      }
    }

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );
    
    // Advanced Sync: Only update if doctors array was provided in request
    if (updatedData.doctors !== undefined) {
      const oldDoctorsStr = (oldService.doctors || []).map(id => id.toString());
      const newDoctorsStr = (updatedData.doctors || []).map(id => id.toString());

      const doctorsToRemove = oldDoctorsStr.filter(
        id => !newDoctorsStr.includes(id)
      );

      const doctorsToAdd = newDoctorsStr.filter(
        id => !oldDoctorsStr.includes(id)
      );

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
    
    res.status(200).json(updatedService);
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