const { Resend } = require('resend');
const { escapeHtml, NodemailerSecurity } = require('../utils/escapeHtml'); // Add this import

const sendContactEmail = async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Validate email against Nodemailer DoS vulnerability
        const emailValidation = NodemailerSecurity.validateEmailForNodemailer(email);
        if (!emailValidation.isValid) {
            return res.status(400).json({
                error: 'Please provide a valid email address'
            });
        }

        // Sanitize inputs
        const safeName = escapeHtml(name);
        const safeEmail = emailValidation.sanitized;
        const safeMessage = escapeHtml(message);

        const resend = new Resend(process.env.RESEND_API_KEY);

        const { data, error } = await resend.emails.send({
            from: 'Wrytix <noreply@wry-tix.com>',
            replyTo: safeEmail, // Use sanitized email
            to: ['info@wry-tix.com'],
            subject: `New Contact Form Message from ${safeName}`, // Use sanitized name
            html: `
                <h3>New Contact Form Submission</h3>
                <p><strong>Name:</strong> ${safeName}</p>
                <p><strong>Email:</strong> ${safeEmail}</p>
                <p><strong>Message:</strong></p>
                <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #007cba;">
                    ${safeMessage.replace(/\n/g, '<br>')}
                </div>
                <hr>
                <p><small>Sent from Wrytix Contact Form</small></p>
            `
        });

        if (error) {
            return res.status(500).json({ error: "Failed to send message. Try again later." });
        }

        res.json({ message: "Your message has been sent successfully!" });

    } catch (err) {
        res.status(500).json({ error: "Failed to send message. Try again later." });
    }
};

module.exports = { sendContactEmail };