const prisma = require('../prisma');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const registerUser = async (req, res) => {
    const {
        nombre,
        apellidos,
        email,
        password,
        rol,
        telefono,
        fechaNacimiento,
        nacionalidad
    } = req.body;

    try {
        const existingUser = await prisma.usuario.findUnique({where: {correoElectronico: email}});

        if (existingUser) {
            return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        let userData = {
            nombre,
            apellidos,
            correoElectronico: email,
            hashPassword: hashedPassword,
            rol,
            telefono,
            fechaNacimiento: new Date(fechaNacimiento),
            nacionalidad,
            estadoCuenta: 'Activo'
        };

        if (rol === 'Cliente') {
            userData.Cliente = {create: {}};
        } else if (rol === 'Arrendador') {
             if (!req.body.rfc) return res.status(400).json({error: 'El RFC es obligatorio para Arrendadores'});
            userData.Arrendador = {create: { rfc: req.body.rfc }};
        }

        const usuarioGuardado = await prisma.usuario.create({
            data: userData
        });

        res.status(201).json({ 
            message: 'Usuario registrado exitosamente.',
            userId: usuarioGuardado.idUsuario 
        });

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ error: 'Error al registrar el usuario' });
    }
}

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.usuario.findUnique({where: {correoElectronico: email}});
        if (!user) {
            return res.status(400).json({ error: 'Correo electrónico o contraseña incorrectos.' });
        }

        const validPassword = await bcrypt.compare(password, user.hashPassword);
        if (!validPassword) {
            return res.status(400).json({ error: 'Credenciales inválidas.' });
        }

        const token = jwt.sign(
            { id: user.idUsuario, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: '5m' }
        )

        res.json({ 
            message: `Bienvenido, ${user.nombre}`,
            token,
            user: { 
                id: user.idUsuario, 
                nombre: user.nombre,
                email: user.correoElectronico, 
                rol: user.rol 
            }
        });

    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
}

module.exports = { registerUser, loginUser };