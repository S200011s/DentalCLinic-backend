import mongoose, { Schema } from "mongoose";


const reviewDoctorsSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment", required: true }, 
    comment: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: { 
      type: String,
       default: null
       },
    pendingEdit: {
      type: {
        comment: String,
        rating: Number,
      },
      default: null,
    },
    editStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", null],
      default: null,
    },

  },
  { timestamps: true }
);


export default mongoose.model("ReviewDoctors", reviewDoctorsSchema);
