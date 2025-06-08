import React from 'react';

const PerfilView = ({ user, onLogout }) => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-4">Mi Perfil</h2>
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-xl font-bold">
            {user.email?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h3 className="font-semibold text-lg">{user.email}</h3>
          <p className="text-gray-600">Usuario registrado</p>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <p className="mt-1 text-gray-900">{user.email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Última conexión</label>
          <p className="mt-1 text-gray-900">Ahora</p>
        </div>
        <button
          onClick={onLogout}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  </div>
);

export default PerfilView;
