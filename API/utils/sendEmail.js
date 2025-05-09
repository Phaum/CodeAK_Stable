const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Или SMTP сервер, например, Mailtrap, SendGrid
            auth: {
                user: process.env.EMAIL_USER, // Логин (почта)
                pass: process.env.EMAIL_PASS  // Пароль или "App Password" для Gmail
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            text
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email отправлен на ${to}`);
    } catch (error) {
        console.error('Ошибка при отправке email:', error);
    }
};

const sendVerificationEmail = async (email, verificationCode) => {
    const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Подтверждение регистрации",
        text: `Привет, это проект Code.ak!\nВаш код подтверждения почты: ${verificationCode}`,
    };
    await transporter.sendMail(mailOptions);
};

module.exports = {sendEmail, sendVerificationEmail};
