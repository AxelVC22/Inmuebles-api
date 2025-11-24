const request = require('supertest');
const express = require('express');
const { PrismockClient } = require('prismock');

let mockPrisma = {};
jest.mock('../../src/prisma', () => {
    return mockPrisma;
});

jest.mock('../../src/middlewares/authMiddleware', () => ({
    verifyToken: (req, res, next) => next(),
    authorizeRole: (roles) => (req, res, next) => next()
}));

const userRoutes = require('../../src/routes/preferencesRoutes');

describe('Pruebas de Preferencias de Usuario', () => {

    let app;

    beforeAll(async () => {
        const db = new PrismockClient();
        Object.assign(mockPrisma, db);
    });

    beforeEach(async () => {
        if (mockPrisma.preferencias) {
            await mockPrisma.preferencias.deleteMany();
        }

        app = express();
        app.use(express.json());

        app.use((req, res, next) => {
            req.user = { id: 1, rol: 'Cliente' }; 
            next();
        });

        app.use('/api/users', userRoutes);
    });

    describe('GET /api/users/preferences', () => {

        it('Devuelve "No encontradas" si el usuario es nuevo', async () => {
            const res = await request(app).get('/api/users/preferences');

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('No se encontraron preferencias para el usuario.');
            expect(res.body.data).toBeNull();
        });

        it('Devuelve las preferencias si ya existen', async () => {
            await mockPrisma.preferencias.create({
                data: {
                    idUsuario: 1,
                    presupuestoMin: 5000,
                    presupuestoMax: 10000,
                    idCategoria: 2
                }
            });

            const res = await request(app).get('/api/users/preferences');

            expect(res.statusCode).toBe(200);
            expect(res.body.data.presupuestoMin).toBe(5000);
        });
    });

    describe('POST /api/users/preferences', () => {

        it('Crea las preferencias nuevas si no existen', async () => {
            const nuevasPrefs = {
                presupuestoMin: 1000,
                presupuestoMax: 2000,
                idCategoria: 5
            };

            const res = await request(app).post('/api/users/preferences').send(nuevasPrefs);

            expect(res.statusCode).toBe(200);
            
            const prefsEnDb = await mockPrisma.preferencias.findUnique({ where: { idUsuario: 1 } });
            expect(prefsEnDb).toBeTruthy();
            expect(prefsEnDb.presupuestoMin).toBe(1000);
        });

        it('Actualiza las preferencias si ya existen', async () => {
            await mockPrisma.preferencias.create({
                data: {
                    idUsuario: 1,
                    presupuestoMin: 100,
                    presupuestoMax: 200,
                    idCategoria: 1
                }
            });

            const actualizacion = {
                presupuestoMin: 9999,
                presupuestoMax: 200,
                idCategoria: 1
            };

            const res = await request(app).post('/api/users/preferences').send(actualizacion);

            expect(res.statusCode).toBe(200);
            
            const prefsEnDb = await mockPrisma.preferencias.findUnique({ where: { idUsuario: 1 } });
            expect(prefsEnDb.presupuestoMin).toBe(9999);
        });

        it('Regresa código 400 si el presupuesto no es un número', async () => {
            const datosInvalidos = {
                presupuestoMin: "mil pesos",
                presupuestoMax: 2000
            };

            const res = await request(app).post('/api/users/preferences').send(datosInvalidos);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Presupuesto mínimo inválido');
        });
    });
});