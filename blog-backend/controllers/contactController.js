const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendContactEmail = async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Wrytix Contact Form <onboarding@resend.dev>', // You can verify your domain later
            replyTo: email,
            to: ['info@wry-tix.com'], // Send to yourself
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
        });

        if (error) {
            console.error('Resend error:', error);
            return res.status(500).json({ error: "Failed to send message. Try again later." });
        }

        console.log('✅ Email sent via Resend:', data?.id);
        res.json({ message: "Your message has been sent successfully!" });

    } catch (err) {
        console.error("Email send error:", err);
        res.status(500).json({ error: "Failed to send message. Try again later." });
    }
};

module.exports = { sendContactEmail };