const request = require('supertest');
const express = require('express');
const { PrismockClient } = require('prismock');
const bcrypt = require('bcryptjs');

let mockPrisma = {};
jest.mock('../../src/prisma', () => {
  return mockPrisma;
});

jest.mock('../../src/middlewares/authMiddleware', () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: 1, rol: 'Cliente' };
    next();
  },
}));

const profileRoutes = require('../../src/routes/profileRoutes');

describe('Pruebas de perfil de usuario', () => {
  let app;

  beforeAll(async () => {
    const db = new PrismockClient();
    Object.assign(mockPrisma, db);
  });

  beforeEach(async () => {
    if (mockPrisma.usuario) await mockPrisma.usuario.deleteMany();
    if (mockPrisma.direccion) await mockPrisma.direccion.deleteMany();

    app = express();
    app.use(express.json());
    app.use('/api/profile', profileRoutes);
  });

  describe('GET /api/profile', () => {
    it('Devuelve el perfil del usuario logueado', async () => {
      await mockPrisma.usuario.create({
        data: {
          idUsuario: 1,
          nombre: 'Juan',
          apellidos: 'Perez',
          correoElectronico: 'juan@test.com',
          hashPassword: 'secreto_hash',
          rol: 'Cliente',
          telefono: '111',
          fechaNacimiento: new Date(),
          nacionalidad: 'MX',
          estadoCuenta: 'Activo',
          Direccion: {
            create: {
              calle: 'Calle Falsa',
              noCalle: 123,
              colonia: 'Centro',
              ciudad: 'CDMX',
              estado: 'CDMX',
              codigoPostal: 12345,
            },
          },
        },
      });

      const res = await request(app).get('/api/profile');

      expect(res.statusCode).toBe(200);
      expect(res.body.data.nombre).toBe('Juan');
      expect(res.body.data.Direccion.calle).toBe('Calle Falsa');
      expect(res.body.data.hashPassword).toBeUndefined();
    });

    it('Debe devolver 404 si el usuario no existe en la BD', async () => {
      const res = await request(app).get('/api/profile');

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('No se ha encontrado el usuario');
    });
  });

  describe('PUT /api/profile', () => {
    it('Actualiza datos y la dirección', async () => {
      // Crear usuario base
      await mockPrisma.usuario.create({
        data: {
          idUsuario: 1,
          nombre: 'Original',
          apellidos: 'User',
          correoElectronico: 'original@test.com',
          hashPassword: 'hash',
          rol: 'Cliente',
          telefono: '000',
          fechaNacimiento: new Date(),
          nacionalidad: 'MX',
          estadoCuenta: 'Activo',
          Direccion: {
            create: {
              calle: 'Vieja',
              noCalle: 1,
              colonia: 'X',
              ciudad: 'X',
              estado: 'X',
              codigoPostal: 1,
            },
          },
        },
      });

      const updateData = {
        nombre: 'Editado',
        telefono: '999',
        direccion: {
          calle: 'Nueva Calle',
          noCalle: 50,
          colonia: 'Norte',
          ciudad: 'MTY',
          estado: 'NL',
          codigoPostal: 64000,
        },
      };

      const res = await request(app).put('/api/profile').send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.nombre).toBe('Editado');

      const userEnDb = await mockPrisma.usuario.findUnique({
        where: { idUsuario: 1 },
        include: { Direccion: true },
      });
      expect(userEnDb.Direccion.calle).toBe('Nueva Calle');
    });

    it('Falla si se usa un correo ya registrado', async () => {
      await mockPrisma.usuario.create({
        data: {
          idUsuario: 1,
          nombre: 'Yo',
          correoElectronico: 'mi@email.com',
          hashPassword: 'x',
          rol: 'C',
          telefono: 'x',
          fechaNacimiento: new Date(),
          nacionalidad: 'x',
          estadoCuenta: 'x',
        },
      });

      await mockPrisma.usuario.create({
        data: {
          idUsuario: 2,
          nombre: 'Otro',
          correoElectronico: 'ocupado@email.com',
          hashPassword: 'x',
          rol: 'C',
          telefono: 'x',
          fechaNacimiento: new Date(),
          nacionalidad: 'x',
          estadoCuenta: 'x',
        },
      });

      const res = await request(app).put('/api/profile').send({
        email: 'ocupado@email.com',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('El correo electrónico ya está en uso.');
    });

    it('Actualiza perfil manteniendo el mismo email', async () => {
      await mockPrisma.usuario.create({
        data: {
          idUsuario: 1,
          nombre: 'Yo',
          correoElectronico: 'mi@email.com',
          hashPassword: 'x',
          rol: 'C',
          telefono: 'x',
          fechaNacimiento: new Date(),
          nacionalidad: 'x',
          estadoCuenta: 'x',
        },
      });

      const res = await request(app).put('/api/profile').send({
        nombre: 'Nuevo Nombre',
        email: 'mi@email.com',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.nombre).toBe('Nuevo Nombre');
    });
  });

  describe('PUT /api/profile/change-password', () => {
    it('Cambia la contraseña', async () => {
      const hashReal = await bcrypt.hash('password123', 10);

      await mockPrisma.usuario.create({
        data: {
          idUsuario: 1,
          nombre: 'User',
          correoElectronico: 'pwd@test.com',
          hashPassword: hashReal,
          rol: 'C',
          telefono: 'x',
          fechaNacimiento: new Date(),
          nacionalidad: 'x',
          estadoCuenta: 'x',
        },
      });

      const body = {
        currentPassword: 'password123',
        newPassword: 'nuevaPasswordSegura',
      };

      const res = await request(app).put('/api/profile/change-password').send(body);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Contraseña actualizada correctamente.');

      const userEnDb = await mockPrisma.usuario.findUnique({ where: { idUsuario: 1 } });
      const isMatchOld = await bcrypt.compare('password123', userEnDb.hashPassword);
      expect(isMatchOld).toBe(false);
    });

    it('Falla si la contraseña actual es incorrecta', async () => {
      const hashReal = await bcrypt.hash('password123', 10);
      await mockPrisma.usuario.create({
        data: {
          idUsuario: 1,
          nombre: 'User',
          correoElectronico: 'x',
          hashPassword: hashReal,
          rol: 'C',
          telefono: 'x',
          fechaNacimiento: new Date(),
          nacionalidad: 'x',
          estadoCuenta: 'x',
        },
      });

      const res = await request(app).put('/api/profile/change-password').send({
        currentPassword: 'INCORRECTA',
        newPassword: 'nuevaPasswordSegura',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('La contraseña actual es incorrecta.');
    });

    it('Debe fallar si la nueva contraseña es muy corta', async () => {
      const res = await request(app).put('/api/profile/change-password').send({
        currentPassword: 'password123',
        newPassword: '123',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/caracteres/);
    });
  });
});
