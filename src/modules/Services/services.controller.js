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
      // FIX: Correctly populate the user inside doctors to get the name
      .populate({
        path: "doctors",
        select: "user",
        populate: {
          path: "user",
          select: "firstName lastName"
        }
      })
      .sort(sort)
      .skip(Number(skip))
      .limit(Number(limit));

    const formattedServices = allServices.map((service) => ({
      _id: service._id,
      name: service.name,
      image: service.image,
      price: service.price,
      description: service.description,
      category: service.category?.name,
    }));

    const total = await Service.countDocuments(filter);

    res.status(200).json({
      message: "Services fetched successfully",
      total,
      page: Number(page),
      results: allServices.length,
      services: formattedServices,
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
        select: "user specialization profileImage averageRating", 
        populate: {
          path: "user",
          select: "firstName lastName"
        }
      })
      .populate("category", "name");

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    const formattedDoctors = service.doctors.map((doctor) => ({
      _id: doctor._id,
      fullName: `${doctor.user.firstName} ${doctor.user.lastName}`,
      specialization: doctor.specialization,
      profileImage: doctor.profileImage,
      averageRating: doctor.averageRating,
    }));

    const serviceData = {
      ...service._doc,
      doctors: formattedDoctors,
    };

    res.status(200).json(serviceData);
  } catch (err) {
    next(err);
  }
};
