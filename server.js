const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const port = process.env.SERVER_PORT;
app.disable('x-powered-by');
const isProduction = process.env.NODE_ENV === 'production';

const corsOptions = {
  origin: isProduction ? process.env.ALLOWED_ORIGIN : '*',
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
if (isProduction) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Muchas solicitudes desde esta IP, por favor intente más tarde.' },
  });
  app.use(limiter);
}

app.use(morgan(isProduction ? 'combined' : 'dev'));

app.get('/', (req, res) => {
  res.send({ message: 'Bienvenido a la API de Inmuebles a tu alcance' });
});

app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/catalogs', require('./src/routes/catalogRoutes'));
app.use('/api/interactions', require('./src/routes/interactionRoutes'));
app.use('/api/payments', require('./src/routes/paymentRoutes'));
app.use('/api/users', require('./src/routes/preferencesRoutes'));
app.use('/api/properties', require('./src/routes/propertyRoutes'));
app.use('/api/accounts', require('./src/routes/accountRoutes'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({
    error: 'Error interno del servidor',
    detail: isProduction ? null : err.message,
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
  });
}

module.exports = app;
