const prisma = require('../prisma');
const bcrypt = require('bcryptjs');

const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await prisma.usuario.findUnique({
      where: { idUsuario: userId },
      include: {
        Direccion: true,
        Arrendador: true,
        Cliente: {
          include: {
            Preferencias: {
              include: { CategoriaInmueble: true },
            },
          },
        },
      },
    });

    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const { hashPassword, ...userWithoutPassword } = user;
    return res.status(200).json({ success: true, data: userWithoutPassword });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    const updateData = {
      nombre: data.nombre?.trim(),
      apellidos: data.apellidos?.trim(),
      telefono: data.telefono,
      telefonoFijo: data.telefonoFijo ?? undefined,
      fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : undefined,
      nacionalidad: data.nacionalidad?.trim(),
    };

    if (data.direccion) {
      updateData.Direccion = {
        upsert: {
          create: {
            calle: data.direccion.calle?.trim(),
            noCalle: data.direccion.noCalle ? parseInt(data.direccion.noCalle) : 0,
            colonia: data.direccion.colonia?.trim(),
            ciudad: data.direccion.ciudad?.trim(),
            estado: data.direccion.estado?.trim(),
            codigoPostal: data.direccion.codigoPostal ? parseInt(data.direccion.codigoPostal) : 0,
          },
          update: {
            calle: data.direccion.calle?.trim(),
            noCalle: data.direccion.noCalle ? parseInt(data.direccion.noCalle) : undefined,
            colonia: data.direccion.colonia?.trim(),
            ciudad: data.direccion.ciudad?.trim(),
            estado: data.direccion.estado?.trim(),
            codigoPostal: data.direccion.codigoPostal
              ? parseInt(data.direccion.codigoPostal)
              : undefined,
          },
        },
      };
    }

    if (data.rfc) {
      updateData.Arrendador = {
        upsert: {
          create: { rfc: data.rfc.trim().toUpperCase() },
          update: { rfc: data.rfc.trim().toUpperCase() },
        },
      };
    }

    if (data.preferencias) {
      updateData.Cliente = {
        upsert: {
          create: {
            Preferencias: {
              create: {
                presupuestoMin: parseFloat(data.preferencias.presupuestoMin) || 0,
                presupuestoMax: parseFloat(data.preferencias.presupuestoMax) || 0,
                idCategoria: data.preferencias.idCategoria
                  ? parseInt(data.preferencias.idCategoria)
                  : undefined,
              },
            },
          },
          update: {
            Preferencias: {
              upsert: {
                create: {
                  presupuestoMin: parseFloat(data.preferencias.presupuestoMin) || 0,
                  presupuestoMax: parseFloat(data.preferencias.presupuestoMax) || 0,
                  idCategoria: data.preferencias.idCategoria
                    ? parseInt(data.preferencias.idCategoria)
                    : undefined,
                },
                update: {
                  presupuestoMin: data.preferencias.presupuestoMin
                    ? parseFloat(data.preferencias.presupuestoMin)
                    : undefined,
                  presupuestoMax: data.preferencias.presupuestoMax
                    ? parseFloat(data.preferencias.presupuestoMax)
                    : undefined,
                  idCategoria: data.preferencias.idCategoria
                    ? parseInt(data.preferencias.idCategoria)
                    : undefined,
                },
              },
            },
          },
        },
      };
    }

    const updatedUser = await prisma.usuario.update({
      where: { idUsuario: userId },
      data: updateData,
      include: {
        Direccion: true,
        Arrendador: true,
        Cliente: { include: { Preferencias: { include: { CategoriaInmueble: true } } } },
      },
    });
    const { hashPassword, ...userWithoutPassword } = updatedUser;

    return res.status(200).json({
      success: true,
      message: 'Perfil actualizado',
      data: userWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Las contraseñas no coinciden' });
    }

    const user = await prisma.usuario.findUnique({
      where: { idUsuario: userId },
      select: { hashPassword: true },
    });

    const isValid = await bcrypt.compare(currentPassword, user.hashPassword);
    if (!isValid)
      return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta' });

    const isSame = await bcrypt.compare(newPassword, user.hashPassword);
    if (isSame)
      return res
        .status(400)
        .json({ success: false, message: 'La nueva contraseña debe ser diferente' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.usuario.update({
      where: { idUsuario: userId },
      data: { hashPassword: hashedPassword },
    });

    return res.status(200).json({ success: true, message: 'Contraseña actualizada' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};
