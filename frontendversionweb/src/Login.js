// Login.js
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebaseconfig';
import logo from './images/logoinnova.jpg'; // Asegúrate de que el archivo exista
// No necesitas useNavigate si no estás usando react-router aquí

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert('Por favor, completa todos los campos.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setLoading(false);
      // Llama a onLogin pasando el usuario autenticado
      onLogin(userCredential.user);
    } catch (error) {
      setLoading(false);
      alert(error.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-red-100">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Logo" className="w-30 h-30" />
        </div>
        {/*<h2 className="text-3xl font-bold text-center text-black-600 mb-6">InnovaEdu</h2>*/}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black-400"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black-400"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-black-700 text-white font-bold py-3 rounded-xl transition duration-300"
          >
            {loading ? 'Cargando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="#" className="text-sm text-gray-500 hover:underline">
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
