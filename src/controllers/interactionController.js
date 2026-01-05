const prisma = require('../prisma');

const scheduleVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date } = req.body;
    const userId = req.user.idUsuario;

    const property = await prisma.inmueble.findUnique({
      where: { idInmueble: parseInt(id) },
      include: { Publicacion: true },
    });

    if (!property) {
      return res.status(404).json({ message: 'Propiedad no encontrada' });
    }

    if (!property.Publicacion || property.Publicacion.estado !== 'Publicada') {
      return res.status(400).json({ message: 'Esta propiedad no está disponible para visitas' });
    }

    const result = await prisma.$transaction(async (prisma) => {
      const nuevaVisita = await prisma.visita.create({
        data: {
          idInmueble: parseInt(id),
          idCliente: userId,
          fechaProgramada: new Date(date),
          estado: 'Programada',
        },
        include: {
          Inmueble: { include: { Direccion: true } },
        },
      });

      await prisma.interaccion.create({
        data: {
          idCliente: userId,
          idPublicacion: property.Publicacion.idPublicacion,
          tipo: 'Visita',
          mensaje: `Visita programada para ${new Date(date).toLocaleString()}`,
        },
      });

      return nuevaVisita;
    });

    return res.status(201).json({
      message: 'Visita programada exitosamente',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getVisits = async (req, res, next) => {
  try {
    const userId = req.user.idUsuario;
    const role = req.user.rol;

    let whereClause = {};

    if (role === 'Cliente') {
      whereClause.idCliente = userId;
    } else if (role === 'Arrendador') {
      whereClause.Inmueble = {
        idArrendador: userId,
      };
    }

    const visitas = await prisma.visita.findMany({
      where: whereClause,
      include: {
        Inmueble: {
          select: {
            titulo: true,
            Direccion: true,
            Publicacion: { select: { idPublicacion: true } },
          },
        },
        Cliente: {
          select: {
            Usuario: { select: { nombre: true, apellidos: true, telefono: true } },
          },
        },
      },
      orderBy: { fechaProgramada: 'asc' },
    });

    res.status(200).json({
      success: true,
      count: visitas.length,
      data: visitas,
    });
  } catch (error) {
    next(error);
  }
};

const updateVisitStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['Programada', 'Confirmada', 'Cancelada', 'Realizada'].includes(estado)) {
      return res.status(400).json({ message: 'Estado de visita no válido' });
    }

    const updatedVisita = await prisma.visita.update({
      where: { idVisita: parseInt(id) },
      data: { estado: estado },
    });

    res.status(200).json({
      message: 'Estado de la visita actualizado.',
      data: updatedVisita,
    });
  } catch (error) {
    next(error);
  }
};

const contactProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { mensaje } = req.body;
    const idCliente = req.user.idUsuario;

    const property = await prisma.inmueble.findUnique({
      where: { idInmueble: parseInt(id) },
      include: {
        Publicacion: true,
        Arrendador: { include: { Usuario: true } },
      },
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Propiedad no encontrada' });
    }

    if (!property.Publicacion || property.Publicacion.estado !== 'Publicada') {
      return res.status(400).json({
        message: 'No se puede contactar: la propiedad no está publicada.',
      });
    }

    await prisma.interaccion.create({
      data: {
        idCliente: idCliente,
        idPublicacion: property.Publicacion.idPublicacion,
        tipo: 'Contacto',
        mensaje: mensaje?.trim() || 'Interesado en la propiedad',
      },
    });

    return res.status(200).json({
      message: 'Mensaje registrado exitosamente.',
      contactInfo: {
        nombre: `${property.Arrendador.Usuario.nombre} ${property.Arrendador.Usuario.apellidos}`,
        telefono: property.Arrendador.Usuario.telefono,
        email: property.Arrendador.Usuario.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { scheduleVisit, getVisits, updateVisitStatus, contactProperty };
