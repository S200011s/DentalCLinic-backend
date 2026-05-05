import Category from "../../../DB/models/serviceCategory.model.js";
import Service from "../../../DB/models/service.model.js";


/* -------------------------- Get All Categories -------------------------- */
export const getServicesCategory = async (req, res, next) => {
  try {
    const getServicesCategory  = await Category.find().sort({ createdAt: -1 });
    res.status(200).json(getServicesCategory );
  } catch (err) {
    next(err);
  }
};

/* ------------------------ Get Category by ID ------------------------ */

export const getServiceCategoryById = async (req, res, next) => {
  try {
    const categoryId = req.params.id;

    const getServiceCategory = await Category.findById(categoryId);
    if (!getServiceCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    const services = await Service.find({ category: categoryId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      category: getServiceCategory.name,
      total: services.length,
      services,
    });
  } catch (err) {
    next(err);
  }
};

