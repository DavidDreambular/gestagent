import { Metadata } from 'next';
import { DuplicateManager } from '@/components/duplicates/DuplicateManager';

export const metadata: Metadata = {
  title: 'Gestión de Duplicados | GestAgent',
  description: 'Detecta y gestiona entidades duplicadas en el sistema',
};

export default function DuplicatesPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestión de Duplicados</h1>
        <p className="text-muted-foreground mt-2">
          Revisa y fusiona proveedores y clientes duplicados para mantener la integridad de los datos
        </p>
      </div>
      
      <DuplicateManager />
    </div>
  );
}