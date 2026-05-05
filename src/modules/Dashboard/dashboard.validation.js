import Joi from "joi";
import { isValidObjectId } from "../../../utils/isValidObjectId.js";
import { DoctorSchema, editDoctorSchema, doctorIdSchema } from "../Doctor/doctor.validation.js";
import { servicesSchema, updateServiceSchema, servicesIdSchema } from "../Services/services.validation.js";
import { categorySchema, serviceCategoryIdSchema } from "../serviceCategory/serviceCategory.validation.js";

export { 
  DoctorSchema, editDoctorSchema, doctorIdSchema,
  servicesSchema, updateServiceSchema, servicesIdSchema,
  categorySchema, serviceCategoryIdSchema 
};