const prisma = require('../prisma');
const path = require('path');
const sharp = require('sharp');
const { validatePropertyData } = require('../utils/dataValidator');
const {
  formatPropertyWithImage,
  propertySelectWithImage,
  createPaginationResponse,
} = require('../utils/propertyHelpers');

const getPropertyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const property = await prisma.inmueble.findUnique({
      where: { idInmueble: parseInt(id) },
      include: {
        Direccion: true,
        Publicacion: true,
        Amenidades: true,
        Geolocalizacion: true,
        Servicios: true,
        SubtipoInmueble: {
          include: {
            CategoriaInmueble: true,
          },
        },
      },
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Propiedad no encontrada',
      });
    }

    return res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error) {
    next(error);
  }
};

const createProperty = async (req, res, next) => {
  try {
    const data = req.body;

    const validationErrors = validatePropertyData(data);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: 'Errores de validación',
        errors: validationErrors,
      });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { idUsuario: data.arrendadorId },
      include: {
        Arrendador: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    const subtipo = await prisma.subtipoInmueble.findUnique({
      where: { idSubtipo: data.subtipoId },
    });

    if (!subtipo) {
      return res.status(404).json({
        success: false,
        message: 'Subtipo de inmueble no encontrado',
      });
    }

    const isSaleOperation = data.publicacion.tipoOperacion === 'Venta';
    const salePrice = isSaleOperation ? data.publicacion.precio : null;
    const rentPrice = !isSaleOperation ? data.publicacion.precio : null;

    const result = await prisma.inmueble.create({
      data: {
        titulo: data.titulo.trim(),
        descripcion: data.descripcion.trim(),
        numRecamaras: data.detallesFisicos.numRecamaras,
        numBa_os: data.detallesFisicos.numBaños,
        numMediosBa_os: data.detallesFisicos.numMediosBaños,
        superficieTotal: data.detallesFisicos.superficieTotal,
        superficieConstruida: data.detallesFisicos.superficieConstruida,
        mascotasPermitidas: data.detallesFisicos.mascotasPermitidas,
        numPisos: data.detallesFisicos.numPisos || 1,
        antiguedad: data.detallesFisicos.antiguedad || 0,
        pisoUbicacion: data.detallesFisicos.pisoUbicacion || null,
        referencias: data.referencias ? data.referencias.trim() : null,

        Arrendador: {
          connect: { idUsuario: data.arrendadorId },
        },
        SubtipoInmueble: {
          connect: { idSubtipo: data.subtipoId },
        },

        Direccion: {
          create: {
            calle: data.direccion.calle.trim(),
            noCalle: data.direccion.noCalle,
            colonia: data.direccion.colonia.trim(),
            ciudad: data.direccion.ciudad.trim(),
            estado: data.direccion.estado.trim(),
            codigoPostal: data.direccion.codigoPostal,
          },
        },

        Amenidades: {
          create: {
            balconTerraza: data.amenidades.balconTerraza,
            bodega: data.amenidades.bodega,
            chimenea: data.amenidades.chimenea,
            estacionamiento: data.amenidades.estacionamiento,
            jacuzzi: data.amenidades.jacuzzi,
            jardin: data.amenidades.jardin,
            alberca: data.amenidades.alberca,
          },
        },

        Servicios: {
          create: {
            aguaPotable: data.servicios.aguaPotable,
            cable: data.servicios.cable,
            drenaje: data.servicios.drenaje,
            electricidad: data.servicios.electricidad,
            gasEstacionario: data.servicios.gasEstacionario,
            internet: data.servicios.internet,
            telefono: data.servicios.telefono,
            transportePublico: data.servicios.transportePublico,
          },
        },

        Geolocalizacion: {
          create: {
            latitud: data.geolocalizacion.latitud,
            longitud: data.geolocalizacion.longitud,
          },
        },

        Publicacion: {
          create: {
            tipoOperacion: data.publicacion.tipoOperacion,
            estado: 'Publicada',
            divisa: data.publicacion.divisa || 'MXN',
            precioVenta: salePrice,
            precioRentaMensual: rentPrice,

            requiereAval: data.publicacion.requiereAval || false,
            depositoRequerido: data.publicacion.depositoRequerido || false,
            montoDeposito: data.publicacion.montoDeposito || null,

            plazoMinimoMeses: data.publicacion.plazoMinimoMeses || null,
            plazoMaximoMeses: data.publicacion.plazoMaximoMeses || null,
            precioPorM2:
              isSaleOperation && data.detallesFisicos.superficieTotal > 0
                ? data.publicacion.precio / data.detallesFisicos.superficieTotal
                : null,
          },
        },

        HistorialEstado: {
          create: {
            estado: 'Disponible',
            motivoCambio: 'Registro inicial',
          },
        },
      },

      include: {
        Direccion: true,
        Publicacion: true,
        Amenidades: true,
        Geolocalizacion: true,
        Servicios: true,
        SubtipoInmueble: {
          include: {
            CategoriaInmueble: true,
          },
        },
        HistorialEstado: true,
      },
    });

    return res.status(201).json({
      message: 'Propiedad creada exitosamente',
      propertyId: result.idInmueble,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existingProperty = await prisma.inmueble.findUnique({
      where: { idInmueble: parseInt(id) },
      include: { Arrendador: true },
    });

    if (!existingProperty) {
      return res.status(404).json({
        success: false,
        message: 'Propiedad no encontrada',
      });
    }

    const updateData = {};

    if (data.titulo) updateData.titulo = data.titulo.trim();
    if (data.descripcion) updateData.descripcion = data.descripcion.trim();
    if (data.referencias !== undefined) updateData.referencias = data.referencias?.trim() || null;

    if (data.detallesFisicos) {
      if (data.detallesFisicos.numRecamaras !== undefined)
        updateData.numRecamaras = data.detallesFisicos.numRecamaras;
      if (data.detallesFisicos.numBaños !== undefined)
        updateData.numBaños = data.detallesFisicos.numBaños;
      if (data.detallesFisicos.numMediosBaños !== undefined)
        updateData.numMediosBaños = data.detallesFisicos.numMediosBaños;
      if (data.detallesFisicos.superficieTotal !== undefined)
        updateData.superficieTotal = data.detallesFisicos.superficieTotal;
      if (data.detallesFisicos.superficieConstruida !== undefined)
        updateData.superficieConstruida = data.detallesFisicos.superficieConstruida;
      if (data.detallesFisicos.mascotasPermitidas !== undefined)
        updateData.mascotasPermitidas = data.detallesFisicos.mascotasPermitidas;
      if (data.detallesFisicos.numPisos !== undefined)
        updateData.numPisos = data.detallesFisicos.numPisos;
      if (data.detallesFisicos.antiguedad !== undefined)
        updateData.antiguedad = data.detallesFisicos.antiguedad;
      if (data.detallesFisicos.pisoUbicacion !== undefined)
        updateData.pisoUbicacion = data.detallesFisicos.pisoUbicacion;
    }

    if (data.direccion) {
      await prisma.direccion.update({
        where: { idDireccion: existingProperty.idDireccion },
        data: {
          calle: data.direccion.calle?.trim(),
          noCalle: data.direccion.noCalle,
          colonia: data.direccion.colonia?.trim(),
          ciudad: data.direccion.ciudad?.trim(),
          estado: data.direccion.estado?.trim(),
          codigoPostal: data.direccion.codigoPostal,
        },
      });
    }

    if (data.amenidades) {
      await prisma.amenidades.update({
        where: { idInmueble: parseInt(id) },
        data: {
          balconTerraza: data.amenidades.balconTerraza,
          bodega: data.amenidades.bodega,
          chimenea: data.amenidades.chimenea,
          estacionamiento: data.amenidades.estacionamiento,
          jacuzzi: data.amenidades.jacuzzi,
          jardin: data.amenidades.jardin,
          alberca: data.amenidades.alberca,
        },
      });
    }

    if (data.servicios) {
      await prisma.servicios.update({
        where: { idInmueble: parseInt(id) },
        data: {
          aguaPotable: data.servicios.aguaPotable,
          cable: data.servicios.cable,
          drenaje: data.servicios.drenaje,
          electricidad: data.servicios.electricidad,
          gasEstacionario: data.servicios.gasEstacionario,
          internet: data.servicios.internet,
          telefono: data.servicios.telefono,
          transportePublico: data.servicios.transportePublico,
        },
      });
    }

    if (data.geolocalizacion) {
      await prisma.geolocalizacion.update({
        where: { idInmueble: parseInt(id) },
        data: {
          latitud: data.geolocalizacion.latitud,
          longitud: data.geolocalizacion.longitud,
        },
      });
    }

    if (data.publicacion) {
      const isSaleOperation = data.publicacion.tipoOperacion === 'Venta';
      const salePrice = isSaleOperation && data.publicacion.precio ? data.publicacion.precio : null;
      const rentPrice =
        !isSaleOperation && data.publicacion.precio ? data.publicacion.precio : null;

      await prisma.publicacion.update({
        where: { idInmueble: parseInt(id) },
        data: {
          tipoOperacion: data.publicacion.tipoOperacion,
          precioVenta: salePrice,
          precioRentaMensual: rentPrice,
          divisa: data.publicacion.divisa || 'MXN',
          requiereAval: data.publicacion.requiereAval,
          depositoRequerido: data.publicacion.depositoRequerido,
          montoDeposito: data.publicacion.montoDeposito,
          plazoMinimoMeses: data.publicacion.plazoMinimoMeses,
          plazoMaximoMeses: data.publicacion.plazoMaximoMeses,
          precioPorM2:
            isSaleOperation && updateData.superficieTotal && updateData.superficieTotal > 0
              ? data.publicacion.precio / updateData.superficieTotal
              : existingProperty.superficieTotal > 0 && isSaleOperation && data.publicacion.precio
                ? data.publicacion.precio / existingProperty.superficieTotal
                : null,
        },
      });
    }

    const updatedProperty = await prisma.inmueble.update({
      where: { idInmueble: parseInt(id) },
      data: updateData,
      include: {
        Direccion: true,
        Publicacion: true,
        Amenidades: true,
        Geolocalizacion: true,
        Servicios: true,
        SubtipoInmueble: {
          include: {
            CategoriaInmueble: true,
          },
        },
        HistorialEstado: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Propiedad actualizada exitosamente',
      data: updatedProperty,
    });
  } catch (error) {
    next(error);
  }
};

const uploadPropertyImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const propertyId = parseInt(id);

    const property = await prisma.inmueble.findUnique({ where: { idInmueble: propertyId } });
    if (!property)
      return res.status(404).json({ success: false, message: 'Propiedad no encontrada' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No se enviaron archivos' });
    }

    const uploadPromises = req.files.map(async (file) => {
      const processedBuffer = await sharp(file.buffer)
        .resize(1200, null, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      return prisma.archivo.create({
        data: {
          datos: processedBuffer,
          nombreOriginal: file.originalname,
          extension: 'webp',
          tipo: 'image/webp',
          visible: true,
          idInmueble: propertyId,
        },
        select: {
          idArchivo: true,
          nombreOriginal: true,
          tipo: true,
        },
      });
    });

    const archivosGuardados = await Promise.all(uploadPromises);

    return res.status(201).json({
      message: `${archivosGuardados.length} imágenes procesadas y guardadas correctamente.`,
      data: archivosGuardados,
    });
  } catch (error) {
    next(error);
  }
};

const deletePropertyImage = async (req, res, next) => {
  try {
    const { id, imgId } = req.params;

    const archivo = await prisma.archivo.findFirst({
      where: {
        idArchivo: parseInt(imgId),
        idInmueble: parseInt(id),
      },
    });

    if (!archivo) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada',
      });
    }

    await prisma.archivo.delete({
      where: { idArchivo: parseInt(imgId) },
    });

    return res.status(200).json({
      success: true,
      message: 'Imagen eliminada exitosamente',
    });
  } catch (error) {
    next(error);
  }
};

const getFilesByProperty = async (req, res, next) => {
  try {
    const { id } = req.params;

    const archivos = await prisma.archivo.findMany({
      where: {
        idInmueble: parseInt(id),
        visible: true,
      },
      select: {
        idArchivo: true,
        datos: true,
        nombreOriginal: true,
        tipo: true,
        extension: true,
      },
    });

    if (!archivos || archivos.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No hay imágenes para esta propiedad',
        data: [],
      });
    }

    const dataFormatted = archivos.map((archivo) => {
      const base64String = archivo.datos.toString('base64');

      return {
        id: archivo.idArchivo,
        nombre: archivo.nombreOriginal,
        extension: archivo.extension,
        imagenRender: `data:${archivo.tipo};base64,${base64String}`,
      };
    });

    return res.status(200).json({
      success: true,
      data: dataFormatted,
    });
  } catch (error) {
    next(error);
  }
};

const getMyProperties = async (req, res, next) => {
  try {
    const userId = req.user.idUsuario;

    const properties = await prisma.inmueble.findMany({
      where: { idArrendador: userId },
      select: {
        ...propertySelectWithImage,
        Publicacion: {
          select: {
            estado: true,
            tipoOperacion: true,
            precioVenta: true,
            precioRentaMensual: true,
            divisa: true,
          },
        },
        _count: {
          select: {
            Visita: true,
          },
        },
      },
      orderBy: {
        idInmueble: 'desc',
      },
    });

    const formattedProperties = properties.map((property) => ({
      ...formatPropertyWithImage(property),
      estadoPublicacion: property.Publicacion.estado,
      totalVisitas: property._count.Visita,
    }));

    return res.status(200).json({
      success: true,
      count: formattedProperties.length,
      data: formattedProperties,
    });
  } catch (error) {
    next(error);
  }
};

const searchProperties = async (req, res, next) => {
  try {
    const { titulo, idCategoria, page = 1, limit = 20 } = req.query;

    if (!titulo && !idCategoria) {
      return res.status(400).json({
        success: false,
        message: 'Debes proporcionar al menos un parámetro de búsqueda: titulo o idCategoria',
      });
    }

    const whereConditions = {
      Publicacion: {
        estado: 'Publicada',
      },
    };

    if (titulo) {
      whereConditions.titulo = {
        contains: titulo,
        mode: 'insensitive',
      };
    }

    if (idCategoria) {
      whereConditions.SubtipoInmueble = {
        idCategoria: parseInt(idCategoria),
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [properties, totalCount] = await Promise.all([
      prisma.inmueble.findMany({
        where: whereConditions,
        select: propertySelectWithImage,
        orderBy: {
          idInmueble: 'desc',
        },
        skip,
        take,
      }),
      prisma.inmueble.count({ where: whereConditions }),
    ]);

    const formattedProperties = properties.map(formatPropertyWithImage);

    return res.status(200).json({
      success: true,
      data: formattedProperties,
      pagination: createPaginationResponse(page, take, totalCount),
      searchParams: {
        titulo: titulo || null,
        idCategoria: idCategoria ? parseInt(idCategoria) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getRecommendedProperties = async (req, res, next) => {
  try {
    const userId = req.user.idUsuario;
    const { page = 1, limit = 20 } = req.query;

    const preferencias = await prisma.preferencias.findUnique({
      where: { idUsuario: userId },
    });

    const whereConditions = {
      Publicacion: {
        estado: 'Publicada',
      },
    };

    if (preferencias.idCategoria) {
      whereConditions.SubtipoInmueble = {
        idCategoria: preferencias.idCategoria,
      };
    }

    if (preferencias.presupuestoMin || preferencias.presupuestoMax) {
      whereConditions.Publicacion.OR = [];

      const ventaCondition = { tipoOperacion: 'Venta' };
      if (preferencias.presupuestoMin) {
        ventaCondition.precioVenta = { gte: preferencias.presupuestoMin };
      }
      if (preferencias.presupuestoMax) {
        ventaCondition.precioVenta = {
          ...ventaCondition.precioVenta,
          lte: preferencias.presupuestoMax,
        };
      }
      whereConditions.Publicacion.OR.push(ventaCondition);

      const rentaCondition = { tipoOperacion: 'Renta' };
      if (preferencias.presupuestoMin) {
        rentaCondition.precioRentaMensual = { gte: preferencias.presupuestoMin };
      }
      if (preferencias.presupuestoMax) {
        rentaCondition.precioRentaMensual = {
          ...rentaCondition.precioRentaMensual,
          lte: preferencias.presupuestoMax,
        };
      }
      whereConditions.Publicacion.OR.push(rentaCondition);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [properties, totalCount] = await Promise.all([
      prisma.inmueble.findMany({
        where: whereConditions,
        select: propertySelectWithImage,
        orderBy: {
          idInmueble: 'desc',
        },
        skip,
        take,
      }),
      prisma.inmueble.count({ where: whereConditions }),
    ]);

    const formattedProperties = properties.map(formatPropertyWithImage);

    return res.status(200).json({
      success: true,
      data: formattedProperties,
      pagination: createPaginationResponse(page, take, totalCount),
      searchParams: {
        basedOnPreferences: true,
        idCategoria: preferencias.idCategoria || null,
        presupuestoMin: preferencias.presupuestoMin || null,
        presupuestoMax: preferencias.presupuestoMax || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPropertyById,
  createProperty,
  updateProperty,
  uploadPropertyImages,
  deletePropertyImage,
  getFilesByProperty,
  getMyProperties,
  searchProperties,
  getRecommendedProperties,
};
