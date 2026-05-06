export const parseDoctorFields = (req, res, next) => {
  try {
    const fieldsToParse = ["availableTimes", "certifications", "services", "specialization"];

    for (const field of fieldsToParse) {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        
        if (Array.isArray(req.body[field])) {
          continue;
        }
        
        if (typeof req.body[field] === "string") {
          if (req.body[field].trim() === "") {
            delete req.body[field];
            continue;
          }
          
          try {
            const parsed = JSON.parse(req.body[field]);
            req.body[field] = parsed;
            console.log(`✅ Parsed ${field}:`, parsed);
          } catch (parseError) {
            if (field === "specialization" || field === "certifications") {
              req.body[field] = [req.body[field]];
              console.log(`✅ Converted ${field} to array:`, req.body[field]);
            } else if (field === "services") {
              if (req.body[field].match(/^[0-9a-fA-F]{24}$/)) {
                req.body[field] = [req.body[field]];
              } else {
                console.warn(`⚠️ Could not parse ${field}:`, req.body[field]);
              }
            } else {
              console.warn(`⚠️ Could not parse ${field}:`, req.body[field]);
            }
          }
        }
      }
    }

    next();
  } catch (err) {
    console.error("❌ Error in parseDoctorFields:", err);
    return res.status(400).json({ message: "Invalid JSON format in body fields", error: err.message });
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
