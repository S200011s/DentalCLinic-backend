import mongoose from "mongoose"; 
import Doctor from "../../../DB/models/doctor.model.js";
import User from "../../../DB/models/user.model.js";
import Service from "../../../DB/models/service.model.js";
import ReviewDoctors from "../../../DB/models/reviewDoctors.model.js";
import { v2 as cloudinary } from "cloudinary";
import { extractPublicId } from "../../../utils/extractPublicId.js";


// /* ---------------------------- Get Doctor by ID ---------------------------- */
// export const getDoctorById = async (req, res, next) => {
//   try {
//     const doctorId = req.params.id;

//     const doctor = await Doctor.findById(doctorId)
//       .populate({
//         path: "user",
//         // match: { role: "doctor" },
//         select: "firstName lastName ",
//       })
//       .populate({
//         path: "services",
//         select: "name price image description category",
//         populate: {
//           path: "category",
//           select: "name",
//         },
//       });
//     if (!doctor || !doctor.user) {
//       return res.status(404).json({ message: "Doctor not found" });
//     }
//     const reviews = await ReviewDoctors.find({ doctor: doctorId }).populate(
//       "user",
//       "name"
//     );

//     const doctorData = {
//       ...doctor._doc,
//       fullName: `${doctor.user.firstName} ${doctor.user.lastName}`,
//     };

//     delete doctorData.user;

//     res.status(200).json({ doctor: doctorData, reviews });
//   } catch (error) {
//     next(error);
//   }
// };
// /* ---------------------------- Get All Doctor ---------------------------- */

// export const getAllDoctors = async (req, res, next) => {
//   try {
//     const {
//       service,
//       specialization,
//       minRating,
//       maxRating,
//       sortBy,
//       order = "desc",
//       page = 1,
//       limit = 4,
//       topRated,
//       lowestRated,
//     } = req.query;

//     const filter = {};
//     let sort = { createdAt: -1 };

//     // if (service) filter.services = { $in: service.split(",") };
//     if (service) {
//       const serviceIds = service.split(",").map((id) => new mongoose.Types.ObjectId(id));
//       filter.services = { $in: serviceIds };
//     }
//     if (specialization) filter.specialization = { $in: specialization.split(",") };
//     if (minRating || maxRating) {
//       filter.averageRating = {};
//       if (minRating) filter.averageRating.$gte = Number(minRating);
//       if (maxRating) filter.averageRating.$lte = Number(maxRating);
//     }

//     if (topRated === "true") {
//       sort = { averageRating: -1 };
//     } else if (lowestRated === "true") {
//       sort = { averageRating: 1 };
//     } else if (sortBy) {
//       sort = {};
//       sort[sortBy] = order === "asc" ? 1 : -1;
//     }

//     const limitNum = Number(limit);
//     const pageNum = Number(page);
//     const skip = (pageNum - 1) * limitNum;

//     const allDoctors = await Doctor.find(filter)
//       .populate([
//         {
//           path: "user",
//           match: { role: "doctor" },
//           select: "firstName lastName",
//         },
//         {
//           path: "services",
//           select: "name price description",
//         },
//       ])
//       .sort(sort)
//       .skip(skip)
//       .limit(limitNum);

//     const filteredDoctors = allDoctors
//       .filter((doc) => doc.user)
//       .map((doc) => ({
//         _id: doc._id,
//         fullName: `${doc.user.firstName} ${doc.user.lastName}`,
//         specialization: doc.specialization,
//         experience: doc.experience,
//         averageRating: doc.averageRating,
//         profileImage: doc.profileImage,
//         certifications: doc.certifications,
//         bio: doc.bio,
//         services: doc.services,
//         workImages: doc.workImages,
//       }));

//     const total = await Doctor.countDocuments(filter);
//     res.status(200).json({
//       message: "Doctors fetched successfully",
//       total,
//       page: pageNum,
//       results: filteredDoctors.length,
//       doctors: filteredDoctors,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /* --------------------------- Get All Specializations -------------------------- */

// export const getAllSpecializations = async (req, res, next) => {
//   try {
//     const specializations = await Doctor.distinct("specialization");
//     res.status(200).json(specializations);
//   } catch (err) {
//     console.error("Error in getAllSpecializations:", err);
//     next(err);
//   }
// };

/* ---------------------------- Get Doctor by ID ---------------------------- */
export const getDoctorById = async (req, res, next) => {
  try {
    const doctorId = req.params.id;

    const doctor = await Doctor.findById(doctorId)
      .populate({
        path: "services",
        select: "name price image description category",
        populate: {
          path: "category",
          select: "name",
        },
      });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const reviews = await ReviewDoctors.find({ doctor: doctorId }).populate(
      "user",
      "firstName lastName"
    );

    const doctorData = {
      _id: doctor._id,
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      fullName: `${doctor.firstName} ${doctor.lastName}`,
      profileImage: doctor.profileImage,
      specialization: doctor.specialization,
      experience: doctor.experience,
      certifications: doctor.certifications,
      bio: doctor.bio,
      services: doctor.services,
      workImages: doctor.workImages,
      averageRating: doctor.averageRating,
      numberOfReviews: doctor.numberOfReviews,
      availableTimes: doctor.availableTimes,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    };

    res.status(200).json({ doctor: doctorData, reviews });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------- Get All Doctors ---------------------------- */

export const getAllDoctors = async (req, res, next) => {
  try {
    const {
      service,
      specialization,
      minRating,
      maxRating,
      sortBy,
      order = "desc",
      page = 1,
      limit = 4,
      topRated,
      lowestRated,
    } = req.query;

    const filter = {};
    let sort = { createdAt: -1 };

    // Filter by service (array of service IDs)
    if (service) {
      const serviceIds = service.split(",").map((id) => new mongoose.Types.ObjectId(id));
      filter.services = { $in: serviceIds };
    }
    
    // Filter by specialization (array of strings)
    if (specialization) {
      const specializations = specialization.split(",");
      filter.specialization = { $in: specializations };
    }
    
    // Filter by rating range
    if (minRating || maxRating) {
      filter.averageRating = {};
      if (minRating) filter.averageRating.$gte = Number(minRating);
      if (maxRating) filter.averageRating.$lte = Number(maxRating);
    }

    // Handle sorting
    if (topRated === "true") {
      sort = { averageRating: -1 };
    } else if (lowestRated === "true") {
      sort = { averageRating: 1 };
    } else if (sortBy) {
      const validSortFields = ["createdAt", "experience", "averageRating", "numberOfReviews"];
      if (validSortFields.includes(sortBy)) {
        sort = {};
        sort[sortBy] = order === "asc" ? 1 : -1;
      }
    }

    const limitNum = Number(limit);
    const pageNum = Number(page);
    const skip = (pageNum - 1) * limitNum;

    const doctors = await Doctor.find(filter)
      .populate({
        path: "services",
        select: "name price description image",
      })
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Format doctors with fullName
    const formattedDoctors = doctors.map((doc) => ({
      _id: doc._id,
      firstName: doc.firstName,
      lastName: doc.lastName,
      fullName: `${doc.firstName} ${doc.lastName}`,
      specialization: doc.specialization,
      experience: doc.experience,
      averageRating: doc.averageRating,
      numberOfReviews: doc.numberOfReviews,
      profileImage: doc.profileImage,
      certifications: doc.certifications,
      bio: doc.bio,
      services: doc.services,
      workImages: doc.workImages,
      availableTimes: doc.availableTimes,
    }));

    const total = await Doctor.countDocuments(filter);
    
    res.status(200).json({
      message: "Doctors fetched successfully",
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      results: formattedDoctors.length,
      doctors: formattedDoctors,
    });
  } catch (error) {
    next(error);
  }
};

/* --------------------------- Get All Specializations -------------------------- */

export const getAllSpecializations = async (req, res, next) => {
  try {
    // Since specialization is an array, we need to unwind it
    const specializations = await Doctor.aggregate([
      { $unwind: "$specialization" },
      { $group: { _id: "$specialization" } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, name: "$_id" } }
    ]);
    
    const specializationList = specializations.map(s => s.name);
    res.status(200).json(specializationList);
  } catch (err) {
    console.error("Error in getAllSpecializations:", err);
    next(err);
  }
};
