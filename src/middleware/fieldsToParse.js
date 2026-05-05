export const parseDoctorFields = (req, res, next) => {
  try {
    const fieldsToParse = ["availableTimes", "certifications", "services", "specialization"];

    for (const field of fieldsToParse) {
      if (Array.isArray(req.body[field]) && req.body[field].length === 1 && typeof req.body[field][0] === "string") {
        try {
          const parsed = JSON.parse(req.body[field][0]);
          if (Array.isArray(parsed)) {
            req.body[field] = parsed;
          }
        } catch (_) {}
      } else if (typeof req.body[field] === "string") {
        req.body[field] = JSON.parse(req.body[field]);
      }
    }

    next();
  } catch (err) {
    return res.status(400).json({ message: "Invalid JSON format in body fields" });
  }
};

export const parseServiceFields = (req, res, next) => {
  try {
    if (req.body.doctors) {
      if (typeof req.body.doctors === "string") {
        req.body.doctors = JSON.parse(req.body.doctors);
      }

      if (!Array.isArray(req.body.doctors)) {
        return res.status(400).json({ message: "Doctors must be an array" });
      }
    }

    next();
  } catch {
    return res.status(400).json({ message: "Invalid doctors format" });
  }
};