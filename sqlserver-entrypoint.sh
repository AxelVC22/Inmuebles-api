#!/bin/bash
set -e

# Start SQL Server in the background
/opt/mssql/bin/sqlservr &
pid=$!

# Wait for MSSQL to be ready
echo "Waiting for MSSQL to be ready..."
until /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -Q "SELECT 1" &> /dev/null
do
    echo -n "."
    sleep 1
done
echo "MSSQL is ready."

# Run initialization scripts
echo "Running initialization scripts..."

# Check if DB exists
DB_EXISTS=$(/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -Q "IF DB_ID('InmobiliariaDB') IS NOT NULL PRINT '1' ELSE PRINT '0'" -h -1 -W | xargs)

if [ "$DB_EXISTS" == "1" ]; then
    echo "Database InmobiliariaDB already exists. Skipping init-db.sql."
else
    echo "Initializing database..."
    /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -i /docker-entrypoint-initdb.d/01-init-db.sql
fi

# Always run init-user to ensure user has access (it is idempotent)
echo "Running init-user.sql..."
/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -i /docker-entrypoint-initdb.d/02-init-user.sql

echo "Initialization complete."

# Wait for SQL Server process to exit
wait $pid
