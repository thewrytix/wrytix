const nodemailer = require('nodemailer');

const sendContactEmail = async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.stackmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.CONTACT_EMAIL,
                pass: process.env.CONTACT_PASSWORD
            },
            tls: { rejectUnauthorized: false }
        });

        const mailOptions = {
            from: `"Wrytix Contact Form" <${process.env.CONTACT_EMAIL}>`,
            to: process.env.CONTACT_EMAIL,
            replyTo: email,
            subject: `New Contact Form Message from ${name}`,
            html: `
                <h3>New Contact Form Submission</h3>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <div style="background: #f5f5f5; padding: 15px;">
                    ${message.replace(/\n/g, '<br>')}
                </div>
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