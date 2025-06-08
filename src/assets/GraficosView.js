import React from 'react';

const GraficosView = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-4">Gráficos y Estadísticas</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4">Accidentes por Región</h3>
        <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
          <span className="text-gray-500">Gráfico de barras aquí</span>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4">Infracciones Más Comunes</h3>
        <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
          <span className="text-gray-500">Gráfico circular aquí</span>
        </div>
      </div>
    </div>
  </div>
);

export default GraficosView;
