// Mock processor para pruebas sin API real
export class MockMistralProcessor {
  static async processDocument(filePath, fileName) {
    console.log('🎭 [MOCK] Simulando procesamiento de:', fileName);
    
    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Retornar JSON simulado
    return {
      invoices: [
        {
          invoice_number: "MOCK-001",
          date: "2024-06-09",
          supplier: {
            name: "Proveedor Mock",
            tax_id: "12345678A",
            address: "Calle Falsa 123"
          },
          customer: {
            name: "Cliente Mock", 
            tax_id: "87654321B"
          },
          line_items: [
            {
              description: "Producto de prueba",
              quantity: 1,
              unit_price: 100.00,
              total: 100.00
            }
          ],
          totals: {
            subtotal: 100.00,
            tax: 21.00,
            total: 121.00
          }
        }
      ],
      confidence: 0.95,
      processing_time: "2.1s"
    };
  }
}
