const prisma = require('../prisma');
const bcrypt = require('bcryptjs');

const generateFakeReference = (type) => {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const timestamp = Date.now().toString().slice(-4);

  switch (type) {
    case 'Transferencia':
      return `SPEI-${timestamp}${randomNum}`;
    case 'Tarjeta':
      return `AUTH-VISA-${randomNum}`;
    case 'PayPal':
      return `PAYID-${timestamp}-${randomNum}`;
    case 'MercadoPago':
      return `MP-${randomNum}-${timestamp}`;
    default:
      return `GEN-${randomNum}`;
  }
};

const registerPaymentMethod = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { tipo, datos, predeterminado } = req.body;
    const isDefault = predeterminado;
    const paymentData = datos;
    const type = tipo;

    const salt = await bcrypt.genSalt(10);
    const hashedData = await bcrypt.hash(paymentData, salt);

    const newMethod = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.metodoPago.updateMany({
          where: { idUsuario: userId },
          data: { predeterminado: false },
        });
      }

      return await tx.metodoPago.create({
        data: {
          idUsuario: userId,
          tipo: type,
          datosHasheados: hashedData,
          predeterminado: isDefault || false,
        },
      });
    });

    res.status(201).json({
      message: 'Método de pago guardado exitosamente.',
      data: {
        idMetodo: newMethod.idMetodo,
        tipo: newMethod.tipo,
        mascara: `**** ${paymentData.slice(-4)}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPaymentMethods = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const methods = await prisma.metodoPago.findMany({
      where: { idUsuario: userId },
      select: {
        idMetodo: true,
        tipo: true,
        predeterminado: true,
      },
    });

    res.status(200).json({
      data: methods,
    });
  } catch (error) {
    next(error);
  }
};

const registerPayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { idMetodo, monto } = req.body;
    const amount = parseFloat(monto);
    const methodId = parseInt(idMetodo);

    const method = await prisma.metodoPago.findUnique({
      where: { idMetodo: methodId },
    });

    if (!method || method.idUsuario !== userId) {
      return res.status(400).json({
        error: 'Método de pago inválido o no pertenece al usuario.',
      });
    }

    const fakeReference = generateFakeReference(method.tipo);
    const simulatedStatus = 'Pagado';

    const newPayment = await prisma.pago.create({
      data: {
        idMetodo: methodId,
        monto: amount,
        fecha: new Date(),
        estado: simulatedStatus,
        referenciaPasarela: fakeReference,
      },
    });

    res.status(200).json({
      message: 'Pago procesado correctamente.',
      ticket: {
        folio: newPayment.idPago,
        monto: newPayment.monto,
        estado: newPayment.estado,
        referencia: newPayment.referenciaPasarela,
        fecha: newPayment.fecha,
        metodo: method.tipo,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerPaymentMethod,
  getPaymentMethods,
  registerPayment,
};
