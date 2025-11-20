const nodemailer = require('nodemailer');

const sendContactEmail = async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Use StackMail SMTP settings
        const transporter = nodemailer.createTransport({
            host: "smtp.stackmail.com", // Your outgoing mail server
            port: 587, // Usually 587 for StackMail
            secure: false, // true for 465, false for 587
            auth: {
                user: process.env.CONTACT_EMAIL, // e.g., info@wry-tix.com
                pass: process.env.CONTACT_PASSWORD // your email password
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const mailOptions = {
            from: `"Wrytix Contact Form" <${process.env.CONTACT_EMAIL}>`, // Use env variable here too
            replyTo: email,
            to: process.env.CONTACT_EMAIL, // Use env variable here
            subject: `New Contact Form Message from ${name}`,
            html: `
                <h3>New Contact Form Submission</h3>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #007cba;">
                    ${message.replace(/\n/g, '<br>')}
                </div>
                <hr>
                <p><small>Sent from Wrytix Contact Form</small></p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: "Your message has been sent successfully!" });

    } catch (err) {
        console.error("Email send error:", err);
        res.status(500).json({ error: "Failed to send message. Try again later." });
    }
};

module.exports = { sendContactEmail };