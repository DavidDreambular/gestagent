const { postgresqlClient } = require('../lib/postgresql-client');

async function createNotificationsTable() {
  try {
    console.log('🗄️ [Migration] Creando tabla de notificaciones...');

    // Crear tabla de notificaciones
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS provider_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          supplier_id UUID NOT NULL,
          document_id VARCHAR(255),
          type VARCHAR(50) NOT NULL CHECK (type IN ('document_received', 'document_validated', 'document_error', 'information_required')),
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          read_at TIMESTAMPTZ NULL
      );
    `;

    const result1 = await postgresqlClient.query(createTableQuery);
    if (result1.error) {
      console.error('❌ Error creando tabla:', result1.error);
      return;
    }

    console.log('✅ [Migration] Tabla provider_notifications creada');

    // Crear índices
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_provider_notifications_supplier_id ON provider_notifications(supplier_id);',
      'CREATE INDEX IF NOT EXISTS idx_provider_notifications_document_id ON provider_notifications(document_id);',
      'CREATE INDEX IF NOT EXISTS idx_provider_notifications_type ON provider_notifications(type);',
      'CREATE INDEX IF NOT EXISTS idx_provider_notifications_created_at ON provider_notifications(created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_provider_notifications_read_at ON provider_notifications(read_at) WHERE read_at IS NULL;'
    ];

    for (const indexQuery of indices) {
      const result = await postgresqlClient.query(indexQuery);
      if (result.error) {
        console.error('⚠️ Error creando índice:', result.error);
      }
    }

    console.log('✅ [Migration] Índices creados');

    // Insertar datos de ejemplo
    const insertExampleData = `
      INSERT INTO provider_notifications (supplier_id, document_id, type, title, message, metadata) 
      SELECT 
          s.supplier_id,
          'DOC-' || gen_random_uuid()::text,
          'document_received',
          'Documento recibido correctamente',
          'Su factura ha sido recibida y está siendo procesada.',
          jsonb_build_object(
              'documentName', 'Factura #' || (1000 + (random() * 1000)::int),
              'documentNumber', 'FAC-' || (random() * 10000)::int,
              'receivedDate', NOW()::date
          )
      FROM suppliers s 
      WHERE s.status = 'active'
      LIMIT 3
      ON CONFLICT DO NOTHING;
    `;

    const result3 = await postgresqlClient.query(insertExampleData);
    if (result3.error) {
      console.log('⚠️ No se pudieron insertar datos de ejemplo:', result3.error);
    } else {
      console.log('✅ [Migration] Datos de ejemplo insertados');
    }

    // Verificar tabla
    const checkResult = await postgresqlClient.query('SELECT COUNT(*) as total FROM provider_notifications');
    if (!checkResult.error) {
      console.log(`📊 [Migration] Notificaciones en la tabla: ${checkResult.data[0].total}`);
    }

    console.log('🎉 [Migration] Migración completada exitosamente');

  } catch (error) {
    console.error('❌ [Migration] Error:', error);
  }
}

createNotificationsTable(); 