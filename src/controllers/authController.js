const prisma = require('../prisma');
const { sendResetEmail } = require('../utils/emailService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const registerUser = async (req, res) => {
  const {
    nombre,
    apellidos,
    email,
    password,
    rol,
    telefono,
    telefonoFijo,
    fechaNacimiento,
    nacionalidad,
    direccion,
    rfc,
    presupuestoMin,
    presupuestoMax,
    idCategoria,
  } = req.body;

  try {
    if (!direccion) {
      return res.status(400).json({ error: 'La dirección es obligatoria.' });
    }

    const existingUser = await prisma.usuario.findUnique({ where: { correoElectronico: email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let userData = {
      nombre,
      apellidos,
      correoElectronico: email,
      hashPassword: hashedPassword,
      rol,
      telefono,
      telefonoFijo,
      fechaNacimiento: new Date(fechaNacimiento),
      nacionalidad,
      estadoCuenta: 'Activo',

      Direccion: {
        create: {
          calle: direccion.calle,
          noCalle: parseInt(direccion.noCalle),
          colonia: direccion.colonia,
          ciudad: direccion.ciudad,
          estado: direccion.estado,
          codigoPostal: parseInt(direccion.codigoPostal),
        },
      },

      Cliente: {
        create: {
          Preferencias: {
            create: {
              presupuestoMin: presupuestoMin ? parseFloat(presupuestoMin) : undefined,
              presupuestoMax: presupuestoMax ? parseFloat(presupuestoMax) : undefined,
              idCategoria: idCategoria ? parseInt(idCategoria) : undefined,
            },
          },
        },
      },
    };

    if (rol === 'Arrendador') {
      if (!rfc) return res.status(400).json({ error: 'El RFC es obligatorio para Arrendadores' });

      userData.Arrendador = { create: { rfc: rfc } };
    }

    const usuarioGuardado = await prisma.usuario.create({
      data: userData,
      include: { Cliente: true, Arrendador: true },
    });

    res.status(201).json({
      message: 'Usuario registrado exitosamente.',
      userId: usuarioGuardado.idUsuario,
      user: {
        nombre: usuarioGuardado.nombre,
        email: usuarioGuardado.correoElectronico,
        rol: usuarioGuardado.rol,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno al registrar el usuario' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.usuario.findUnique({
      where: { correoElectronico: email },
      include: {
        Arrendador: true,
        Cliente: true,
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Correo electrónico incorrecto.' });
    }

    const validPassword = await bcrypt.compare(password, user.hashPassword);
    if (!validPassword) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    const tokenPayload = {
      id: user.idUsuario,
      rol: user.rol,
      idArrendador: user.Arrendador ? user.Arrendador.idUsuario : null,
      idCliente: user.Cliente ? user.Cliente.idUsuario : null,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      message: `Bienvenido, ${user.nombre}`,
      token,
      user: {
        id: user.idUsuario,
        nombre: user.nombre,
        email: user.correoElectronico,
        rol: user.rol,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.usuario.findUnique({
      where: { correoElectronico: email },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const resetToken = jwt.sign({ id: user.idUsuario, type: 'reset' }, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });

    await sendResetEmail(email, resetToken);

    res.json({
      success: true,
      message: 'El código ha sido enviado a tu correo.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al enviar el código.' });
  }
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'reset') {
      return res.status(400).json({ error: 'Acción no autorizada.' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.usuario.update({
      where: { idUsuario: decoded.id },
      data: { hashPassword: hashedPassword },
    });

    res.json({ message: 'Tu contraseña ha sido actualizada exitosamente.' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res
        .status(400)
        .json({ error: 'El enlace ha expirado. Por favor, solicita uno nuevo.' });
    }
    res.status(500).json({ error: 'Error al actualizar la contraseña.' });
  }
};

module.exports = { registerUser, loginUser, requestPasswordReset, resetPassword };
