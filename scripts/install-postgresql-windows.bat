@echo off
echo ========================================
echo  INSTALACION POSTGRESQL - GESTAGENT
echo ========================================
echo.

echo [1/5] Descargando PostgreSQL 16...
echo.
echo Visitando: https://www.postgresql.org/download/windows/
echo.
echo INSTRUCCIONES:
echo 1. Ve a https://www.postgresql.org/download/windows/
echo 2. Descarga PostgreSQL 16.x (recomendado)
echo 3. Ejecuta el instalador como administrador
echo.
echo CONFIGURACION DURANTE LA INSTALACION:
echo - Puerto: 5432 (default)
echo - Usuario: postgres
echo - Contraseña: postgres123 (o la que prefieras)
echo - Componentes: Instalar todos
echo.
pause

echo.
echo [2/5] Verificando instalacion...
pg_ctl --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ PostgreSQL instalado correctamente
    pg_ctl --version
) else (
    echo ❌ PostgreSQL no encontrado en PATH
    echo    Reinicia el CMD despues de la instalacion
    pause
    exit /b 1
)

echo.
echo [3/5] Verificando servicio PostgreSQL...
sc query postgresql-x64-16 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Servicio PostgreSQL ejecutandose
) else (
    echo ⚠️  Iniciando servicio PostgreSQL...
    net start postgresql-x64-16
)

echo.
echo [4/5] Creando base de datos del proyecto...
echo.
echo EJECUTANDO COMANDOS SQL:
echo - Crear usuario: gestagent
echo - Crear base de datos: gestagent_db
echo - Configurar permisos
echo.

set PGPASSWORD=postgres123
psql -U postgres -h localhost -c "CREATE USER gestagent WITH PASSWORD 'gestagent123';" 2>nul
psql -U postgres -h localhost -c "CREATE DATABASE gestagent_db OWNER gestagent;" 2>nul
psql -U postgres -h localhost -c "GRANT ALL PRIVILEGES ON DATABASE gestagent_db TO gestagent;" 2>nul

echo.
echo [5/5] Inicializando schema...
psql -U gestagent -h localhost -d gestagent_db -f init-postgresql.sql

echo.
echo ========================================
echo  INSTALACION COMPLETADA
echo ========================================
echo.
echo ✅ PostgreSQL 16 instalado
echo ✅ Usuario: gestagent / gestagent123
echo ✅ Base de datos: gestagent_db
echo ✅ Puerto: 5432
echo.
echo PROBAR CONEXION:
echo psql -U gestagent -h localhost -d gestagent_db
echo.
echo CONFIGURAR .env.local:
echo DATABASE_URL="postgresql://gestagent:gestagent123@localhost:5432/gestagent_db"
echo.
pause 