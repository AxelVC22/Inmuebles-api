const prisma = require('../prisma');
const bcrypt = require('bcryptjs');

const getUserProfile = async (req, res, next) => {
  const idUsuario = req.user.id;
  try {
    const profileData = await prisma.usuario.findUnique({
      where: { idUsuario: idUsuario },
      include: { Direccion: true },
    });

    if (!profileData) {
      return res.status(404).json({
        message: 'No se ha encontrado el usuario',
        data: null,
      });
    }

    delete profileData.hashPassword;

    res.status(200).json({
      message: 'Perfil de usuario obtenido exitosamente',
      data: profileData,
    });
  } catch (error) {
    next(error);
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    const idUsuario = req.user.id;
    const {
      nombre,
      apellidos,
      email,
      telefono,
      telefonoFijo,
      nacionalidad,
      fechaNacimiento,
      direccion,
    } = req.body;

    if (email) {
      const existingUser = await prisma.usuario.findUnique({
        where: { correoElectronico: email },
      });

      if (existingUser && existingUser.idUsuario !== idUsuario) {
        return res.status(400).json({
          message: 'El correo electrónico ya está en uso.',
        });
      }
    }

    const dataToUpdate = {
      nombre,
      apellidos,
      correoElectronico: email,
      telefono,
      telefonoFijo,
      nacionalidad,
      fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined,
    };

    Object.keys(dataToUpdate).forEach(
      (key) => dataToUpdate[key] === undefined && delete dataToUpdate[key],
    );

    if (direccion) {
      dataToUpdate.Direccion = {
        update: {
          calle: direccion.calle,
          noCalle: parseInt(direccion.noCalle || 0),
          colonia: direccion.colonia,
          ciudad: direccion.ciudad,
          estado: direccion.estado,
          codigoPostal: parseInt(direccion.codigoPostal || 0),
        },
      };
    }

    const updatedUser = await prisma.usuario.update({
      where: { idUsuario: idUsuario },
      data: dataToUpdate,
      include: { Direccion: true },
    });

    delete updatedUser.hashPassword;

    res.status(200).json({
      message: 'Perfil actualizado correctamente',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

const updateUserPassword = async (req, res, next) => {
  try {
    const idUsuario = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Debes proporcionar la contraseña actual y la nueva.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener al menos 8 caracteres.',
      });
    }

    const user = await prisma.usuario.findUnique({
      where: { idUsuario: idUsuario },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.hashPassword);

    if (!isMatch) {
      return res.status(400).json({
        error: 'La contraseña actual es incorrecta.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await prisma.usuario.update({
      where: { idUsuario: idUsuario },
      data: {
        hashPassword: newHash,
      },
    });

    res.status(200).json({
      message: 'Contraseña actualizada correctamente.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUserProfile, updateUserProfile, updateUserPassword };
