'use strict';

/**
 * form service
 */

const { createCoreService } = require('@strapi/strapi').factories;
const nodemailer = require('nodemailer');

module.exports = createCoreService('api::form.form', ({ strapi }) => ({
  async sendConfirmationEmail({ to, text, subject = 'Form Submission Confirmation' }) {
    const fromAddress =  process.env.STRAPI_SMTP_SENDER || 'noreply@nowtec.solutions';

    const transporter = nodemailer.createTransport({
      host: process.env.STRAPI_SMTP_HOST,
      port: process.env.STRAPI_SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.STRAPI_SMTP_USER,
        pass: process.env.STRAPI_SMTP_PASS,
      },
    });

    
    try {
      strapi.log.info(`📧 Sending confirmation to ${to}`);

      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text,
      });

      strapi.log.info("✅ Email sent:", info.messageId);

      const log = await strapi.db.query('api::email-log.email-log').create({
        data: {
          to,
          from: fromAddress,
          body: text,
          subject,
          publishedAt: new Date(),
        },
      });

      strapi.log.info("📝 Email log recorded");

      return log;
    } catch (err) {
      strapi.log.error("❌ Email sending failed:", err);
      throw new Error("Failed to send confirmation email");
    }
  },
}));
