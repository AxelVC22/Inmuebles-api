const request = require('supertest');
const { PrismockClient } = require('prismock');
const bcrypt = require('bcryptjs');

let mockPrisma = {};

jest.mock('../../src/prisma', () => {
  return mockPrisma;
});

const app = require('../../server');

describe('Pruebas de auth', () => {
  beforeAll(async () => {
    const db = new PrismockClient();
    Object.assign(mockPrisma, db);
  });

  beforeEach(async () => {
    if (mockPrisma.preferencias) await mockPrisma.preferencias.deleteMany();
    if (mockPrisma.cliente) await mockPrisma.cliente.deleteMany();
    if (mockPrisma.arrendador) await mockPrisma.arrendador.deleteMany();
    if (mockPrisma.usuario) await mockPrisma.usuario.deleteMany();
    if (mockPrisma.direccion) await mockPrisma.direccion.deleteMany();
  });

  describe('POST /api/auth/register', () => {
    it('Registra un CLIENTE correctamente con dirección y preferencias vacías (201)', async () => {
      const nuevoCliente = {
        nombre: 'Juan',
        apellidos: 'Pérez',
        email: 'cliente@test.com',
        password: 'pass123',
        rol: 'Cliente',
        telefono: '5551234567',
        fechaNacimiento: '1990-05-20',
        nacionalidad: 'Mexicana',
        direccion: {
          calle: 'Av. bababoi',
          noCalle: 123,
          colonia: 'Colonia',
          ciudad: 'Ciudad',
          estado: 'Estado',
          codigoPostal: 12345,
        },
      };

      const res = await request(app).post('/api/auth/register').send(nuevoCliente);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', 'Usuario registrado exitosamente.');
      expect(res.body).toHaveProperty('userId');
      expect(res.body).toHaveProperty('token');

      const usuarioDb = await mockPrisma.usuario.findUnique({
        where: { correoElectronico: nuevoCliente.email },
        include: { Direccion: true },
      });
      expect(usuarioDb).toBeTruthy();
      expect(usuarioDb.rol).toBe('Cliente');

      expect(usuarioDb.Direccion).toBeTruthy();
      expect(usuarioDb.Direccion.calle).toBe('Av. bababoi');

      const clienteDb = await mockPrisma.cliente.findUnique({
        where: { idUsuario: usuarioDb.idUsuario },
      });
      expect(clienteDb).toBeTruthy();

      const prefsDb = await mockPrisma.preferencias.findUnique({
        where: { idUsuario: usuarioDb.idUsuario },
      });
      expect(prefsDb).toBeTruthy();
    });

    it('Registra un ARRENDADOR correctamente (Crea Arrendador + Cliente) (201)', async () => {
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
        direccion: {
          calle: 'Reforma',
          noCalle: 222,
          colonia: 'Centro',
          ciudad: 'CDMX',
          estado: 'CDMX',
          codigoPostal: 60000,
        },
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

      const clienteDb = await mockPrisma.cliente.findUnique({
        where: { idUsuario: usuarioDb.idUsuario },
      });
      expect(clienteDb).toBeTruthy();
    });

    it('Falla si no se envía la dirección (400)', async () => {
      const sinDireccion = {
        nombre: 'Pedro',
        email: 'nodir@test.com',
        password: '123',
        rol: 'Cliente',
      };

      const res = await request(app).post('/api/auth/register').send(sinDireccion);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/dirección es obligatoria/);
    });

    it('Falla si un Arrendador no envía RFC (400)', async () => {
      const arrendadorSinRfc = {
        nombre: 'Pedro',
        email: 'sinrfc@test.com',
        password: '123',
        rol: 'Arrendador',
        direccion: {
          calle: 'x',
          noCalle: 1,
          colonia: 'x',
          ciudad: 'x',
          estado: 'x',
          codigoPostal: 1,
        },
      };

      const res = await request(app).post('/api/auth/register').send(arrendadorSinRfc);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'El RFC es obligatorio para Arrendadores');
    });

    it('Falla por correo duplicado (400)', async () => {
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
          Direccion: {
            create: {
              calle: 'x',
              noCalle: 1,
              colonia: 'x',
              ciudad: 'x',
              estado: 'x',
              codigoPostal: 1,
            },
          },
        },
      });

      const intentoDuplicado = {
        nombre: 'Intruso',
        email: 'duplicado@test.com',
        password: '123',
        rol: 'Cliente',
        direccion: {
          calle: 'y',
          noCalle: 2,
          colonia: 'y',
          ciudad: 'y',
          estado: 'y',
          codigoPostal: 2,
        },
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
          Direccion: {
            create: {
              calle: 'x',
              noCalle: 1,
              colonia: 'x',
              ciudad: 'x',
              estado: 'x',
              codigoPostal: 1,
            },
          },
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
          Direccion: {
            create: {
              calle: 'x',
              noCalle: 1,
              colonia: 'x',
              ciudad: 'x',
              estado: 'x',
              codigoPostal: 1,
            },
          },
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
