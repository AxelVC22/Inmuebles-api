const formatPropertyWithImage = (property) => {
  const precio =
    property.Publicacion.tipoOperacion === 'Venta'
      ? property.Publicacion.precioVenta
      : property.Publicacion.precioRentaMensual;

  let imagen = null;
  if (property.Archivo && property.Archivo.length > 0) {
    const archivo = property.Archivo[0];
    const base64String = archivo.datos.toString('base64');
    imagen = {
      id: archivo.idArchivo,
      nombre: archivo.nombreOriginal,
      extension: archivo.extension,
      url: `data:${archivo.tipo};base64,${base64String}`,
    };
  }

  return {
    id: property.idInmueble,
    titulo: property.titulo,
    ciudad: property.Direccion.ciudad,
    precio: precio,
    divisa: property.Publicacion.divisa,
    tipoOperacion: property.Publicacion.tipoOperacion,
    imagen: imagen,
  };
};

const propertySelectWithImage = {
  idInmueble: true,
  titulo: true,
  Direccion: {
    select: {
      ciudad: true,
    },
  },
  Publicacion: {
    select: {
      tipoOperacion: true,
      precioVenta: true,
      precioRentaMensual: true,
      divisa: true,
    },
  },
  Archivo: {
    where: { visible: true },
    select: {
      idArchivo: true,
      datos: true,
      nombreOriginal: true,
      tipo: true,
      extension: true,
    },
    take: 1,
  },
};

const createPaginationResponse = (page, limit, totalCount) => {
  const totalPages = Math.ceil(totalCount / limit);
  return {
    currentPage: parseInt(page),
    totalPages,
    totalResults: totalCount,
    resultsPerPage: limit,
    hasNextPage: parseInt(page) < totalPages,
    hasPreviousPage: parseInt(page) > 1,
  };
};

module.exports = {
  formatPropertyWithImage,
  propertySelectWithImage,
  createPaginationResponse,
};
