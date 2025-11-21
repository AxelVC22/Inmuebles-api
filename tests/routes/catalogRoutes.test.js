const request = require('supertest');
const { PrismockClient } = require('prismock');

let mockPrisma = {};

jest.mock('../../src/prisma', () => {
    return mockPrisma;
});

const app = require('../../server');

describe('Pruebas de catálogos', () => {
    
    beforeAll(async () => {
        const db = new PrismockClient();
        Object.assign(mockPrisma, db);
    });

    beforeEach(async () => {
        if(mockPrisma.categoriaInmueble) await mockPrisma.categoriaInmueble.deleteMany();
        if(mockPrisma.subtipoInmueble) await mockPrisma.subtipoInmueble.deleteMany();
    });

    describe('GET /api/catalogs/categories', () => {
        it('Consultar categorías con subtipos', async () => {
            await mockPrisma.categoriaInmueble.create({
                data: {
                    nombre: "Residencial",
                    SubtipoInmueble: {
                        create: [
                            { nombre: "Casa" },
                            { nombre: "Departamento" }
                        ]
                    }
                }
        });

        const res = await request(app).get('/api/catalogs/categories');

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Categorías obtenidas exitosamente.');
        
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].nombre).toBe("Residencial");
        
        expect(res.body.data[0].SubtipoInmueble).toHaveLength(2);
    });
    });
});