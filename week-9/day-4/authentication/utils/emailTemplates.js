const baseLayout = (content) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
      <h2>CourseHub</h2>
    </div>
    <div style="padding: 20px;">
      ${content}
    </div>
    <div style="color: #888; font-size: 12px; text-align: center; margin-top: 20px;">
      &copy; ${new Date().getFullYear()} CourseHub Inc. All rights reserved.
    </div>
  </div>
`;

export const welcomeTemplate = (name, url) =>
  baseLayout(`
  <h3>Welcome to the platform, ${name}!</h3>
  <p>We're thrilled to have you here. To get started, explore our course catalog.</p>
  <a href="${url}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">Explore Courses</a>
`);

export const passwordResetTemplate = (name, url) =>
  baseLayout(`
  <h3>Hello ${name},</h3>
  <p>We received a request to reset your password. Click the button below to set a new one. This link is valid for 10 minutes.</p>
  <a href="${url}" style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: #fff; text-decoration: none; border-radius: 5px;">Reset Password</a>
  <p>If you didn't request this, please ignore this email or contact support if you have concerns.</p>
`);
