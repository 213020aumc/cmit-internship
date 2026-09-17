import nodemailer from "nodemailer";
import { welcomeTemplate, passwordResetTemplate } from "./emailTemplates.js";

// export const sendEmail = async (options) => {
//   const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//   });

//   const mailOptions = {
//     from: `Your App Name <${process.env.EMAIL_SUPPORT}>`,
//     to: options.email,
//     subject: options.subject,
//     text: options.message,
//   };

//   await transporter.sendMail(mailOptions);
// };

export class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = `CourseHub Admin <${process.env.EMAIL_FROM}>`;
  }

  // Determine which email service to use based on the environment
  newTransport() {
    if (process.env.NODE_ENV === "production") {
      // Production: e.g., SendGrid
      return nodemailer.createTransport({
        service: "SendGrid",
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }

    // Development: Mailtrap
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Core sending function
  async send(html, subject) {
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      // Strip HTML tags for older email clients that only read plain text
      text: html.replace(/<[^>]*>?/gm, ""),
    };

    // Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  // Pre-configured methods for specific email types
  async sendWelcome() {
    const html = welcomeTemplate(this.firstName, this.url);
    await this.send(html, "Welcome to CourseHub!");
  }

  async sendPasswordReset() {
    const html = passwordResetTemplate(this.firstName, this.url);
    await this.send(html, "Your password reset token (valid for 10 min)");
  }
}
