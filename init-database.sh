#!/bin/bash

echo "Esperando a que SQL Server esté listo..."
sleep 30s
echo "Ejecutando init-db.sql..."
/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P Inmobiliaria123! -i /docker-entrypoint-initdb.d/01-init-db.sql
echo "Ejecutando init-user.sql..."
/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P Inmobiliaria123! -i /docker-entrypoint-initdb.d/02-init-user.sql
echo "Base de datos inicializada correctamente"