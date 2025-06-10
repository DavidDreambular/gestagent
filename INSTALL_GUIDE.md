# 📋 GUÍA DE INSTALACIÓN - GESTAGENT

## 🚀 Instalación Rápida (Ubuntu/Debian)

Ejecuta estos comandos en tu terminal uno por uno:

### 1. Instalar PostgreSQL 15
```bash
# Actualizar repositorios
sudo apt update

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib postgresql-client

# Verificar instalación
psql --version
```

### 2. Instalar Node.js 20+
```bash
# Agregar repositorio NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar Node.js
sudo apt install -y nodejs

# Verificar versión (debe ser 20.x o superior)
node --version
npm --version
```

### 3. Configurar PostgreSQL
```bash
# Iniciar y habilitar servicio
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Acceder como usuario postgres
sudo -u postgres psql

# En la consola de PostgreSQL, ejecutar:
CREATE USER gestagent_user WITH PASSWORD 'gestagent_pass_2024';
CREATE DATABASE gestagent OWNER gestagent_user;
GRANT ALL PRIVILEGES ON DATABASE gestagent TO gestagent_user;
\q
```

### 4. Configurar PostgreSQL en puerto 5433 (Opcional)
```bash
# Editar archivo de configuración
sudo nano /etc/postgresql/*/main/postgresql.conf

# Buscar la línea: port = 5432
# Cambiar a: port = 5433

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### 5. Instalar dependencias del proyecto
```bash
cd /home/dreambular/Documentos/Proyectos/gestagent
npm install
```

### 6. Configurar base de datos
```bash
# Ejecutar script de inicialización
cd /home/dreambular/Documentos/Proyectos/gestagent
psql -U gestagent_user -h localhost -p 5432 -d gestagent -f scripts/init-postgresql.sql
# Contraseña: gestagent_pass_2024
```

### 7. Crear usuarios de prueba
```bash
node scripts/create-test-users.js
```

### 8. Iniciar el proyecto
```bash
npm run dev
```

## 🔑 Usuarios de Prueba

- **Admin**: admin@gestagent.com / password123
- **Contable**: contable@gestagent.com / password123
- **Demo**: demo@gestagent.com / password123
- **Gestor**: gestor@gestagent.com / password123

## 🌐 Acceder al Sistema

Abre tu navegador en: http://localhost:3000

## ⚠️ Notas Importantes

1. Si PostgreSQL usa el puerto 5432 (por defecto), actualiza el DATABASE_URL en .env.local
2. Para usar la IA completamente, necesitas una API key de Mistral AI
3. La API key de Mistral incluida es de prueba y tiene límites

## 🆘 Solución de Problemas

### Error: PostgreSQL no se conecta
```bash
# Verificar estado
sudo systemctl status postgresql

# Ver logs
sudo journalctl -u postgresql

# Verificar puerto
sudo netstat -tlnp | grep postgres
```

### Error: npm install falla
```bash
# Limpiar caché
npm cache clean --force

# Reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Error: Base de datos no existe
```bash
# Crear manualmente
sudo -u postgres createdb gestagent
sudo -u postgres psql -c "GRANT ALL ON DATABASE gestagent TO gestagent_user;"
```