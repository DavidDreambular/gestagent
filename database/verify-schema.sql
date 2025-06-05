-- Script de verificación del schema
-- ==================================

-- Verificar que las tablas existen
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('users', 'documents', 'audit_logs', 'migrations', 'processing_metrics', 'notifications')
        THEN '✅ Creada'
        ELSE '❌ Falta'
    END as estado
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verificar índices
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Contar registros en cada tabla
SELECT 
    'users' as tabla, COUNT(*) as registros FROM users
UNION ALL
SELECT 'documents', COUNT(*) FROM documents
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL
SELECT 'processing_metrics', COUNT(*) FROM processing_metrics
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
ORDER BY tabla;

-- Verificar la vista
SELECT * FROM document_summary LIMIT 5;

-- Test de la función de estadísticas
SELECT * FROM get_dashboard_stats(NULL);
