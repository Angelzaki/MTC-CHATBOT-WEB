import React from 'react';

const ReglamentosView = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-4">Reglamentos de Tránsito</h2>
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Reglamento Nacional de Tránsito</h3>
        <p className="text-gray-600">Documento oficial con todas las normas vigentes...</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Señales de Tránsito</h3>
        <p className="text-gray-600">Guía completa de señales reglamentarias, preventivas e informativas...</p>
      </div>
    </div>
  </div>
);

export default ReglamentosView;
