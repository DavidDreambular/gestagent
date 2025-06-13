#!/bin/bash

# Cron Backup Script para Gestagent
# Este script se ejecuta automáticamente según la configuración de cron
# para realizar backups periódicos del sistema

# Configuración
PROJECT_DIR="/home/dreambular/Documentos/Proyectos/gestagent"
BACKUP_LOG="/var/log/gestagent-backup.log"
LOCK_FILE="/tmp/gestagent-backup.lock"
MAX_LOCK_AGE=7200  # 2 horas en segundos

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BACKUP_LOG"
}

# Función de limpieza
cleanup() {
    if [ -f "$LOCK_FILE" ]; then
        rm -f "$LOCK_FILE"
    fi
}

# Verificar si ya hay un backup en ejecución
check_lock() {
    if [ -f "$LOCK_FILE" ]; then
        local lock_age=$(( $(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0) ))
        
        if [ $lock_age -lt $MAX_LOCK_AGE ]; then
            log "❌ BACKUP: Ya hay un proceso de backup en ejecución (lock file: $LOCK_FILE)"
            exit 1
        else
            log "⚠️ BACKUP: Lock file antiguo encontrado, eliminando..."
            rm -f "$LOCK_FILE"
        fi
    fi
}

# Crear lock file
create_lock() {
    echo $$ > "$LOCK_FILE"
    trap cleanup EXIT
}

# Verificar prerrequisitos
check_prerequisites() {
    # Verificar que el directorio del proyecto existe
    if [ ! -d "$PROJECT_DIR" ]; then
        log "❌ BACKUP: Directorio del proyecto no encontrado: $PROJECT_DIR"
        exit 1
    fi

    # Verificar que tsx está disponible
    if ! command -v tsx &> /dev/null; then
        log "❌ BACKUP: tsx no está instalado. Instalar con: npm install -g tsx"
        exit 1
    fi

    # Verificar que pg_dump está disponible
    if ! command -v pg_dump &> /dev/null; then
        log "❌ BACKUP: pg_dump no está disponible. Instalar PostgreSQL client tools"
        exit 1
    fi

    # Verificar espacio en disco
    local available_space=$(df "$PROJECT_DIR" | awk 'NR==2 {print $4}')
    local min_space=1048576  # 1GB en KB
    
    if [ "$available_space" -lt "$min_space" ]; then
        log "❌ BACKUP: Espacio insuficiente en disco. Disponible: $(($available_space/1024))MB, Mínimo: $(($min_space/1024))MB"
        exit 1
    fi
}

# Verificar que las variables de entorno estén configuradas
check_environment() {
    cd "$PROJECT_DIR"
    
    # Cargar variables de entorno si existe .env.local
    if [ -f ".env.local" ]; then
        set -a
        source .env.local
        set +a
        log "✅ BACKUP: Variables de entorno cargadas desde .env.local"
    else
        log "⚠️ BACKUP: Archivo .env.local no encontrado, usando variables del sistema"
    fi

    # Verificar variables críticas
    if [ -z "$PGHOST" ] && [ -z "$DATABASE_URL" ]; then
        log "❌ BACKUP: Variables de base de datos no configuradas (PGHOST o DATABASE_URL)"
        exit 1
    fi
}

# Ejecutar backup
run_backup() {
    cd "$PROJECT_DIR"
    
    log "🚀 BACKUP: Iniciando backup automático..."
    
    # Ejecutar script de backup
    if tsx scripts/backup-system.ts create 2>&1 | tee -a "$BACKUP_LOG"; then
        log "✅ BACKUP: Backup completado exitosamente"
        
        # Ejecutar limpieza de backups antiguos
        log "🧹 BACKUP: Ejecutando limpieza de backups antiguos..."
        if tsx scripts/backup-system.ts cleanup 2>&1 | tee -a "$BACKUP_LOG"; then
            log "✅ BACKUP: Limpieza completada"
        else
            log "⚠️ BACKUP: Error en limpieza, pero backup principal exitoso"
        fi
        
        return 0
    else
        log "❌ BACKUP: Error en el proceso de backup"
        return 1
    fi
}

# Enviar notificación (si está configurado)
send_notification() {
    local status=$1
    local message=$2
    
    # Solo enviar si hay configuración SMTP
    if [ -n "$SMTP_HOST" ] && [ -n "$SMTP_USER" ]; then
        log "📧 BACKUP: Enviando notificación de backup..."
        
        # Aquí podrías implementar envío de email o webhook
        # Por ahora solo registramos en el log
        log "📧 BACKUP: Notificación: $status - $message"
    fi
}

# Generar reporte del estado de backups
generate_report() {
    cd "$PROJECT_DIR"
    
    log "📊 BACKUP: Generando reporte de estado..."
    
    # Información de backups disponibles
    if tsx scripts/backup-system.ts list 2>&1 | tee -a "$BACKUP_LOG"; then
        log "✅ BACKUP: Reporte generado"
    else
        log "⚠️ BACKUP: Error generando reporte"
    fi
}

# Función principal
main() {
    local start_time=$(date +%s)
    
    log "🎯 BACKUP: Iniciando proceso de backup automático"
    
    # Verificaciones previas
    check_lock
    create_lock
    check_prerequisites
    check_environment
    
    # Ejecutar backup
    if run_backup; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log "✅ BACKUP: Proceso completado exitosamente en ${duration} segundos"
        send_notification "SUCCESS" "Backup completado en ${duration} segundos"
        generate_report
        
        # Código de salida exitoso
        exit 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log "❌ BACKUP: Proceso falló después de ${duration} segundos"
        send_notification "FAILED" "Backup falló después de ${duration} segundos"
        
        # Código de salida de error
        exit 1
    fi
}

# Manejar diferentes tipos de backup según parámetro
case "${1:-full}" in
    "full")
        main
        ;;
    "database")
        log "📊 BACKUP: Ejecutando backup solo de base de datos..."
        cd "$PROJECT_DIR"
        check_lock
        create_lock
        check_prerequisites
        check_environment
        # Aquí podrías implementar backup solo de BD
        tsx scripts/backup-system.ts create
        ;;
    "files")
        log "📁 BACKUP: Ejecutando backup solo de archivos..."
        cd "$PROJECT_DIR"
        check_lock
        create_lock
        check_prerequisites
        # Aquí podrías implementar backup solo de archivos
        log "⚠️ BACKUP: Backup de solo archivos no implementado, ejecutando backup completo"
        tsx scripts/backup-system.ts create
        ;;
    "test")
        log "🧪 BACKUP: Ejecutando test del sistema de backup..."
        cd "$PROJECT_DIR"
        check_prerequisites
        check_environment
        tsx scripts/backup-system.ts list
        ;;
    *)
        echo "Uso: $0 [full|database|files|test]"
        echo ""
        echo "  full     - Backup completo (default)"
        echo "  database - Solo backup de base de datos"
        echo "  files    - Solo backup de archivos"
        echo "  test     - Probar configuración"
        exit 1
        ;;
esac