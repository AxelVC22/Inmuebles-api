const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendResetEmail = async (email, token) => {
  const mailOptions = {
    from: `"Inmobiliaria App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Código de Recuperación',
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2>Código de recuperación de contraseña</h2>
        <p>Copia y pega el siguiente código en la aplicación para restablecer tu contraseña:</p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 18px; word-break: break-all;">
          <strong>${token}</strong>
        </div>
        <p>Este código expira en 15 minutos.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendResetEmail };
