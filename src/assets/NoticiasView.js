import React from 'react';

const NoticiasView = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-4">Noticias del MTC</h2>
    <div className="grid gap-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Nuevas normas de tránsito 2024</h3>
        <p className="text-gray-600">Últimas actualizaciones en el reglamento nacional de tránsito...</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Campaña de seguridad vial</h3>
        <p className="text-gray-600">El MTC lanza nueva campaña para reducir accidentes...</p>
      </div>
    </div>
  </div>
);

export default NoticiasView;
