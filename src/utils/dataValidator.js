const validatePropertyData = (data) => {
  const errors = [];

  if (!data.titulo || data.titulo.trim().length === 0) {
    errors.push('El título es requerido');
  } else if (data.titulo.length > 100) {
    errors.push('El título no puede exceder 100 caracteres');
  }

  if (!data.descripcion || data.descripcion.trim().length === 0) {
    errors.push('La descripción es requerida');
  }

  if (!data.arrendadorId || typeof data.arrendadorId !== 'number') {
    errors.push('El ID del arrendador es requerido y debe ser un número');
  }

  if (!data.subtipoId || typeof data.subtipoId !== 'number') {
    errors.push('El ID del subtipo es requerido y debe ser un número');
  }

  if (!data.detallesFisicos) {
    errors.push('Los detalles físicos son requeridos');
  } else {
    const { numRecamaras, numBaños, numMediosBaños, superficieTotal, superficieConstruida } =
      data.detallesFisicos;

    if (numRecamaras === undefined || numRecamaras < 0) {
      errors.push('El número de recámaras debe ser mayor o igual a 0');
    }

    if (numBaños === undefined || numBaños < 0) {
      errors.push('El número de baños debe ser mayor o igual a 0');
    }

    if (numMediosBaños === undefined || numMediosBaños < 0) {
      errors.push('El número de medios baños debe ser mayor o igual a 0');
    }

    if (!superficieTotal || superficieTotal <= 0) {
      errors.push('La superficie total debe ser mayor a 0');
    }

    if (!superficieConstruida || superficieConstruida <= 0) {
      errors.push('La superficie construida debe ser mayor a 0');
    }

    if (superficieConstruida > superficieTotal) {
      errors.push('La superficie construida no puede ser mayor a la superficie total');
    }

    if (typeof data.detallesFisicos.mascotasPermitidas !== 'boolean') {
      errors.push('El campo mascotasPermitidas debe ser booleano');
    }

    if (data.detallesFisicos.numPisos !== undefined && data.detallesFisicos.numPisos < 1) {
      errors.push('El número de pisos debe ser mayor o igual a 1');
    }
    if (data.detallesFisicos.antiguedad !== undefined && data.detallesFisicos.antiguedad < 0) {
      errors.push('La antigüedad debe ser mayor o igual a 0');
    }
    if (
      data.detallesFisicos.pisoUbicacion !== undefined &&
      data.detallesFisicos.pisoUbicacion < 0
    ) {
      errors.push('El piso de ubicación debe ser mayor o igual a 0');
    }
  }

  if (!data.direccion) {
    errors.push('La dirección es requerida');
  } else {
    const { calle, noCalle, colonia, ciudad, estado, codigoPostal } = data.direccion;

    if (!calle || calle.trim().length === 0) {
      errors.push('La calle es requerida');
    } else if (calle.length > 100) {
      errors.push('La calle no puede exceder 100 caracteres');
    }

    if (!noCalle || typeof noCalle !== 'number' || noCalle <= 0) {
      errors.push('El número de calle es requerido y debe ser mayor a 0');
    }

    if (!colonia || colonia.trim().length === 0) {
      errors.push('La colonia es requerida');
    } else if (colonia.length > 100) {
      errors.push('La colonia no puede exceder 100 caracteres');
    }

    if (!ciudad || ciudad.trim().length === 0) {
      errors.push('La ciudad es requerida');
    } else if (ciudad.length > 100) {
      errors.push('La ciudad no puede exceder 100 caracteres');
    }

    if (!estado || estado.trim().length === 0) {
      errors.push('El estado es requerido');
    } else if (estado.length > 50) {
      errors.push('El estado no puede exceder 50 caracteres');
    }

    if (
      !codigoPostal ||
      typeof codigoPostal !== 'number' ||
      codigoPostal < 10000 ||
      codigoPostal > 99999
    ) {
      errors.push('El código postal debe ser un número válido de 5 dígitos');
    }
  }

  if (!data.amenidades) {
    errors.push('Las amenidades son requeridas');
  } else {
    const amenidadesFields = [
      'balconTerraza',
      'bodega',
      'chimenea',
      'estacionamiento',
      'jacuzzi',
      'jardin',
      'alberca',
    ];
    amenidadesFields.forEach((field) => {
      if (typeof data.amenidades[field] !== 'boolean') {
        errors.push(`El campo ${field} en amenidades debe ser booleano`);
      }
    });
  }

  if (!data.servicios) {
    errors.push('Los servicios son requeridos');
  } else {
    const serviciosFields = [
      'aguaPotable',
      'cable',
      'drenaje',
      'electricidad',
      'gasEstacionario',
      'internet',
      'telefono',
      'transportePublico',
    ];
    serviciosFields.forEach((field) => {
      if (typeof data.servicios[field] !== 'boolean') {
        errors.push(`El campo ${field} en servicios debe ser booleano`);
      }
    });
  }

  if (!data.geolocalizacion) {
    errors.push('La geolocalización es requerida');
  } else {
    const { latitud, longitud } = data.geolocalizacion;

    if (latitud === undefined || latitud < -90 || latitud > 90) {
      errors.push('La latitud debe estar entre -90 y 90 grados');
    }

    if (longitud === undefined || longitud < -180 || longitud > 180) {
      errors.push('La longitud debe estar entre -180 y 180 grados');
    }
  }

  if (!data.publicacion) {
    errors.push('Los datos de publicación son requeridos');
  } else {
    const { tipoOperacion, precio, divisa } = data.publicacion;

    if (!tipoOperacion || !['Venta', 'Renta'].includes(tipoOperacion)) {
      errors.push('El tipo de operación debe ser "Venta" o "Renta"');
    }

    if (!precio || typeof precio !== 'number' || precio <= 0) {
      errors.push('El precio debe ser un número mayor a 0');
    }

    if (divisa !== 'MXN') {
      errors.push('La divisa debe ser MXN');
    }

    if (tipoOperacion === 'Renta') {
      if (
        data.publicacion.requiereAval !== undefined &&
        typeof data.publicacion.requiereAval !== 'boolean'
      ) {
        errors.push('El campo requiereAval debe ser booleano');
      }

      if (
        data.publicacion.depositoRequerido !== undefined &&
        typeof data.publicacion.depositoRequerido !== 'boolean'
      ) {
        errors.push('El campo depositoRequerido debe ser booleano');
      }

      if (
        data.publicacion.depositoRequerido &&
        (!data.publicacion.montoDeposito || data.publicacion.montoDeposito <= 0)
      ) {
        errors.push('Si se requiere depósito, el monto debe ser mayor a 0');
      }

      if (
        data.publicacion.plazoMinimoMeses !== undefined &&
        (typeof data.publicacion.plazoMinimoMeses !== 'number' ||
          data.publicacion.plazoMinimoMeses <= 0)
      ) {
        errors.push('El plazo mínimo debe ser un número mayor a 0');
      }

      if (
        data.publicacion.plazoMaximoMeses !== undefined &&
        (typeof data.publicacion.plazoMaximoMeses !== 'number' ||
          data.publicacion.plazoMaximoMeses <= 0)
      ) {
        errors.push('El plazo máximo debe ser un número mayor a 0');
      }

      if (
        data.publicacion.plazoMinimoMeses &&
        data.publicacion.plazoMaximoMeses &&
        data.publicacion.plazoMinimoMeses > data.publicacion.plazoMaximoMeses
      ) {
        errors.push('El plazo mínimo no puede ser mayor al plazo máximo');
      }
    }
  }

  return errors;
};

module.exports = { validatePropertyData };
