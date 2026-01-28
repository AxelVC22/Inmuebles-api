IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'InmobiliariaDB')
BEGIN
    CREATE DATABASE InmobiliariaDB;
END
GO
USE InmobiliariaDB;
GO

-- 1. CATÁLOGOS Y DIRECCIONES

CREATE TABLE Direccion (
    idDireccion INT PRIMARY KEY IDENTITY(1,1),
    calle NVARCHAR(100) NOT NULL,
    noCalle INT NOT NULL,
    colonia NVARCHAR(100) NOT NULL,
    ciudad NVARCHAR(100) NOT NULL,
    estado NVARCHAR(50) NOT NULL,
    codigoPostal INT NOT NULL
);

CREATE TABLE CategoriaInmueble (
    idCategoria INT PRIMARY KEY IDENTITY(1,1),
    nombre NVARCHAR(50) NOT NULL
);

CREATE TABLE SubtipoInmueble (
    idSubtipo INT PRIMARY KEY IDENTITY(1,1),
    nombre NVARCHAR(50) NOT NULL,
    idCategoria INT NOT NULL,
    FOREIGN KEY (idCategoria) REFERENCES CategoriaInmueble(idCategoria)
);

-- 2. GESTIÓN DE USUARIOS

CREATE TABLE Usuario (
    idUsuario INT PRIMARY KEY IDENTITY(1,1),
    correoElectronico NVARCHAR(100) UNIQUE NOT NULL,
    hashPassword NVARCHAR(255) NOT NULL,
    nombre NVARCHAR(50) NOT NULL,
    apellidos NVARCHAR(50) NOT NULL,
    fechaNacimiento DATE NOT NULL,
    nacionalidad NVARCHAR(50) NOT NULL,
    telefono NVARCHAR(20) NOT NULL,
    telefonoFijo NVARCHAR(20) NULL,
    fechaRegistro DATETIME DEFAULT GETDATE() NOT NULL,
    estadoCuenta NVARCHAR(20) DEFAULT 'Activo' NOT NULL,
    rol NVARCHAR(20) NOT NULL, 

    idDireccion INT NOT NULL, 
    FOREIGN KEY (idDireccion) REFERENCES Direccion(idDireccion)
);

CREATE TABLE Arrendador (
    idUsuario INT PRIMARY KEY,
    rfc NVARCHAR(20) NOT NULL,
    FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario)
);

CREATE TABLE Cliente (
    idUsuario INT PRIMARY KEY,
    FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario)
);

CREATE TABLE Preferencias (
    idPreferencia INT PRIMARY KEY IDENTITY(1,1),
    idUsuario INT UNIQUE NOT NULL,
    presupuestoMin DECIMAL(18,2) NULL,
    presupuestoMax DECIMAL(18,2) NULL,
    idCategoria INT NULL, 
    FOREIGN KEY (idUsuario) REFERENCES Cliente(idUsuario),
    FOREIGN KEY (idCategoria) REFERENCES CategoriaInmueble(idCategoria) -- Nueva relación
);

-- 3. GESTIÓN DE INMUEBLES

CREATE TABLE Inmueble (
    idInmueble INT PRIMARY KEY IDENTITY(1,1),
    titulo NVARCHAR(100) NOT NULL,
    descripcion NVARCHAR(MAX) NOT NULL,
    numBaños INT NOT NULL DEFAULT 0,
    numMediosBaños INT NOT NULL DEFAULT 0,
    numPisos INT NOT NULL DEFAULT 1,
    numRecamaras INT NOT NULL DEFAULT 0,
    superficieConstruida DECIMAL(10,2) NOT NULL,
    superficieTotal DECIMAL(10,2) NOT NULL,
    antiguedad INT NOT NULL DEFAULT 0,
    pisoUbicacion INT NULL,
    mascotasPermitidas BIT NOT NULL DEFAULT 0,
    referencias NVARCHAR(255) NULL,
    
    idArrendador INT NOT NULL,
    idDireccion INT NOT NULL,
    idSubtipo INT NOT NULL,
    
    FOREIGN KEY (idArrendador) REFERENCES Arrendador(idUsuario),
    FOREIGN KEY (idDireccion) REFERENCES Direccion(idDireccion),
    FOREIGN KEY (idSubtipo) REFERENCES SubtipoInmueble(idSubtipo)
);

-- 4. ARCHIVOS

CREATE TABLE Archivo (
    idArchivo INT PRIMARY KEY IDENTITY(1,1),
    datos VARBINARY(MAX) NOT NULL,
    nombreOriginal NVARCHAR(100) NULL,
    extension NVARCHAR(10) NOT NULL,
    tipo NVARCHAR(50) NOT NULL,
    fechaCarga DATETIME DEFAULT GETDATE() NOT NULL,
    visible BIT DEFAULT 1 NOT NULL,
    
    idInmueble INT NULL,
    idUsuario INT NULL,
    
    FOREIGN KEY (idInmueble) REFERENCES Inmueble(idInmueble),
    FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario),
    CONSTRAINT CHK_Archivo_Pertenencia CHECK (idInmueble IS NOT NULL OR idUsuario IS NOT NULL)
);

-- 5. AMENIDADES, SERVICIOS Y GEO

CREATE TABLE Amenidades (
    idAmenidad INT PRIMARY KEY IDENTITY(1,1),
    idInmueble INT UNIQUE NOT NULL,
    balconTerraza BIT NOT NULL DEFAULT 0,
    bodega BIT NOT NULL DEFAULT 0,
    chimenea BIT NOT NULL DEFAULT 0,
    estacionamiento BIT NOT NULL DEFAULT 0,
    jacuzzi BIT NOT NULL DEFAULT 0,
    jardin BIT NOT NULL DEFAULT 0,
    alberca BIT NOT NULL DEFAULT 0,
    FOREIGN KEY (idInmueble) REFERENCES Inmueble(idInmueble)
);

CREATE TABLE Servicios (
    idServicio INT PRIMARY KEY IDENTITY(1,1),
    idInmueble INT UNIQUE NOT NULL,
    aguaPotable BIT NOT NULL DEFAULT 0,
    cable BIT NOT NULL DEFAULT 0,
    drenaje BIT NOT NULL DEFAULT 0,
    electricidad BIT NOT NULL DEFAULT 0,
    gasEstacionario BIT NOT NULL DEFAULT 0,
    internet BIT NOT NULL DEFAULT 0,
    telefono BIT NOT NULL DEFAULT 0,
    transportePublico BIT NOT NULL DEFAULT 0,
    FOREIGN KEY (idInmueble) REFERENCES Inmueble(idInmueble)
);

CREATE TABLE Geolocalizacion (
    idGeo INT PRIMARY KEY IDENTITY(1,1),
    idInmueble INT UNIQUE NOT NULL,
    latitud DECIMAL(9,6) NOT NULL,
    longitud DECIMAL(9,6) NOT NULL,
    FOREIGN KEY (idInmueble) REFERENCES Inmueble(idInmueble)
);

CREATE TABLE HistorialEstado (
    idHistorial INT PRIMARY KEY IDENTITY(1,1),
    idInmueble INT NOT NULL,
    estado NVARCHAR(50) NOT NULL,
    fechaCambio DATETIME DEFAULT GETDATE() NOT NULL,
    motivoCambio NVARCHAR(255) NULL,
    FOREIGN KEY (idInmueble) REFERENCES Inmueble(idInmueble)
);

-- 6. NEGOCIO: PUBLICACIONES

CREATE TABLE Publicacion (
    idPublicacion INT PRIMARY KEY IDENTITY(1,1),
    idInmueble INT UNIQUE NOT NULL,
    estado NVARCHAR(50) DEFAULT 'Publicada' NOT NULL,
    precioVenta DECIMAL(18,2) NULL,
    precioRentaMensual DECIMAL(18,2) NULL,
    divisa NVARCHAR(3) DEFAULT 'MXN' NOT NULL,
    precioPorM2 DECIMAL(18,2) NULL,
    depositoRequerido BIT NOT NULL DEFAULT 0,
    montoDeposito DECIMAL(18,2) NULL,
    requiereAval BIT NOT NULL DEFAULT 0,
    plazoMinimoMeses INT NULL,
    plazoMaximoMeses INT NULL,
    tipoOperacion NVARCHAR(20) NOT NULL,
    fechaInicio DATETIME DEFAULT GETDATE() NOT NULL,
    
    FOREIGN KEY (idInmueble) REFERENCES Inmueble(idInmueble)
);

CREATE TABLE Comision (
    idComision INT PRIMARY KEY IDENTITY(1,1),
    idArrendador INT NOT NULL,
    idPublicacion INT NOT NULL,
    diasPublicados INT NOT NULL DEFAULT 0,
    tarifaDiaria DECIMAL(18,2) NOT NULL,
    montoTotal AS (diasPublicados * tarifaDiaria), 
    fechaCorte DATETIME NULL,
    estadoPago NVARCHAR(20) DEFAULT 'Pendiente' NOT NULL,
    FOREIGN KEY (idArrendador) REFERENCES Arrendador(idUsuario),
    FOREIGN KEY (idPublicacion) REFERENCES Publicacion(idPublicacion)
);

-- 7. INTERACCIONES

CREATE TABLE Interaccion (
    idInteraccion INT PRIMARY KEY IDENTITY(1,1),
    idCliente INT NOT NULL,
    idPublicacion INT NOT NULL,
    fecha DATETIME DEFAULT GETDATE() NOT NULL,
    mensaje NVARCHAR(MAX) NULL,
    tipo NVARCHAR(50) NOT NULL,
    FOREIGN KEY (idCliente) REFERENCES Cliente(idUsuario),
    FOREIGN KEY (idPublicacion) REFERENCES Publicacion(idPublicacion)
);

CREATE TABLE Visita (
    idVisita INT PRIMARY KEY IDENTITY(1,1),
    idInmueble INT NOT NULL,
    idCliente INT NOT NULL,
    fechaProgramada DATETIME NOT NULL,
    estado NVARCHAR(20) DEFAULT 'Programada' NOT NULL,
    FOREIGN KEY (idInmueble) REFERENCES Inmueble(idInmueble),
    FOREIGN KEY (idCliente) REFERENCES Cliente(idUsuario)
);

CREATE TABLE MetodoPago (
    idMetodo INT PRIMARY KEY IDENTITY(1,1),
    idUsuario INT NOT NULL,
    tipo NVARCHAR(50) NOT NULL,
    predeterminado BIT DEFAULT 0 NOT NULL,
    datosHasheados NVARCHAR(255) NOT NULL,
    FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario)
);

CREATE TABLE Pago (
    idPago INT PRIMARY KEY IDENTITY(1,1),
    idMetodo INT NOT NULL,
    monto DECIMAL(18,2) NOT NULL,
    fecha DATETIME DEFAULT GETDATE() NOT NULL,
    estado NVARCHAR(20) NOT NULL,
    referenciaPasarela NVARCHAR(100) NOT NULL,
    FOREIGN KEY (idMetodo) REFERENCES MetodoPago(idMetodo)
);
GO

-- 8. POBLADO DE CATÁLOGOS

INSERT INTO CategoriaInmueble (nombre) VALUES 
('Departamento'), ('Casa'), ('Terreno / Lote'), 
('Comercial / Industrial'), ('Otros');

INSERT INTO SubtipoInmueble (nombre, idCategoria) VALUES 
('Apartamento de campo', 1), ('Apartamento de ciudad', 1), ('Apartamento de playa', 1), 
('Departamento Loft', 1), ('Departamento PentHouse', 1), ('Minidepartamento', 1), ('Departamento compartido', 1),
('Casa de campo', 2), ('Casa de ciudad', 2), ('Casa de playa', 2), 
('Casa en condominio', 2), ('Casa en quinta', 2), ('Dúplex', 2), ('Villa', 2),
('Terreno comercial', 3), ('Terreno campestre', 3), ('Terreno de playa', 3), 
('Terreno eriazo', 3), ('Terreno industrial', 3), ('Terreno residencial', 3),
('Bodega comercial', 4), ('Local Comercial', 4), ('Nave industrial', 4), ('Oficina', 4), ('Edificio', 4),
('Huerta', 5), ('Inmueble productivo urbano', 5), ('Quinta', 5), ('Rancho', 5);
GO