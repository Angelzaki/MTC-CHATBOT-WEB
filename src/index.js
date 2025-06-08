// index.js
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import Login from './Login';

const RootComponent = () => {
  const [user, setUser] = useState(null);

  return (
    <React.StrictMode>
      {!user ? (
        <Login onLogin={(username) => setUser(username)} />
      ) : (
        <App user={user} />
      )}
    </React.StrictMode>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<RootComponent />);
