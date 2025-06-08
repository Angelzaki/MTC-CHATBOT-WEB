import React from 'react';

const BreveteView = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-4">Trámites de Brevete</h2>
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Requisitos para obtener licencia</h3>
        <ul className="list-disc list-inside text-gray-600 space-y-1">
          <li>DNI original y copia</li>
          <li>Certificado médico vigente</li>
          <li>Certificado de manejo defensivo</li>
          <li>Pago de derechos</li>
        </ul>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Renovación de licencia</h3>
        <p className="text-gray-600">Proceso para renovar tu licencia de conducir vencida...</p>
      </div>
    </div>
  </div>
);

export default BreveteView;
