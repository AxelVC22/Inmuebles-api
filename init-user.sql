USE master;
GO
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'inmobiliaria_user')
BEGIN
    CREATE LOGIN [inmobiliaria_user] 
    WITH PASSWORD = 'Inmobiliaria123!', 
    CHECK_POLICY = OFF;
END
ELSE
BEGIN
    ALTER LOGIN [inmobiliaria_user] WITH PASSWORD = 'Inmobiliaria123!';
END
GO

USE InmobiliariaDB;
GO

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'inmobiliaria_user')
BEGIN
    CREATE USER [inmobiliaria_user] FOR LOGIN [inmobiliaria_user];
END
GO

ALTER ROLE db_owner ADD MEMBER [inmobiliaria_user];
GO