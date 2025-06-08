import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage } from './firebaseconfig';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

import LoginComponent from './assets/LoginComponent';
import NoticiasView from './assets/NoticiasView';
import GraficosView from './assets/GraficosView';
import PerfilView from './assets/PerfilView';
import BreveteView from './assets/BreveteView';
import ReglamentosView from './assets/ReglamentosView';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState('chat');
  
  // Estados para grabación de audio
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  
  // Estados para reconocimiento de voz
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  
  const messagesEndRef = useRef(null);

  // Autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Inicializar reconocimiento de voz
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'es-ES';

      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInput(finalTranscript);
        }
      };

      recognitionInstance.onend = () => {
        setIsVoiceRecording(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  // Cargar mensajes en tiempo real cuando el usuario cambia
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "ChatMessages"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "asc")
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const loadedMessages = [];
      querySnapshot.forEach((doc) => {
        loadedMessages.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        });
      });
      if (loadedMessages.length === 0) {
        const welcomeMessage = {
          id: 'welcome',
          sender: 'bot',
          text: '¡Hola! Soy InnovaEdu, tu asistente para resolver dudas sobre normas de tránsito en Perú. ¿En qué puedo ayudarte hoy?',
          timestamp: new Date(),
          local: true
        };
        setMessages([welcomeMessage]);
      } else {
        setMessages(loadedMessages);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cargar mensajes de Firebase
  const loadMessages = () => {
    if (!user) return;

    const q = query(
      collection(db, "ChatMessages"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const loadedMessages = [];
      querySnapshot.forEach((doc) => {
        loadedMessages.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        });
      });

      if (loadedMessages.length === 0) {
        const welcomeMessage = {
          id: 'welcome',
          sender: 'bot',
          text: '¡Hola! Soy InnovaEdu, tu asistente para resolver dudas sobre normas de tránsito en Perú. ¿En qué puedo ayudarte hoy?',
          timestamp: new Date(),
          local: true
        };
        setMessages([welcomeMessage]);
      } else {
        setMessages(loadedMessages);
      }
    });

    return unsubscribe;
  };

  // Guardar mensaje en Firebase
  const saveMessage = async (messageText, sender, audioUrl = null) => {
    if (!user) return;

    try {
      const messageData = {
        userId: user.uid,
        sender: sender,
        text: messageText,
        timestamp: serverTimestamp(),
        ...(audioUrl && { audioUrl })
      };

      await addDoc(collection(db, "ChatMessages"), messageData);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  // Iniciar grabación de audio
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        await uploadAudio(audioBlob);
        setAudioChunks([]);
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting audio recording:', error);
      alert('No se pudo iniciar la grabación de audio');
    }
  };

  // Detener grabación de audio
  const stopAudioRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Subir audio a Firebase Storage
  const uploadAudio = async (audioBlob) => {
    if (!user) return;

    try {
      setIsSending(true);
      const fileName = `audio_${Date.now()}.wav`;
      const audioRef = ref(storage, `audios/${user.uid}/${fileName}`);
      
      await uploadBytes(audioRef, audioBlob);
      const audioUrl = await getDownloadURL(audioRef);

      // Guardar mensaje con audio
      await saveMessage('🎵 Mensaje de audio', 'user', audioUrl);

      // Enviar audio al backend para procesamiento
      const formData = new FormData();
      formData.append('audio', audioBlob, fileName);
      formData.append('userId', user.uid);

      const response = await fetch('http://localhost:5000/chat-audio', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      const botResponse = data.reply || 'Lo siento, hubo un problema procesando tu audio.';

      // Guardar respuesta del bot
      await saveMessage(botResponse, 'bot');

    } catch (error) {
      console.error('Error uploading audio:', error);
      await saveMessage('Lo siento, hubo un error procesando el audio.', 'bot');
    } finally {
      setIsSending(false);
    }
  };

  // Iniciar reconocimiento de voz para texto
  const startVoiceRecording = () => {
    if (recognition) {
      setIsVoiceRecording(true);
      recognition.start();
    }
  };

  // Enviar mensaje de texto
  const sendMessage = async () => {
    const messageText = input.trim();
    if (messageText === '' || isSending) return;

    setIsSending(true);
    const currentInput = input;
    setInput('');

    try {
      // Guardar mensaje del usuario
      await saveMessage(currentInput, 'user');

      // Enviar al backend
      const response = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: currentInput,
          userId: user.uid 
        }),
      });

      const data = await response.json();
      const botResponse = data.reply || 'Lo siento, hubo un problema procesando tu mensaje.';

      // Guardar respuesta del bot
      await saveMessage(botResponse, 'bot');

    } catch (error) {
      console.error('Error sending message:', error);
      await saveMessage('Lo siento, no puedo conectarme al servidor en este momento.', 'bot');
    } finally {
      setIsSending(false);
    }
  };

  // Manejar tecla Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Cerrar sesión
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Limpiar conversación
  const clearConversation = async () => {
    if (window.confirm("¿Estás seguro que deseas eliminar toda la conversación?")) {
      // En una implementación real, aquí eliminarías los mensajes de Firebase
      const welcomeMessage = {
        id: 'welcome',
        sender: 'bot',
        text: '¡Hola! Soy InnovaEdu, tu asistente para resolver dudas sobre normas de tránsito en Perú. ¿En qué puedo ayudarte hoy?',
        timestamp: new Date(),
        local: true
      };
      setMessages([welcomeMessage]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginComponent onLogin={setUser} />;
  }

  const menuItems = [
    { id: 'chat', name: 'Chatbot', icon: '💬', description: 'Consulta sobre normas de tránsito' },
    { id: 'noticias', name: 'Noticias', icon: '📰', description: 'Últimas actualizaciones del MTC' },
    { id: 'graficos', name: 'Gráficos', icon: '📊', description: 'Visualización de datos de tránsito' },
    { id: 'perfil', name: 'Mi Perfil', icon: '👤', description: 'Historial de consultas y configuración' },
    { id: 'brevete', name: 'Brevete', icon: '🚗', description: 'Trámites para obtener licencia de conducir' },
    { id: 'reglamentos', name: 'Reglamentos', icon: '📋', description: 'Normativas vigentes de tránsito' }
  ];

  const renderCurrentView = () => {
    switch (currentView) {
      case 'noticias':
        return <NoticiasView />;
      case 'graficos':
        return <GraficosView />;
      case 'perfil':
        return <PerfilView user={user} onLogout={handleLogout} />;
      case 'brevete':
        return <BreveteView />;
      case 'reglamentos':
        return <ReglamentosView />;
      default:
        return (
          <main className="flex-1 flex flex-col">
            {/* Chat header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Chatbot InnovaEdu</h2>
                <p className="text-sm text-gray-600">Consulta sobre normativas de tránsito y obtén respuestas al instante</p>
              </div>
              <button
                onClick={clearConversation}
                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                title="Eliminar toda la conversación"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-3xl ${message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border'
                    } rounded-lg px-4 py-3 shadow-sm`}>
                    <div className="text-sm leading-relaxed">
                      {message.audioUrl ? (
                        <audio controls className="w-full">
                          <source src={message.audioUrl} type="audio/wav" />
                          Tu navegador no soporta audio.
                        </audio>
                      ) : (
                        message.text
                      )}
                    </div>
                    <div className={`text-xs mt-2 ${message.sender === 'user'
                      ? 'text-blue-100'
                      : 'text-gray-500'
                      }`}>
                      {(() => {
                        let dateObj = message.timestamp;
                        if (dateObj && typeof dateObj === 'object' && typeof dateObj.toDate === 'function') {
                          dateObj = dateObj.toDate();
                        }
                        if (!(dateObj instanceof Date)) {
                          dateObj = new Date(dateObj);
                        }
                        if (dateObj && !isNaN(dateObj.getTime())) {
                          return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        } else {
                          return '';
                        }
                      })()}
                    </div>
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-white border rounded-lg px-4 py-3 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-gray-600">InnovaEdu está procesando...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="bg-white border-t px-4 py-4">
              <div className="flex items-end space-x-3 max-w-4xl mx-auto">
                <div className="flex-1 relative">
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Escribe tu consulta sobre normativas de tránsito..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    rows="1"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                  />
                  
                  {/* Botones de audio y voz */}
                  <div className="absolute right-2 top-2 flex space-x-1">
                    {/* Botón de reconocimiento de voz */}
                    {recognition && (
                      <button
                        className={`p-2 rounded-full transition-colors ${isVoiceRecording
                          ? 'bg-blue-100 text-blue-600 animate-pulse'
                          : 'hover:bg-gray-100 text-gray-400'
                          }`}
                        onClick={startVoiceRecording}
                        title="Reconocimiento de voz"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                    
                    {/* Botón de grabación de audio */}
                    <button
                      className={`p-2 rounded-full transition-colors ${isRecording
                        ? 'bg-red-100 text-red-600 animate-pulse'
                        : 'hover:bg-gray-100 text-gray-400'
                        }`}
                      onClick={isRecording ? stopAudioRecording : startAudioRecording}
                      title={isRecording ? "Detener grabación" : "Grabar audio"}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        {isRecording ? (
                          <rect x="6" y="6" width="8" height="8" rx="1" />
                        ) : (
                          <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
                
                <button
                  className={`p-3 rounded-lg transition-colors ${isSending || input.trim() === ''
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  onClick={sendMessage}
                  disabled={isSending || input.trim() === ''}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              
              <div className="text-center mt-2">
                <p className="text-xs text-gray-500">
                  Escribe, habla o graba un audio para consultar sobre normas de tránsito, requisitos para brevete, infracciones o señales.
                </p>
              </div>
            </div>
          </main>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
              <div className="h-0.5 bg-gray-600"></div>
              <div className="h-0.5 bg-gray-600"></div>
              <div className="h-0.5 bg-gray-600"></div>
            </div>
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">IE</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800">InnovaEdu</h1>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">Bienvenido, {user.email}</span>
          <div className="text-right text-sm text-gray-600">
            <div className="font-medium">Ministerio de Transporte</div>
            <div>y Comunicaciones</div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-80 bg-white border-r shadow-sm flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-800">Módulos</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentView === item.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      currentView === item.id
                        ? 'bg-blue-100'
                        : 'bg-gray-100'
                    }`}>
                      <span className={`text-sm ${
                        currentView === item.id
                          ? 'text-blue-600'
                          : 'text-gray-600'
                      }`}>
                        {item.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${
                        currentView === item.id
                          ? 'text-blue-800'
                          : 'text-gray-800'
                      }`}>
                        {item.name}
                      </div>
                      <div className="text-sm text-gray-600">{item.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* User info at bottom of sidebar */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm font-bold">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {user.email}
                  </div>
                  <div className="text-xs text-gray-500">Usuario activo</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
                  title="Cerrar sesión"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderCurrentView()}
        </div>
      </div>
    </div>
  );
}

export default App;
