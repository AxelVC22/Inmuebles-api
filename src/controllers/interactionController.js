const prisma = require('../prisma');

const scheduleVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date } = req.body;
    const userId = req.user.id;

    const property = await prisma.inmueble.findUnique({
      where: { idInmueble: parseInt(id) },
      include: { Publicacion: true },
    });

    if (!property) {
      return res.status(404).json({ message: 'Propiedad no encontrada' });
    }

    if (property.idArrendador === userId) {
      return res.status(403).json({
        message: 'No puedes agendar una visita en tu propio inmueble.',
      });
    }

    if (!property.Publicacion || property.Publicacion.estado !== 'Publicada') {
      return res.status(400).json({ message: 'Esta propiedad no está disponible para visitas' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const nuevaVisita = await tx.visita.create({
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

      await tx.interaccion.create({
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
    const userId = parseInt(req.user.id);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuario no identificado' });
    }

    const whereClause = {
      OR: [{ idCliente: userId }, { Inmueble: { idArrendador: userId } }],
    };

    const visitas = await prisma.visita.findMany({
      where: whereClause,
      include: {
        Inmueble: {
          select: {
            titulo: true,
            Direccion: true,
            Publicacion: { select: { idPublicacion: true } },
            idArrendador: true,
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
    const idCliente = req.user.id;

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
        mensaje: 'El cliente solicitó información de contacto',
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Contacto registrado exitosamente.',
      data: {
        nombre: `${property.Arrendador.Usuario.nombre} ${property.Arrendador.Usuario.apellidos}`,
        telefono: property.Arrendador.Usuario.telefono,
        correo: property.Arrendador.Usuario.correoElectronico,
      },
    });
  } catch (error) {
    next(error);
  }
};

const cancelOrCompleteVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const userId = req.user.id;

    if (!['cancel', 'complete'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Acción no válida. Use "cancel" para cancelar o "complete" para finalizar.',
      });
    }

    const targetStatus = action === 'cancel' ? 'Cancelada' : 'Realizada';

    const visit = await prisma.visita.findUnique({
      where: { idVisita: parseInt(id) },
      include: {
        Inmueble: {
          select: { idArrendador: true },
        },
      },
    });

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visita no encontrada.' });
    }

    const isClient = visit.idCliente === userId;
    const isLandlord = visit.Inmueble.idArrendador === userId;

    if (!isClient && !isLandlord) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para modificar esta visita.',
      });
    }

    if (['Cancelada', 'Realizada'].includes(visit.estado)) {
      return res.status(400).json({
        success: false,
        message: `No se puede modificar una visita que ya está ${visit.estado}.`,
      });
    }

    if (action === 'complete') {
      if (!isLandlord) {
        return res.status(403).json({
          success: false,
          message: 'Solo el arrendador puede marcar la visita como realizada.',
        });
      }

      const visitDate = new Date(visit.fechaProgramada);
      const now = new Date();

      if (visitDate > now) {
        return res.status(400).json({
          success: false,
          message:
            'No puedes marcar como completada una visita que está programada para el futuro.',
        });
      }
    }

    const updatedVisit = await prisma.visita.update({
      where: { idVisita: parseInt(id) },
      data: { estado: targetStatus },
    });

    return res.status(200).json({
      success: true,
      message: `Visita ${targetStatus.toLowerCase()} exitosamente.`,
      data: updatedVisit,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scheduleVisit,
  getVisits,
  updateVisitStatus,
  contactProperty,
  cancelOrCompleteVisit,
};
