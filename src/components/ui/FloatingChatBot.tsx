import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChatbotConfig {
  id: string;
  is_active: boolean;
  bot_name: string;
  welcome_message: string;
  primary_color: string;
  quick_replies: string[];
}

interface Message {
  sender: 'bot' | 'user';
  text: string;
  timestamp: Date;
}

export default function FloatingChatBot() {
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchConfig();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_config')
        .select('*')
        .single();

      if (!error && data) {
        setConfig(data);
        setMessages([
          {
            sender: 'bot',
            text: data.welcome_message,
            timestamp: new Date()
          }
        ]);
      }
    } catch (err) {
      console.warn('Error loading chatbot config:', err);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  if (!config || !config.is_active) {
    return null;
  }

  const getFAQAnswer = (question: string): string => {
    const q = question.toLowerCase();
    if (q.includes('pedido') || q.includes('dónde') || q.includes('donde') || q.includes('localizar')) {
      return "📦 Para localizar tu pedido en tiempo real, por favor introduce tu código de seguimiento de HoloCards (ej. `#HC-48293`) o inicia sesión en el menú superior para ver tu historial de envíos.";
    }
    if (q.includes('envío') || q.includes('envio') || q.includes('política') || q.includes('canarias') || q.includes('islas')) {
      return "✈️ Realizamos envíos diarios asegurados a todas las Islas Canarias. Los tiempos de entrega estimados son de 24h a 48h en islas capitalinas y hasta 72h en islas no capitalinas.";
    }
    if (q.includes('humano') || q.includes('hablar') || q.includes('persona') || q.includes('soporte')) {
      return "👨‍💻 Entendido. He enviado una alerta a la central de Sasori Labs. Un agente humano se pondrá en contacto contigo en este mismo chat en breve. ¡Gracias por tu paciencia!";
    }
    return "💡 ¡Excelente pregunta! He registrado tu consulta y la he derivado a nuestro soporte técnico. Si necesitas una respuesta inmediata, te sugiero utilizar nuestros accesos rápidos o escribir directamente a soporte@holocards.com.";
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const cleanText = text.trim();
    const userMsg: Message = {
      sender: 'user',
      text: cleanText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      const botReplyText = getFAQAnswer(cleanText);
      const botMsg: Message = {
        sender: 'bot',
        text: botReplyText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <>
      <div className="fixed bottom-6 right-4 sm:right-6 z-[200] safe-bottom">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all group"
          style={{ 
            backgroundColor: config.primary_color,
            boxShadow: `0 8px 30px ${config.primary_color}44` 
          }}
          title={`Chat con ${config.bot_name}`}
          aria-label={`Abrir chat con ${config.bot_name}`}
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform rotate-90 duration-300" />
          ) : (
            <MessageSquare className="w-6 h-6 transition-transform hover:scale-110 duration-200" />
          )}

          <span className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-20 pointer-events-none" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-24 right-2 sm:right-6 w-[calc(100vw-16px)] sm:w-[400px] h-[75vh] sm:h-[550px] max-h-[600px] bg-background/95 dark:bg-zinc-950/95 border border-border/80 rounded-[2.5rem] shadow-2xl z-[200] overflow-hidden flex flex-col backdrop-blur-xl"
          >
            <div 
              className="p-5 flex items-center justify-between text-white"
              style={{ backgroundColor: config.primary_color }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative border border-white/10">
                  <Bot className="w-5 h-5 text-white" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase italic tracking-wider leading-none">
                    {config.bot_name}
                  </h3>
                  <p className="text-[9px] uppercase tracking-widest text-white/70 font-mono mt-1">
                    Soporte Inteligente
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-all"
                title="Minimizar chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-black/20">
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex gap-3 max-w-[85%] items-end",
                    msg.sender === 'user' ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border shrink-0 text-xs shadow-sm",
                    msg.sender === 'user' 
                      ? "bg-slate-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200" 
                      : "bg-white dark:bg-zinc-900 border-border"
                  )}
                  style={{
                    color: msg.sender === 'user' ? undefined : config.primary_color,
                    borderColor: msg.sender === 'user' ? undefined : `${config.primary_color}22`
                  }}
                  >
                    {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div 
                    className={cn(
                      "p-4 text-xs leading-relaxed shadow-sm font-medium",
                      msg.sender === 'user' 
                        ? "text-white rounded-[1.5rem] rounded-br-none" 
                        : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-border/50 rounded-[1.5rem] rounded-bl-none"
                    )}
                    style={{
                      backgroundColor: msg.sender === 'user' ? config.primary_color : undefined
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3 max-w-[85%] items-end">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center border border-border bg-white dark:bg-zinc-900 shrink-0 shadow-sm"
                    style={{ color: config.primary_color }}
                  >
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 bg-white dark:bg-zinc-900 border border-border/50 rounded-[1.5rem] rounded-bl-none shadow-sm flex items-center gap-1.5 min-w-[60px]">
                    <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {config.quick_replies && config.quick_replies.length > 0 && (
              <div className="p-4 border-t border-border/50 bg-slate-50/20 dark:bg-black/10 flex flex-wrap gap-2 shrink-0">
                {config.quick_replies.map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(reply)}
                    className="px-3.5 py-2 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-border/70 rounded-full text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition-all hover:scale-[1.02] shadow-sm flex items-center"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="p-4 border-t border-border/80 bg-background flex items-center gap-2.5"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="flex-1 bg-slate-100 dark:bg-zinc-900 border border-border rounded-xl py-3 px-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder:text-muted-foreground/60"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-900/10"
                style={{ backgroundColor: config.primary_color }}
                title="Enviar mensaje"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}