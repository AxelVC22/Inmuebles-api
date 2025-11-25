const prisma = require('../prisma');

const getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.categoriaInmueble.findMany({
      include: {
        SubtipoInmueble: true,
      },
    });

    if (!categories || categories.length === 0) {
      return res.status(200).json({
        message: 'No se encontraron categorías.',
      });
    }

    res.status(200).json({
      message: 'Categorías obtenidas exitosamente.',
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCategories };
