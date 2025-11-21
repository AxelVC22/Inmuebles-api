const prisma = require('../prisma');

const getCategories = async (req, res, next) => {
    try {
        const categories = await prisma.categoriaInmueble.findMany({
            include: {
                SubtipoInmueble: true
            }
        });

        res.status(200).json({
            success: true,
            message: 'Categorías obtenidas exitosamente.',
            data: categories
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getCategories };