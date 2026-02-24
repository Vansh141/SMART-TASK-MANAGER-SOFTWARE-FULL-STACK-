const { Resend } = require("resend");

const sendEmail = async (options) => {
    // Gracefully handle missing Resend configs for test environments
    if (!process.env.RESEND_API_KEY) {
        console.warn("\n⚠️ [MAIL MOCK] RESEND_API_KEY missing in .env!");
        console.log("-----------------------------------------");
        console.log(`To: ${options.email}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Fallback Plain Text: \n${options.message}`);
        console.log("-----------------------------------------\n");
        return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const data = await resend.emails.send({
            from: "Smart Task Manager <onboarding@resend.dev>",
            to: options.email,
            subject: options.subject,
            html: options.htmlMessage, // Enhanced HTML Email support
            text: options.message,     // Plaintext fallback
        });

        if (data.error) {
            console.error("❌ Resend API Error: ", data.error);
            throw new Error(data.error.message || "Email sending failed");
        }

        console.log("Email officially sent via Resend: %s", data.data.id);
    } catch (sendError) {
        console.error("❌ Resend SendMail Failed: ", sendError.message);
        throw sendError; // Ensure it bubbles back to the controller
    }
};

module.exports = sendEmail;
