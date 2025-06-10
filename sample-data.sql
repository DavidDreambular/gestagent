-- Insertar proveedores de ejemplo
INSERT INTO suppliers (name, nif_cif, city, email, status, business_sector) VALUES
('Tecnología Avanzada S.A.', 'A12345678', 'Madrid', 'info@techavanzada.com', 'active', 'Tecnología'),
('Suministros Oficina Express', 'B87654321', 'Barcelona', 'ventas@officeexpress.com', 'active', 'Suministros'),
('Servicios Contables López', 'C11223344', 'Valencia', 'contacto@contalopez.com', 'active', 'Servicios')
ON CONFLICT DO NOTHING;

-- Insertar clientes de ejemplo
INSERT INTO customers (name, nif_cif, city, email, status, customer_type) VALUES
('Retail Solutions S.L.', 'E55667788', 'Sevilla', 'compras@retailsol.com', 'active', 'company'),
('Restaurante El Buen Sabor', 'F44556677', 'Granada', 'admin@elbuensabor.com', 'active', 'company'),
('Juan Pérez Autónomo', '12345678Z', 'Madrid', 'juan@perez.com', 'active', 'individual')
ON CONFLICT DO NOTHING;