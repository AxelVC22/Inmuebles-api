const request = require('supertest');
const { generatePrismock } = require('prismock');
const bcrypt = require('bcryptjs');

let mockPrisma = {};

jest.mock('../../src/prisma', () => {
  return mockPrisma;
});

const app = require('../../server');

describe('Pruebas de Autenticación', () => {
  beforeAll(async () => {
    const db = await generatePrismock();
    Object.assign(mockPrisma, db);
  });

  beforeEach(async () => {
    if (mockPrisma.usuario) {
      await mockPrisma.usuario.deleteMany();
    }
  });

  describe('POST /api/auth/register', () => {
    it('Registra un cliente correctamente (201)', async () => {
      const nuevoCliente = {
        nombre: 'Juan',
        apellidos: 'Pérez',
        email: 'cliente@test.com',
        password: 'pass123',
        rol: 'Cliente',
        telefono: '5551234567',
        fechaNacimiento: '1990-05-20',
        nacionalidad: 'Mexicana',
      };

      const res = await request(app).post('/api/auth/register').send(nuevoCliente);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', 'Usuario registrado exitosamente.');
      expect(res.body).toHaveProperty('userId');

      const usuarioDb = await mockPrisma.usuario.findUnique({
        where: { correoElectronico: nuevoCliente.email },
      });
      expect(usuarioDb).toBeTruthy();
      expect(usuarioDb.rol).toBe('Cliente');

      const clienteDb = await mockPrisma.cliente.findUnique({
        where: { idUsuario: usuarioDb.idUsuario },
      });
      expect(clienteDb).toBeTruthy();
    });

    it('Registra un arrendador correctamente (201)', async () => {
      const nuevoArrendador = {
        nombre: 'Maria',
        apellidos: 'Lopez',
        email: 'arrendador@test.com',
        password: 'pass123',
        rol: 'Arrendador',
        telefono: '5559876543',
        fechaNacimiento: '1985-08-10',
        nacionalidad: 'Mexicana',
        rfc: 'LOM850810XXX',
      };

      const res = await request(app).post('/api/auth/register').send(nuevoArrendador);

      expect(res.statusCode).toBe(201);

      const usuarioDb = await mockPrisma.usuario.findUnique({
        where: { correoElectronico: nuevoArrendador.email },
      });
      expect(usuarioDb.rol).toBe('Arrendador');

      const arrendadorDb = await mockPrisma.arrendador.findUnique({
        where: { idUsuario: usuarioDb.idUsuario },
      });
      expect(arrendadorDb).toBeTruthy();
      expect(arrendadorDb.rfc).toBe('LOM850810XXX');
    });

    it('Error por no RFC (400)', async () => {
      const arrendadorSinRfc = {
        nombre: 'Pedro',
        apellidos: 'Ramirez',
        email: 'sinrfc@test.com',
        password: '123',
        rol: 'Arrendador',
        telefono: '5550000000',
        fechaNacimiento: '1990-01-01',
        nacionalidad: 'Mexicana',
      };

      const res = await request(app).post('/api/auth/register').send(arrendadorSinRfc);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'El RFC es obligatorio para Arrendadores');

      const usuarioDb = await mockPrisma.usuario.findUnique({
        where: { correoElectronico: arrendadorSinRfc.email },
      });
      expect(usuarioDb).toBeNull();
    });

    it('Correo duplicado (400)', async () => {
      await mockPrisma.usuario.create({
        data: {
          nombre: 'Existente',
          apellidos: 'User',
          correoElectronico: 'duplicado@test.com',
          hashPassword: 'hash',
          rol: 'Cliente',
          telefono: '000',
          fechaNacimiento: new Date(),
          nacionalidad: 'MX',
          estadoCuenta: 'Activo',
        },
      });

      const intentoDuplicado = {
        nombre: 'Intruso',
        apellidos: 'Nuevo',
        email: 'duplicado@test.com',
        password: '123',
        rol: 'Cliente',
        telefono: '111',
        fechaNacimiento: '2000-01-01',
        nacionalidad: 'MX',
      };

      const res = await request(app).post('/api/auth/register').send(intentoDuplicado);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'El correo electrónico ya está registrado.');
    });
  });

  describe('POST /api/auth/login', () => {
    it('Login exitoso con credenciales correctas (200)', async () => {
      const passwordPlano = 'ContraSegura123';
      const hash = await bcrypt.hash(passwordPlano, 10);

      await mockPrisma.usuario.create({
        data: {
          nombre: 'LoginUser',
          apellidos: 'Test',
          correoElectronico: 'login@test.com',
          hashPassword: hash,
          rol: 'Cliente',
          telefono: '555',
          fechaNacimiento: new Date(),
          nacionalidad: 'MX',
          estadoCuenta: 'Activo',
        },
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'login@test.com',
        password: passwordPlano,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('login@test.com');
    });

    it('Login fallido por contraseña incorrecta (400)', async () => {
      const hash = await bcrypt.hash('claveCorrecta', 10);
      await mockPrisma.usuario.create({
        data: {
          nombre: 'FailUser',
          apellidos: 'Test',
          correoElectronico: 'fail@test.com',
          hashPassword: hash,
          rol: 'Cliente',
          telefono: '555',
          fechaNacimiento: new Date(),
          nacionalidad: 'MX',
          estadoCuenta: 'Activo',
        },
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'fail@test.com',
        password: 'claveIncorrecta',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Credenciales inválidas.');
    });

    it('Correo no registrado (400)', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'noexiste@test.com',
        password: '123',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(
        /Correo electrónico o contraseña incorrectos|Credenciales inválidas/,
      );
    });
  });
});
