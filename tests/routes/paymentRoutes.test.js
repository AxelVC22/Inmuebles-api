const request = require('supertest');
const express = require('express');
const { PrismockClient } = require('prismock');

let mockPrisma = {};
jest.mock('../../src/prisma', () => mockPrisma);

jest.mock('../../src/middlewares/authMiddleware', () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: 1, rol: 'Cliente' };
    next();
  },
}));

const paymentRoutes = require('../../src/routes/paymentRoutes');

describe('Rutas de Pagos (PaymentRoutes)', () => {
  let app;

  beforeAll(async () => {
    const db = new PrismockClient();
    Object.assign(mockPrisma, db);
  });

  beforeEach(async () => {
    if (mockPrisma.pago) await mockPrisma.pago.deleteMany();
    if (mockPrisma.metodoPago) await mockPrisma.metodoPago.deleteMany();
    if (mockPrisma.usuario) await mockPrisma.usuario.deleteMany();

    await mockPrisma.usuario.create({
      data: {
        idUsuario: 1,
        nombre: 'Test',
        apellidos: 'User',
        correoElectronico: 'test@test.com',
        hashPassword: 'pass',
        rol: 'Cliente',
        telefono: '555',
        fechaNacimiento: new Date(),
        nacionalidad: 'MX',
        estadoCuenta: 'Activo',
      },
    });

    app = express();
    app.use(express.json());
    app.use('/api/payments', paymentRoutes);
  });

  describe('POST /api/payments/methods', () => {
    it('Registra un método de pago correctamente', async () => {
      const data = {
        tipo: 'Tarjeta',
        datos: '4152313255551111',
        predeterminado: true,
      };

      const res = await request(app).post('/api/payments/methods').send(data);

      if (res.statusCode === 500) console.error(res.body);

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Método de pago guardado exitosamente.');
      expect(res.body.data.mascara).toBe('**** 1111');

      const metodo = await mockPrisma.metodoPago.findFirst({ where: { idUsuario: 1 } });
      expect(metodo).toBeTruthy();
      expect(metodo.datosHasheados).not.toBe(data.datos);
    });

    it('Desmarca el método anterior si agrego uno nuevo como predeterminado', async () => {
      await mockPrisma.metodoPago.create({
        data: { idUsuario: 1, tipo: 'PayPal', datosHasheados: 'x', predeterminado: true },
      });

      const res = await request(app).post('/api/payments/methods').send({
        tipo: 'Tarjeta',
        datos: '5555444433332222',
        predeterminado: true,
      });

      expect(res.statusCode).toBe(201);

      const metodos = await mockPrisma.metodoPago.findMany({ where: { idUsuario: 1 } });

      const payPal = metodos.find((m) => m.tipo === 'PayPal');
      const tarjeta = metodos.find((m) => m.tipo === 'Tarjeta');

      expect(payPal.predeterminado).toBe(false);
      expect(tarjeta.predeterminado).toBe(true);
    });
  });

  describe('GET /api/payments/methods', () => {
    it('Lista los métodos del usuario', async () => {
      await mockPrisma.metodoPago.create({
        data: { idUsuario: 1, tipo: 'Transferencia', datosHasheados: 'x', predeterminado: false },
      });

      const res = await request(app).get('/api/payments/methods');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].tipo).toBe('Transferencia');
    });
  });

  describe('POST /api/payments/pay', () => {
    it('Procesa un pago exitosamente y generar ticket', async () => {
      const metodo = await mockPrisma.metodoPago.create({
        data: {
          idUsuario: 1,
          tipo: 'Tarjeta',
          datosHasheados: 'hash',
          predeterminado: true,
        },
      });

      const pagoData = {
        idMetodo: metodo.idMetodo,
        monto: 500.5,
      };

      const res = await request(app).post('/api/payments/pay').send(pagoData);

      if (res.statusCode === 500) console.error(res.body);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Pago procesado correctamente.');

      expect(res.body.ticket.estado).toBe('Pagado');
      expect(res.body.ticket.monto).toBe(500.5);
      expect(res.body.ticket.referencia).toContain('AUTH-VISA');

      const pagoEnDb = await mockPrisma.pago.findFirst({ where: { idMetodo: metodo.idMetodo } });
      expect(pagoEnDb).toBeTruthy();
    });

    it('Falla si intento pagar con una tarjeta ajena (Otro usuario)', async () => {
      await mockPrisma.usuario.create({
        data: {
          idUsuario: 2,
          nombre: 'Otro',
          apellidos: 'User',
          correoElectronico: 'otro@test.com',
          hashPassword: 'x',
          rol: 'C',
          telefono: 'x',
          fechaNacimiento: new Date(),
          nacionalidad: 'x',
          estadoCuenta: 'x',
        },
      });

      const metodoAjeno = await mockPrisma.metodoPago.create({
        data: { idUsuario: 2, tipo: 'PayPal', datosHasheados: 'hash' },
      });

      const res = await request(app).post('/api/payments/pay').send({
        idMetodo: metodoAjeno.idMetodo,
        monto: 100,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Método de pago inválido o no pertenece al usuario.');
    });
  });
});
