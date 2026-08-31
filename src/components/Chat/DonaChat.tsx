import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useBar } from '../../context/BarContext';
import { ChatMessage, ChatAttachment, ChatSession } from '../../types';
import Markdown from 'react-markdown';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanForFirestore } from '../../firebase';
import { QuotaTracker } from '../../services/quotaTracker';
import { safeGetItem, safeSetItem } from '../../utils/storage';
import { 
  ArrowLeft,
  Plus, 
  MessageSquare, 
  Trash2, 
  Send, 
  Mic, 
  MicOff, 
  Paperclip, 
  Globe, 
  RotateCcw, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  FileText, 
  Image as ImageIcon, 
  X, 
  ExternalLink, 
  TrendingUp, 
  Package, 
  Wine, 
  Lightbulb, 
  Bot,
  PanelLeftClose,
  PanelLeft,
  Search
} from 'lucide-react';

const SESSIONS_STORAGE_KEY = 'barexpress_dona_chat_sessions_v2';
const ACTIVE_SESSION_STORAGE_KEY = 'barexpress_dona_active_session_id_v2';

export const DonaChat: React.FC = () => {
  const { 
    settings, 
    products, 
    sales, 
    currentUser, 
    setActiveTab,
    isAdmin,
    isSuperAdmin
  } = useBar();

  // Multi-session state management
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = safeGetItem(SESSIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading chat sessions:', e);
    }
    const initialSessionId = `session-${Date.now()}`;
    return [
      {
        id: initialSessionId,
        title: 'Nouvelle conversation',
        createdAt: new Date().toISOString(),
        messages: []
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    try {
      const savedId = safeGetItem(ACTIVE_SESSION_STORAGE_KEY);
      if (savedId) return savedId;
    } catch (e) {
      console.error('Error reading active session ID:', e);
    }
    return '';
  });

  // Chat history sidebar closed by default per user request
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [enableSearch, setEnableSearch] = useState(true);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Audio playback state (TTS)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ensure valid active session
  useEffect(() => {
    if (!activeSessionId || !sessions.some(s => s.id === activeSessionId)) {
      if (sessions.length > 0) {
        setActiveSessionId(sessions[0].id);
      }
    }
  }, [sessions, activeSessionId]);

  // Synchronize chat sessions with Firebase Firestore based on current user account
  useEffect(() => {
    if (!currentUser?.uid) return;

    try {
      const unsubscribe = onSnapshot(
        collection(db, 'chat_sessions'),
        (snapshot) => {
          const userSessions: ChatSession[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.userId === currentUser.uid) {
              userSessions.push({
                id: data.id || docSnap.id,
                title: data.title || 'Conversation',
                createdAt: data.createdAt || new Date().toISOString(),
                messages: Array.isArray(data.messages) ? data.messages : []
              });
            }
          });

          if (userSessions.length > 0) {
            userSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setSessions(userSessions);
            if (!activeSessionId || !userSessions.some(s => s.id === activeSessionId)) {
              setActiveSessionId(userSessions[0].id);
            }
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'chat_sessions');
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Failed to set up Firestore chat session listener:', err);
    }
  }, [currentUser?.uid]);

  // Cloud sync helper
  const syncSessionToCloud = useCallback(async (sessionToSync: ChatSession) => {
    if (!currentUser?.uid) return;
    try {
      await setDoc(
        doc(db, 'chat_sessions', sessionToSync.id),
        cleanForFirestore({
          id: sessionToSync.id,
          userId: currentUser.uid,
          title: sessionToSync.title,
          createdAt: sessionToSync.createdAt,
          updatedAt: new Date().toISOString(),
          messages: sessionToSync.messages
        })
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `chat_sessions/${sessionToSync.id}`);
    }
  }, [currentUser?.uid]);

  // Cloud delete helper
  const deleteSessionFromCloud = useCallback(async (sessionId: string) => {
    if (!currentUser?.uid) return;
    try {
      await deleteDoc(doc(db, 'chat_sessions', sessionId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `chat_sessions/${sessionId}`);
    }
  }, [currentUser?.uid]);

  // Persist sessions & active session ID locally as well
  useEffect(() => {
    safeSetItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    if (activeSessionId) {
      safeSetItem(ACTIVE_SESSION_STORAGE_KEY, activeSessionId);
    }
  }, [sessions, activeSessionId]);

  const currentSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = currentSession ? currentSession.messages : [];

  // Filter sessions by keyword search
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase().trim();
    return sessions.filter(session => {
      // Check title match
      if (session.title && session.title.toLowerCase().includes(q)) return true;
      // Check message contents match
      return session.messages.some(m => m.content && m.content.toLowerCase().includes(q));
    });
  }, [sessions, searchQuery]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Dynamic textarea height calculation: standard compact single-line (20px) up to 120px on multi-line
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '20px';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 20), 120)}px`;
    }
  }, [inputText]);

  // Create a new chat session
  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'Nouvelle conversation',
      createdAt: new Date().toISOString(),
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setInputText('');
    setAttachments([]);
    syncSessionToCloud(newSession);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Delete a session
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSessionFromCloud(sessionId);

    if (sessions.length <= 1) {
      const resetSession: ChatSession = {
        id: `session-${Date.now()}`,
        title: 'Nouvelle conversation',
        createdAt: new Date().toISOString(),
        messages: []
      };
      setSessions([resetSession]);
      setActiveSessionId(resetSession.id);
      syncSessionToCloud(resetSession);
      return;
    }

    const filtered = sessions.filter(s => s.id !== sessionId);
    setSessions(filtered);
    if (activeSessionId === sessionId) {
      setActiveSessionId(filtered[0].id);
    }
  };

  // Build live context of the bar for Dona
  const buildBarContext = () => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(s => s.timestamp.startsWith(today) && s.status === 'completed');
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);

    const lowStockItems = products
      .filter(p => p.stock <= p.minStockAlert)
      .slice(0, 10)
      .map(p => ({
        name: p.name,
        stock: p.stock,
        minStockAlert: p.minStockAlert,
        price: p.price,
        category: p.category
      }));

    const productSalesCount: Record<string, { name: string; quantity: number; revenue: number }> = {};
    sales.forEach(sale => {
      if (sale.status === 'completed') {
        sale.items.forEach(item => {
          if (!productSalesCount[item.product.id]) {
            productSalesCount[item.product.id] = {
              name: item.product.name,
              quantity: 0,
              revenue: 0
            };
          }
          productSalesCount[item.product.id].quantity += item.quantity;
          productSalesCount[item.product.id].revenue += item.product.price * item.quantity;
        });
      }
    });

    const topProducts = Object.values(productSalesCount)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map(p => ({
        name: p.name,
        soldQuantity: p.quantity,
        revenue: p.revenue
      }));

    return {
      barName: settings.barName,
      currency: settings.currency,
      cashierName: currentUser?.displayName || settings.cashierName,
      todayRevenue,
      totalSalesCount: todaySales.length,
      totalProducts: products.length,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      topProducts
    };
  };

  // Send message to Dona
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText.trim();
    if ((!textToSend && attachments.length === 0) || isLoading || !currentSession) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];

    let sessionTitle = currentSession.title;
    if (messages.length === 0 && textToSend) {
      sessionTitle = textToSend.slice(0, 32) + (textToSend.length > 32 ? '...' : '');
    }

    const updatedUserSession: ChatSession = {
      ...currentSession,
      title: sessionTitle,
      messages: newMessages
    };

    setSessions(prev =>
      prev.map(s =>
        s.id === currentSession.id
          ? updatedUserSession
          : s
      )
    );
    syncSessionToCloud(updatedUserSession);

    setInputText('');
    setAttachments([]);
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const barContext = buildBarContext();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments
          })),
          context: barContext,
          enableSearch: settings.enableDonaWebSearch !== false ? enableSearch : false,
          customApiKey: settings.customGeminiApiKey,
          customInstructions: settings.donaCustomInstructions
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.reply || errData.error || `Erreur serveur HTTP ${response.status}`);
      }

      const data = await response.json();

      // Track Gemini API usage in QuotaTracker
      const estimatedTokens = Math.ceil((textToSend.length + (data.reply?.length || 0)) / 4) + 150;
      QuotaTracker.trackGeminiRequest(estimatedTokens);

      const donaMessage: ChatMessage = {
        id: `dona-${Date.now()}`,
        role: 'model',
        content: data.reply || "Je n'ai pas pu générer de réponse.",
        sources: data.sources && data.sources.length > 0 ? data.sources : undefined,
        timestamp: data.timestamp || new Date().toISOString()
      };

      const finalSession: ChatSession = {
        ...updatedUserSession,
        messages: [...newMessages, donaMessage]
      };

      setSessions(prev =>
        prev.map(s =>
          s.id === currentSession.id
            ? finalSession
            : s
        )
      );
      syncSessionToCloud(finalSession);
    } catch (err: any) {
      console.error('Error in Dona Chat:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `Une erreur est survenue lors de la communication avec Dona : ${err.message || 'Erreur inconnue'}`,
        timestamp: new Date().toISOString()
      };
      const errorSession: ChatSession = {
        ...updatedUserSession,
        messages: [...newMessages, errorMessage]
      };
      setSessions(prev =>
        prev.map(s =>
          s.id === currentSession.id
            ? errorSession
            : s
        )
      );
      syncSessionToCloud(errorSession);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy text to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Text-to-Speech Playback
  const handleSpeak = async (text: string, msgId: string) => {
    if (playingMessageId === msgId) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      window.speechSynthesis?.cancel();
      setPlayingMessageId(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    window.speechSynthesis?.cancel();

    setPlayingMessageId(msgId);
    setIsSynthesizing(true);

    try {
      const res = await fetch('/api/chat/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: text.replace(/[*_#`]/g, '').slice(0, 400),
          customApiKey: settings.customGeminiApiKey
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          currentAudioRef.current = audio;
          audio.onended = () => {
            setPlayingMessageId(null);
            currentAudioRef.current = null;
          };
          audio.onerror = () => {
            fallbackBrowserSpeech(text, msgId);
          };
          await audio.play();
          setIsSynthesizing(false);
          return;
        }
      }
      fallbackBrowserSpeech(text, msgId);
    } catch (e) {
      fallbackBrowserSpeech(text, msgId);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const fallbackBrowserSpeech = (text: string, msgId: string) => {
    if ('speechSynthesis' in window) {
      const cleanText = text.replace(/[*_#`[\]()]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.05;
      utterance.onend = () => setPlayingMessageId(null);
      utterance.onerror = () => setPlayingMessageId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setPlayingMessageId(null);
    }
  };

  // Audio Recording & Gemini Transcription
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        setIsTranscribing(true);

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          try {
            const res = await fetch('/api/chat/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Data,
                mimeType: mimeType,
                customApiKey: settings.customGeminiApiKey
              })
            });

            if (res.ok) {
              const data = await res.json();
              if (data.text) {
                setInputText(prev => {
                  const cleaned = data.text.trim();
                  return prev ? `${prev} ${cleaned}` : cleaned;
                });
              }
            }
          } catch (err) {
            console.error('Transcription error:', err);
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert("Impossible d'accéder au microphone. Veuillez autoriser l'accès au micro.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Handle file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.size > 15 * 1024 * 1024) {
        alert(`Le fichier ${file.name} est trop volumineux (max 15 Mo).`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const newAttachment: ChatAttachment = {
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64: base64String,
          size: file.size,
          previewUrl: file.type.startsWith('image/') ? base64String : undefined
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Quick suggestion prompts
  const quickPrompts = [
    {
      icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />,
      label: "Bilan des ventes",
      prompt: "Fais-moi une analyse concise des ventes du jour et des produits les plus performants."
    },
    {
      icon: <Package className="w-3.5 h-3.5 text-amber-600" />,
      label: "Vérifier le stock",
      prompt: "Quels sont les articles qui risquent de manquer prochainement et qu'il faut réapprovisionner ?"
    },
    {
      icon: <Wine className="w-3.5 h-3.5 text-rose-600" />,
      label: "Recette cocktail",
      prompt: "Donne-moi 2 idées de cocktails originaux et rentables faciles à préparer."
    },
    {
      icon: <Globe className="w-3.5 h-3.5 text-blue-600" />,
      label: "Recherche Web",
      prompt: "Recherche sur le web les dernières tendances en matière de boissons et restauration."
    },
    {
      icon: <Lightbulb className="w-3.5 h-3.5 text-violet-600" />,
      label: "Idées de promotions",
      prompt: "Donne-moi des idées d'offres pour booster la fréquentation en semaine."
    }
  ];

  // Check if Dona is disabled or user has no permission
  const isDonaDisabled = settings.enableDonaChat === false;
  const isAccessDenied = (
    !isAdmin &&
    !isSuperAdmin &&
    (
      settings.donaAccessMode === 'admins_only' ||
      currentUser?.permissions?.canAccessChat === false
    )
  );

  if (isDonaDisabled || isAccessDenied) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto shadow-2xs">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {isDonaDisabled ? "Assistant Dona Désactivé" : "Accès à Dona Restreint"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isDonaDisabled
                ? "L'assistant IA Dona a été temporairement désactivé par la Direction dans les paramètres de l'établissement."
                : "Votre compte ne dispose pas de l'autorisation pour converser avec l'assistant IA Dona. Contactez un administrateur."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retourner à l'Écran de Caisse</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-white text-slate-800 font-sans overflow-hidden">
      
      {/* Sidebar: Conversation History with Search Bar */}
      <aside 
        className={`h-full bg-slate-50 border-r border-slate-200 transition-all duration-200 flex flex-col z-30 shrink-0 ${
          isSidebarOpen ? 'w-72 sm:w-80' : 'w-0 -translate-x-full absolute md:relative md:translate-x-0 md:w-0'
        } overflow-hidden`}
      >
        {/* Sidebar Header: New Chat Button */}
        <div className="p-3 border-b border-slate-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-600" />
            <span>Nouveau chat</span>
          </button>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            title="Masquer la barre latérale"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar in Sidebar */}
        <div className="p-2.5 border-b border-slate-200/80 bg-slate-50">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20 transition">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une discussion..."
              className="w-full bg-transparent border-0 outline-none text-xs text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Historique</span>
            {searchQuery && (
              <span className="text-[10px] font-normal text-slate-400">
                {filteredSessions.length} résultat{filteredSessions.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {filteredSessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              {searchQuery ? 'Aucune conversation trouvée' : 'Aucun historique'}
            </div>
          ) : (
            filteredSessions.map(s => {
              const isActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setActiveSessionId(s.id);
                    if (window.innerWidth < 768) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition ${
                    isActive 
                      ? 'bg-slate-200/80 text-slate-900 font-semibold' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{s.title || 'Nouvelle conversation'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Supprimer la conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
              {currentUser?.displayName?.charAt(0) || 'U'}
            </div>
            <span className="truncate font-medium text-slate-600">
              {currentUser?.displayName || 'Utilisateur'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
        
        {/* Minimalist Header (ChatGPT / Gemini style) */}
        <header className="h-12 border-b border-slate-100 px-3 sm:px-4 flex items-center justify-between shrink-0 bg-white">
          
          <div className="flex items-center gap-2">
            {/* Discreet Back Arrow to leave chat screen */}
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Quitter le chat et retourner à la caisse"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Sidebar toggle if closed */}
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Afficher l'historique"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            )}

            {/* Minimalist Clean Title */}
            <span className="font-semibold text-sm text-slate-800">
              Dona
            </span>
          </div>

          {/* Right Header Action: Google Search Grounding toggle (if enabled by admin) */}
          <div className="flex items-center gap-2">
            {settings.enableDonaWebSearch !== false && (
              <button
                type="button"
                onClick={() => setEnableSearch(!enableSearch)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  enableSearch 
                    ? 'text-blue-600 bg-blue-50 border border-blue-100' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
                title={enableSearch ? "Recherche Google Web activée" : "Recherche Google désactivée"}
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{enableSearch ? 'Recherche Web' : 'Sans Web'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNewChat}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Nouvelle conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Message Thread or Minimalist Empty State */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* If new conversation with no messages, show clean greeting */}
            {messages.length === 0 && (
              <div className="h-full min-h-[40vh] flex flex-col items-center justify-center text-center space-y-3 pt-12 animate-in fade-in duration-300">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                  Bonjour, que puis-je faire pour vous ?
                </h2>
                <p className="text-sm text-slate-500 max-w-md">
                  Posez vos questions sur la gestion du bar, vos ventes, ou tout autre sujet du quotidien.
                </p>
              </div>
            )}

            {/* Conversation Messages */}
            {messages.map((message) => {
              const isUser = message.role === 'user';
              const isPlaying = playingMessageId === message.id;

              return (
                <div
                  key={message.id}
                  className="flex flex-col items-start w-full animate-in fade-in duration-150"
                >
                  {/* Attached Files & Images Preview */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {message.attachments.map((att, idx) => (
                        <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                          {att.mimeType.startsWith('image/') ? (
                            <img
                              src={att.previewUrl || att.base64}
                              alt={att.name}
                              className="max-w-[240px] max-h-[180px] object-cover rounded-xl"
                            />
                          ) : (
                            <div className="p-2 flex items-center gap-2 text-xs text-slate-700">
                              <FileText className="w-4 h-4 text-slate-500" />
                              <span className="truncate max-w-[160px] font-medium">{att.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Clean text layout: Full width, left-aligned, natural reading stream */}
                  <div
                    className={`w-full text-sm leading-relaxed ${
                      isUser
                        ? 'bg-slate-100/80 text-slate-900 px-4 py-3 rounded-2xl font-medium'
                        : 'text-slate-800 px-1 py-1'
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    ) : (
                      <div className="markdown-body space-y-3 text-slate-800 leading-relaxed font-normal">
                        <Markdown>{message.content}</Markdown>
                      </div>
                    )}

                    {/* Web sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {message.sources.slice(0, 4).map((source, sIdx) => (
                          <a
                            key={sIdx}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium transition"
                          >
                            <span className="truncate max-w-[160px]">{source.title}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-50 shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Minimalist actions footer */}
                  {!isUser && (
                    <div className="flex items-center gap-3 mt-1.5 px-1 text-slate-400 text-xs">
                      <button
                        type="button"
                        onClick={() => handleCopy(message.content, message.id)}
                        className="hover:text-slate-700 transition flex items-center gap-1 cursor-pointer"
                        title="Copier"
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {settings.enableDonaVoice !== false && (
                        <button
                          type="button"
                          onClick={() => handleSpeak(message.content, message.id)}
                          className={`hover:text-slate-700 transition flex items-center gap-1 cursor-pointer ${
                            isPlaying ? 'text-amber-600' : ''
                          }`}
                          title="Écouter"
                        >
                          {isPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  )}

                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-2 px-1 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-100" />
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-200" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-1.5 overflow-x-auto scrollbar-none bg-white">
          <div className="max-w-3xl mx-auto flex items-center gap-1.5 whitespace-nowrap">
            {quickPrompts.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(item.prompt)}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 text-xs font-medium transition cursor-pointer disabled:opacity-50 shrink-0"
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar Area */}
        <div className="px-3 py-2 sm:px-4 sm:py-3 bg-white border-t border-slate-100 shrink-0">
          <div className="max-w-3xl mx-auto space-y-1.5">
            
            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-1">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg px-2.5 py-1 text-xs"
                  >
                    {att.mimeType.startsWith('image/') ? (
                      <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span className="truncate max-w-[140px]">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="p-0.5 hover:text-red-600 rounded cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Recording status */}
            {isRecording && (
              <div className="flex items-center justify-between bg-rose-50 text-rose-700 px-3 py-1.5 rounded-xl text-xs font-medium border border-rose-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-rose-600 rounded-full animate-ping" />
                  <span>Enregistrement en cours ({recordingDuration}s)...</span>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="font-semibold text-rose-800 hover:underline cursor-pointer"
                >
                  Terminer
                </button>
              </div>
            )}

            {/* Transcribing indicator */}
            {isTranscribing && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                Transcription vocale en cours...
              </div>
            )}

            {/* Input Box: Standard chat app dimensions (compact 40px default height, dynamic auto-grow, fine amber border) */}
            <div className="flex items-end gap-1 bg-slate-50 border border-amber-500/60 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/15 rounded-2xl p-1 sm:px-2 sm:py-1 shadow-2xs transition">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept="image/*,application/pdf,text/plain,text/csv"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer shrink-0 mb-0.5"
                title="Ajouter un fichier ou une image"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {settings.enableDonaVoice !== false && (
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl transition cursor-pointer shrink-0 mb-0.5 ${
                    isRecording 
                      ? 'text-rose-600 bg-rose-50 animate-pulse' 
                      : 'text-slate-500 hover:text-amber-600 hover:bg-slate-200/60'
                  }`}
                  title={isRecording ? "Arrêter l'enregistrement" : "Parler au micro"}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}

              {/* Full usable writable textarea with standard font and line height */}
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message à Dona..."
                rows={1}
                className="flex-1 w-full bg-transparent border-0 resize-none outline-none text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 py-1.5 px-1 min-h-[20px] max-h-32 leading-5 font-sans"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
                className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl transition shrink-0 cursor-pointer mb-0.5 ${
                  inputText.trim() || attachments.length > 0
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold shadow-2xs'
                    : 'text-slate-300 bg-transparent cursor-not-allowed opacity-40'
                }`}
                title="Envoyer"
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            <div className="text-[10px] text-slate-400 text-center">
              Dona peut faire des erreurs. Vérifiez les informations importantes.
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
