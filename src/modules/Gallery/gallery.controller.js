import GalleryImage from "../../../DB/models/gallery.model.js";
import { v2 as cloudinary } from "cloudinary";


export const getAllImages = async (req, res) => {
  try {
    const images = await GalleryImage.find().sort({ createdAt: -1 });
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
