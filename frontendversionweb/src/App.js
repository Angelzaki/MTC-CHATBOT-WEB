import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebaseconfig';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  deleteDoc
} from 'firebase/firestore';

// Mock Firebase functions adaptado para web
const mockAuth = {
  currentUser: {
    uid: 'mock-user-id'
  }
};

// Simulación de Firestore para persistencia local
const localStorageKey = 'innovaedu-messages';

const getStoredMessages = (userId) => {
  try {
    const stored = localStorage.getItem(`${localStorageKey}-${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading stored messages:', error);
    return [];
  }
};

const saveStoredMessages = (userId, messages) => {
  try {
    localStorage.setItem(`${localStorageKey}-${userId}`, JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving messages:', error);
  }
};

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [user, setUser] = useState(mockAuth.currentUser);
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const messagesEndRef = useRef(null);

  // Cargar mensajes al inicializar
  useEffect(() => {
    if (user) {
      loadMessages(user.uid);
    }
  }, [user]);

  // Inicializar reconocimiento de voz
  useEffect(() => {
    const setupVoiceRecognition = () => {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        const recognitionInstance = new SpeechRecognition();

        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'es-ES';

        recognitionInstance.onstart = () => {
          console.log('Reconocimiento de voz iniciado');
          setIsRecording(true);
        };

        recognitionInstance.onend = () => {
          console.log('Reconocimiento de voz finalizado');
          setIsRecording(false);
        };

        recognitionInstance.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          const fullTranscript = finalTranscript || interimTranscript;
          if (fullTranscript) {
            console.log('Texto reconocido:', fullTranscript);
            setTranscript(fullTranscript);
            setInput(fullTranscript);
          }
        };

        recognitionInstance.onerror = (event) => {
          console.error('Error de reconocimiento de voz:', event.error);
          setIsRecording(false);
        };

        setRecognition(recognitionInstance);
      } else {
        console.warn('Reconocimiento de voz no soportado en este navegador');
      }
    };

    setupVoiceRecognition();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cargar mensajes del almacenamiento local
  const loadMessages = async (userId) => {
    try {
      setLoading(true);
      const storedMessages = getStoredMessages(userId);

      if (storedMessages.length === 0) {
        // Si no hay mensajes, agregar mensaje de bienvenida
        const welcomeMessage = {
          id: Date.now().toString(),
          sender: 'bot',
          text: '¡Hola! Soy InnovaEdu, tu asistente para resolver dudas sobre normas de tránsito en Perú. ¿En qué puedo ayudarte hoy?',
          timestamp: new Date()
        };

        const initialMessages = [welcomeMessage];
        setMessages(initialMessages);
        saveStoredMessages(userId, initialMessages);
      } else {
        // Convertir timestamps de string a Date
        const loadedMessages = storedMessages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error("Error al cargar mensajes:", error);
      // Mensaje de bienvenida por defecto en caso de error
      const welcomeMessage = {
        id: Date.now().toString(),
        sender: 'bot',
        text: '¡Hola! Soy InnovaEdu, tu asistente para resolver dudas sobre normas de tránsito en Perú. ¿En qué puedo ayudarte hoy?',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Guardar mensaje en almacenamiento local
  const saveMessage = async (messageText, sender) => {
    try {
      if (!user) return null;

      // Crear el objeto del mensaje
      const newMessage = {
        sender: sender,
        text: messageText,
        timestamp: new Date()
      };

      // Guardar en Firestore
      const docRef = await addDoc(collection(db, "ChatMessages"), {
        userId: user.uid,
        ...newMessage
      });

      // Crear mensaje con ID para el estado local
      const messageWithId = {
        id: docRef.id, // Usar el ID de Firestore
        ...newMessage
      };

      // Actualizar estado local
      const updatedMessages = [...messages, messageWithId];
      setMessages(updatedMessages);

      // Guardar en almacenamiento local como respaldo
      saveStoredMessages(user.uid, updatedMessages);

      return docRef.id;
    } catch (error) {
      console.error("Error al guardar mensaje:", error);

      // En caso de error con Firestore, intentar guardar solo localmente
      try {
        const fallbackMessage = {
          id: Date.now().toString(),
          sender: sender,
          text: messageText,
          timestamp: new Date()
        };

        const updatedMessages = [...messages, fallbackMessage];
        setMessages(updatedMessages);
        saveStoredMessages(user.uid, updatedMessages);

        return fallbackMessage.id;
      } catch (fallbackError) {
        console.error("Error en guardado de respaldo:", fallbackError);
        return null;
      }
    }
  };

  // Iniciar grabación de voz
  const startRecording = async () => {
    if (!recognition) {
      alert('Reconocimiento de voz no disponible en este navegador');
      return;
    }

    try {
      setTranscript('');
      setInput('');
      recognition.start();
    } catch (error) {
      console.error('Error al iniciar grabación de voz:', error);
      alert('No se pudo iniciar el reconocimiento de voz');
    }
  };

  // Detener grabación de voz
  const stopRecording = async () => {
    if (!recognition) return;

    try {
      recognition.stop();

      // Si hay texto transcrito y no estamos enviando actualmente
      if (transcript.trim() && !isSending) {
        // Enviar el mensaje automáticamente después de una breve pausa
        setTimeout(() => {
          sendMessage();
        }, 300);
      }
    } catch (error) {
      console.error('Error al detener grabación de voz:', error);
      setIsRecording(false);
    }
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Send message
  const sendMessage = async () => {
    const messageText = input.trim();
    if (messageText === '' || isSending) return;

    setIsSending(true);
    const currentInput = input;
    setInput('');
    setTranscript('');

    try {
      // Agregar mensaje del usuario
      const userMessage = {
        id: Date.now().toString(),
        sender: 'user',
        text: currentInput,
        timestamp: new Date()
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      saveStoredMessages(user.uid, updatedMessages);

      try {
        const response = await fetch('http://localhost:5000/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: currentInput }),
        });

        const data = await response.json();
        const botResponse = data.reply || 'Lo siento, hubo un problema procesando tu mensaje.';

        // Agregar respuesta del bot
        const botMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: botResponse,
          timestamp: new Date()
        };

        const finalMessages = [...updatedMessages, botMessage];
        setMessages(finalMessages);
        saveStoredMessages(user.uid, finalMessages);

      } catch (apiError) {
        console.error('Error en API:', apiError);

        // Mensaje de error si falla la conexión
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: 'Lo siento, no puedo conectarme al servidor en este momento. Por favor, intenta más tarde.',
          timestamp: new Date()
        };

        const errorMessages = [...updatedMessages, errorMessage];
        setMessages(errorMessages);
        saveStoredMessages(user.uid, errorMessages);
      }
    } catch (error) {
      console.error('Error al procesar mensaje:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Delete all messages
  const deleteAllMessages = () => {
    if (window.confirm("¿Estás seguro que deseas eliminar toda la conversación?")) {
      const welcomeMessage = {
        id: Date.now().toString(),
        sender: 'bot',
        text: '¡Hola! Soy InnovaEdu, tu asistente para resolver dudas sobre normas de tránsito en Perú. ¿En qué puedo ayudarte hoy?',
        timestamp: new Date()
      };

      const resetMessages = [welcomeMessage];
      setMessages(resetMessages);
      saveStoredMessages(user.uid, resetMessages);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando mensajes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
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
        <div className="text-right text-sm text-gray-600">
          <div className="font-medium">Ministerio de Transporte</div>
          <div>y Comunicaciones</div>
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
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-sm">💬</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800">Chatbot</div>
                    <div className="text-sm text-gray-600">Consulta sobre normas de tránsito</div>
                  </div>
                </div>
              </div>

              {['Noticias', 'Gráficos', 'Mi Perfil', 'Brevete', 'Reglamentos'].map((module, idx) => {
                const icons = ['📰', '📊', '👤', '🚗', '📋'];
                const descriptions = [
                  'Últimas actualizaciones del MTC',
                  'Visualización de datos de tránsito',
                  'Historial de consultas y configuración',
                  'Trámites para obtener licencia de conducir',
                  'Normativas vigentes de tránsito'
                ];

                return (
                  <div key={module} className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-600 text-sm">{icons[idx]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800">{module}</div>
                        <div className="text-sm text-gray-600">{descriptions[idx]}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Chat area */}
        <main className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Chatbot InnovaEdu</h2>
              <p className="text-sm text-gray-600">Consulta sobre normativas de tránsito y obtén respuestas al instante</p>
            </div>
            <button
              onClick={deleteAllMessages}
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
                  <div className="text-sm leading-relaxed">{message.text}</div>
                  <div className={`text-xs mt-2 ${message.sender === 'user'
                    ? 'text-blue-100'
                    : 'text-gray-500'
                    }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-white border rounded-lg px-4 py-3 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600">InnovaEdu está escribiendo...</span>
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Escribe tu consulta sobre normativas de tránsito..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  rows="1"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
                {recognition && (
                  <button
                    className={`absolute right-2 top-2 p-2 rounded-full transition-colors ${isRecording
                      ? 'bg-red-100 text-red-600 animate-pulse'
                      : 'hover:bg-gray-100 text-gray-400'
                      }`}
                    onClick={isRecording ? stopRecording : startRecording}
                    title={isRecording ? "Detener grabación" : "Iniciar reconocimiento de voz"}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
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
                Haz preguntas sobre normas de tránsito, requisitos para brevete, infracciones o señales.
                {recognition && " Puedes usar el micrófono para dictar tu mensaje."}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;