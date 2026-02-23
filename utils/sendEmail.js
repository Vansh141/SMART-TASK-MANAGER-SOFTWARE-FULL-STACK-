const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
    const smtpPort = process.env.SMTP_PORT || 465;

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: smtpPort,
        secure: smtpPort == 465, // true for 465, false for other ports (like 587)
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    const message = {
        from: `${process.env.FROM_NAME || 'Smart Task Manager'} <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        html: options.htmlMessage, // Enhanced HTML Email support
        text: options.message,     // Plaintext fallback
    };

    // Gracefully handle missing SMTP configurations for test environments
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        console.warn("\n⚠️ [MAIL MOCK] SMTP Credentials missing in .env!");
        console.log("-----------------------------------------");
        console.log(`To: ${options.email}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Fallback Plain Text: \n${options.message}`);
        console.log("-----------------------------------------\n");
        return;
    }

    try {
        const info = await transporter.sendMail(message);
        console.log("Email officially sent: %s", info.messageId);
    } catch (sendError) {
        console.error("❌ Transporter SendMail Failed: ", sendError.message);
        throw sendError; // Ensure it bubbles back to the controller
    }
};

module.exports = sendEmail;
