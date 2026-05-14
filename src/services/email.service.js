import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendDoctorReviewApprovalEmail = async (user, doctor, review) => {
  const subject = "✨ Your review is now live!";
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Review Published! 🎉</h1>
      </div>
      
      <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Dear <strong>${user.firstName} ${user.lastName}</strong>,</p>
        
        <p style="font-size: 16px; color: #333;">Thank you for sharing your experience with <strong>Dr. ${doctor.user.firstName} ${doctor.user.lastName}</strong>.</p>
        
        <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <span style="font-size: 24px; color: #fbbf24;">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</span>
            <span style="color: #666;">(${review.rating}/5)</span>
          </div>
          <p style="color: #555; font-style: italic; margin: 0;">"${review.comment}"</p>
        </div>
        
        <a href="${process.env.FRONTEND_URL}/doctors/${doctor._id}" 
           style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          View Your Review
        </a>
        
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({ to: user.email, subject, html });
    console.log(`✅ Approval email sent to ${user.email}`);
  } catch (error) {
    console.error("❌ Email error:", error);
  }
};

export const sendDoctorReviewRejectionEmail = async (user, doctor, review) => {
  const subject = "📝 Update on your review submission";
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #ff6b6b; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Review Needs Revision</h1>
      </div>
      
      <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Dear <strong>${user.firstName} ${user.lastName}</strong>,</p>
        
        <p>Thank you for your feedback regarding <strong>Dr. ${doctor.user.firstName} ${doctor.user.lastName}</strong>.</p>
        
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;"><strong>Reason:</strong> ${review.rejectionReason || "Does not meet our review guidelines"}</p>
        </div>
        
        <p>You can submit a new review for this appointment. We value your honest feedback!</p>
        
        <a href="${process.env.FRONTEND_URL}/appointments" 
           style="display: inline-block; background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Submit New Review
        </a>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          We're here to ensure quality feedback for everyone.
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({ to: user.email, subject, html });
    console.log(`✅ Rejection email sent to ${user.email}`);
  } catch (error) {
    console.error("❌ Email error:", error);
  }
};

export const sendClinicReviewApprovalEmail = async (user, review) => {
  const subject = "✨ Your clinic review is now live!";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Clinic Review Published! 🎉</h1>
      </div>

      <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">
          Dear <strong>${user.firstName} ${user.lastName}</strong>,
        </p>

        <p style="font-size: 16px; color: #333;">
          Thank you for sharing your experience with our clinic.
        </p>

        <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <span style="font-size: 24px; color: #fbbf24;">
              ${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}
            </span>
            <span style="color: #666;">(${review.rating}/5)</span>
          </div>

          <p style="color: #555; font-style: italic; margin: 0;">
            "${review.comment}"
          </p>
        </div>

        <a href="${process.env.FRONTEND_URL}"
          style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Visit Clinic Website
        </a>

        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      to: user.email,
      subject,
      html,
    });

    console.log(`✅ Clinic approval email sent to ${user.email}`);
  } catch (error) {
    console.error("❌ Email error:", error);
  }
};

export const sendClinicReviewRejectionEmail = async (user, review) => {
  const subject = "📝 Update on your clinic review submission";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #ff6b6b; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Clinic Review Needs Revision</h1>
      </div>

      <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">
          Dear <strong>${user.firstName} ${user.lastName}</strong>,
        </p>

        <p>
          Thank you for your feedback about our clinic.
        </p>

        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">
            <strong>Reason:</strong>
            ${review.rejectionReason || "Does not meet our review guidelines"}
          </p>
        </div>

        <p>
          You can submit a new clinic review anytime. We value your honest feedback!
        </p>

        <a href="${process.env.FRONTEND_URL}"
          style="display: inline-block; background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Visit Clinic Website
        </a>

        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          We're here to ensure quality feedback for everyone.
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      to: user.email,
      subject,
      html,
    });

    console.log(`✅ Clinic rejection email sent to ${user.email}`);
  } catch (error) {
    console.error("❌ Email error:", error);
  }
};