const prisma = require('../prisma');

const getUserPreferences = async (req, res, next) => {
  const idUsuario = req.user.id;
  try {
    const preferences = await prisma.preferencias.findUnique({
      where: { idUsuario: idUsuario },
      include: {
        CategoriaInmueble: true,
      },
    });

    if (!preferences) {
      return res.status(200).json({
        message: 'No se encontraron preferencias para el usuario.',
        data: null,
      });
    }

    res.status(200).json({
      message: 'Preferencias obtenidas exitosamente.',
      data: preferences,
    });
  } catch (error) {
    next(error);
  }
};

const updateUserPreferences = async (req, res, next) => {
  try {
    const idUsuario = req.user.id;
    const { presupuestoMin, presupuestoMax, idCategoria } = req.body;

    if (presupuestoMin && isNaN(presupuestoMin))
      return res.status(400).json({ error: 'Presupuesto mínimo inválido' });
    if (presupuestoMax && isNaN(presupuestoMax))
      return res.status(400).json({ error: 'Presupuesto máximo inválido' });

    const result = await prisma.preferencias.upsert({
      where: {
        idUsuario: idUsuario,
      },
      update: {
        presupuestoMin: parseFloat(presupuestoMin),
        presupuestoMax: parseFloat(presupuestoMax),
        idCategoria: idCategoria ? parseInt(idCategoria) : null,
      },
      create: {
        idUsuario: idUsuario,
        presupuestoMin: parseFloat(presupuestoMin),
        presupuestoMax: parseFloat(presupuestoMax),
        idCategoria: idCategoria ? parseInt(idCategoria) : null,
      },
    });

    res.json({
      message: 'Preferencias guardadas correctamente',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUserPreferences, updateUserPreferences };
