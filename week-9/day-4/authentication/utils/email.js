import nodemailer from "nodemailer";
import { welcomeTemplate, passwordResetTemplate } from "./emailTemplates.js";

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
      // Production: SendGrid
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

  async send(html, subject) {
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      // Strip HTML tags for older email clients that only read plain text
      text: html.replace(/<[^>]*>?/gm, ""),
    };

    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    const html = welcomeTemplate(this.firstName, this.url);
    await this.send(html, "Welcome to CourseHub!");
  }

  async sendPasswordReset() {
    const html = passwordResetTemplate(this.firstName, this.url);
    await this.send(html, "Your password reset token (valid for 10 min)");
  }
}
