const nodemailer = require('nodemailer');

const sendContactEmail = async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Configure for your wry-tix.com webmail
        const transporter = nodemailer.createTransport({
            host: "mail.wry-tix.com", // Your email server host
            port: 587, // Most web hosts use 587
            secure: false, // true for 465, false for 587
            auth: {
                user: "info@wry-tix.com", // Your email address
                pass: "info@wry-tix.com149143123." // Your email password from environment variables
            },
            tls: {
                rejectUnauthorized: false // Often needed for shared hosting
            }
        });

        const mailOptions = {
            from: `"Wrytix Contact Form" <info@wry-tix.com>`, // Send from your domain
            replyTo: email, // So replies go to the user who filled the form
            to: "info@wry-tix.com", // Send to yourself
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