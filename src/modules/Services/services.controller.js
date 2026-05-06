import Service from "../../../DB/models/service.model.js";
import Doctor from "../../../DB/models/doctor.model.js";
import Category from "../../../DB/models/serviceCategory.model.js";
import { v2 as cloudinary } from "cloudinary";
import { extractPublicId } from "../../../utils/extractPublicId.js";


/* ---------------------------- Get All Services ---------------------------- */
export const getAllServices = async (req, res, next) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      sessions,
      sortBy,
      order = "desc",
      page = 1,
      limit = 4,
    } = req.query;

    let filter = {};
    let sort = { createdAt: -1 };

    if (category) {
      const categoryArray = category.split(",");
      filter.category = { $in: categoryArray };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (sessions) {
      filter.sessions = { $regex: sessions, $options: "i" };
    }

    if (sortBy) {
      const validSortFields = ["createdAt", "price", "name"]; 
      if (validSortFields.includes(sortBy)) {
        sort = {};
        sort[sortBy] = order === "asc" ? 1 : -1;
      }
    }

    const limitNum = Number(limit);
    const pageNum = Number(page);
    const skip = (pageNum - 1) * limitNum;

    const allServices = await Service.find(filter)
      .populate("category", "name")
      .populate({
        path: "doctors",
        select: "firstName lastName specialization profileImage averageRating numberOfReviews",
      })
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const formattedServices = allServices.map((service) => ({
      _id: service._id,
      name: service.name,
      image: service.image,
      price: service.price,
      description: service.description,
      category: service.category?.name,
      duration: service.duration,
      sessions: service.sessions,
    }));

    // Format doctors inside services for response
    const servicesWithDoctors = allServices.map((service) => ({
      ...formattedServices.find(s => s._id.equals(service._id)),
      doctors: service.doctors.map(doc => ({
        _id: doc._id,
        fullName: `${doc.firstName} ${doc.lastName}`,
        specialization: doc.specialization,
        profileImage: doc.profileImage,
        averageRating: doc.averageRating,
      }))
    }));

    const total = await Service.countDocuments(filter);

    res.status(200).json({
      message: "Services fetched successfully",
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      results: allServices.length,
      services: servicesWithDoctors,
    });
  } catch (err) {
    next(err);
  }
};

/* ---------------------------- Get Service by ID ---------------------------- */
export const getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate({
        path: "doctors",
        select: "firstName lastName specialization profileImage averageRating numberOfReviews experience bio",
      })
      .populate("category", "name description");

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    const formattedDoctors = service.doctors.map((doctor) => ({
      _id: doctor._id,
      fullName: `${doctor.firstName} ${doctor.lastName}`,
      specialization: doctor.specialization,
      profileImage: doctor.profileImage,
      averageRating: doctor.averageRating,
      numberOfReviews: doctor.numberOfReviews,
      experience: doctor.experience,
      bio: doctor.bio,
    }));

    const serviceData = {
      _id: service._id,
      name: service.name,
      description: service.description,
      image: service.image,
      price: service.price,
      duration: service.duration,
      sessions: service.sessions,
      category: service.category,
      doctors: formattedDoctors,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };

    res.status(200).json(serviceData);
  } catch (err) {
    next(err);
  }
};

/* ---------------------------- Get Services by Doctor ID ---------------------------- */
export const getServicesByDoctorId = async (req, res, next) => {
  try {
    const doctorId = req.params.doctorId;
    
    const doctor = await Doctor.findById(doctorId).populate({
      path: "services",
      populate: {
        path: "category",
        select: "name"
      }
    });
    
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    
    res.status(200).json({
      message: "Doctor services fetched successfully",
      doctorName: `${doctor.firstName} ${doctor.lastName}`,
      services: doctor.services
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------- Get Top Rated Doctors ---------------------------- */
export const getTopRatedDoctors = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;
    
    const topDoctors = await Doctor.find({ averageRating: { $gt: 0 } })
      .sort({ averageRating: -1, numberOfReviews: -1 })
      .limit(Number(limit))
      .populate("services", "name");
    
    const formattedDoctors = topDoctors.map(doc => ({
      _id: doc._id,
      fullName: `${doc.firstName} ${doc.lastName}`,
      specialization: doc.specialization,
      averageRating: doc.averageRating,
      numberOfReviews: doc.numberOfReviews,
      profileImage: doc.profileImage,
    }));
    
    res.status(200).json({
      message: "Top rated doctors fetched successfully",
      doctors: formattedDoctors
    });
  } catch (error) {
    next(error);
  }
};