-- Consultas útiles para métricas del sistema híbrido
-- ==================================================

-- Estadísticas generales de procesamiento
SELECT 
    strategy,
    COUNT(*) as total_procesados,
    AVG(processing_time_ms)::INTEGER as tiempo_promedio_ms,
    MIN(processing_time_ms) as tiempo_minimo_ms,
    MAX(processing_time_ms) as tiempo_maximo_ms,
    AVG(confidence_score)::DECIMAL(3,2) as confianza_promedio,
    SUM(CASE WHEN fallback_used THEN 1 ELSE 0 END) as veces_fallback,
    AVG(cost_estimate)::DECIMAL(10,4) as costo_promedio
FROM processing_metrics
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY strategy
ORDER BY strategy;

-- Tasa de éxito por estrategia
SELECT 
    strategy,
    COUNT(*) as total,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as exitosos,
    (SUM(CASE WHEN success THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) * 100)::DECIMAL(5,2) as tasa_exito_pct
FROM processing_metrics
GROUP BY strategy;

-- Documentos que necesitaron fallback
SELECT 
    d.job_id,
    d.document_type,
    d.title,
    pm.strategy,
    pm.confidence_score,
    pm.processing_time_ms,
    pm.error_message
FROM documents d
JOIN processing_metrics pm ON d.job_id = pm.job_id
WHERE pm.fallback_used = true
ORDER BY pm.created_at DESC
LIMIT 20;

-- Rendimiento por tipo de documento
SELECT 
    document_type,
    COUNT(*) as total,
    AVG(processing_time_ms)::INTEGER as tiempo_promedio_ms,
    SUM(CASE WHEN strategy = 'llama-only' THEN 1 ELSE 0 END) as procesados_llama_only,
    SUM(CASE WHEN strategy = 'mistral-llama' THEN 1 ELSE 0 END) as procesados_hibrido
FROM processing_metrics pm
JOIN documents d ON pm.job_id = d.job_id
GROUP BY document_type
ORDER BY total DESC;

-- Ajuste de umbral de confianza recomendado
WITH confidence_analysis AS (
    SELECT 
        strategy,
        confidence_score,
        success,
        fallback_used
    FROM processing_metrics
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
    'Análisis de umbral' as metrica,
    COUNT(*) FILTER (WHERE strategy = 'llama-only' AND confidence_score >= 0.85 AND success) as llama_exitosos_alta_conf,
    COUNT(*) FILTER (WHERE strategy = 'llama-only' AND confidence_score < 0.85 AND NOT success) as llama_fallidos_baja_conf,
    COUNT(*) FILTER (WHERE fallback_used) as total_fallbacks,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY confidence_score) FILTER (WHERE strategy = 'llama-only' AND success) as mediana_confianza_exitosos,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY confidence_score) FILTER (WHERE strategy = 'llama-only' AND NOT success) as mediana_confianza_fallidos
FROM confidence_analysis;
