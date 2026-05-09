import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  FaQuestionCircle, 
  FaRobot, 
  FaUser, 
  FaWallet, 
  FaShieldAlt, 
  FaGavel, 
  FaUserCircle, 
  FaTasks, 
  FaStar, 
  FaComments, 
  FaExchangeAlt, 
  FaArrowLeft, 
  FaInfoCircle 
} from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import '../css/SupportBot.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  options?: string[];
  optionIndices?: number[]; // Store indices of related questions for translation
  faqCategory?: string;
  faqQuestion?: string;
  faqQuestionIndex?: number;
  isFAQQuestion?: boolean;
}

interface FAQ {
  question: string;
  answer: string;
  detailedAnswer?: string;
  category: string;
  relatedQuestions?: string[];
  followUpInfo?: { [key: string]: string };
}

const SupportBot: React.FC = () => {
  const { lang, t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialMessageSet = useRef(false);

  // Generate FAQs dynamically from translations
  const faqs: FAQ[] = useMemo(() => {
    const categories = [
      'payments', 'escrow', 'disputes', 'account', 'tasks', 'ratings', 
      'messaging', 'swap', 'registration', 'fees', 'security', 
      'taskflow', 'limits', 'cancellation', 'notifications', 'portfolio', 'search'
    ];

    // Map of category to followup keys
    const followUpKeys: { [key: string]: string[] } = {
      'payments': ['wallets', 'time', 'currency', 'cost'],
      'escrow': ['how', 'safe', 'cost', 'not.approved'],
      'disputes': ['how', 'who', 'time', 'evidence'],
      'account': ['edit', 'public', 'stats', 'password'],
      'tasks': ['create', 'apply', 'categories', 'manage'],
      'ratings': ['how', 'edit', 'bad', 'improve'],
      'messaging': ['send', 'files', 'notifications', 'delete'],
      'swap': ['how', 'cost', 'safe', 'tokens'],
      'registration': ['how', 'wallet', 'auth', 'info'],
      'fees': ['cost', 'who', 'hidden', 'compare'],
      'security': ['safe', 'data', 'private', 'funds'],
      'taskflow': ['process', 'start', 'complete', 'cancel'],
      'limits': ['howmany', 'apply', 'cooldown', 'reset'],
      'cancellation': ['how', 'refund', 'after', 'client'],
      'notifications': ['what', 'manage', 'email', 'disable'],
      'portfolio': ['complete', 'what', 'important', 'private'],
      'search': ['how', 'price', 'freelancers', 'save'],
    };

    return categories.map(category => {
      const relatedQuestions: string[] = [];
      const followUpInfo: { [key: string]: string } = {};

      // Get related questions (0-3)
      for (let i = 0; i < 4; i++) {
        const key = `support.faq.${category}.related.${i}`;
        const question = t(key);
        if (question && question !== key) {
          relatedQuestions.push(question);
        }
      }

      // Get follow-up info for each related question
      const keys = followUpKeys[category] || [];
      relatedQuestions.forEach((question, index) => {
        if (keys[index]) {
          const followUpKey = `support.faq.${category}.followup.${keys[index]}`;
          const answer = t(followUpKey);
          if (answer && answer !== followUpKey) {
            followUpInfo[question] = answer;
          }
        }
      });

      return {
        question: t(`support.faq.${category}.question`),
        answer: t(`support.faq.${category}.answer`),
        detailedAnswer: t(`support.faq.${category}.detailed`),
        category: category,
        relatedQuestions: relatedQuestions,
        followUpInfo: followUpInfo,
      };
    });
  }, [t, lang]);

  // Translate existing messages when language changes
  useEffect(() => {
    if (messages.length === 0) return;

    const translateBotMessage = (message: Message): Message => {
      if (message.sender !== 'bot') return message;

      // If it's a welcome message, retranslate it
      if (message.id === '1' || 
          (message.options && message.options.length === faqs.length)) {
        return {
          ...message,
          text: t('support.bot.welcome'),
          options: faqs.map(faq => faq.question),
        };
      }

      // If message has FAQ category, retranslate from FAQ
      if (message.faqCategory) {
        const faq = faqs.find(f => f.category === message.faqCategory);
        if (faq) {
          const translatedAnswer = faq.detailedAnswer || faq.answer;
          
          // Always regenerate options from the translated FAQ
          // This ensures options are always in the current language
          let translatedOptions: string[] = [];
          
          if (faq.relatedQuestions && faq.relatedQuestions.length > 0) {
            // Use the first 3 related questions from the translated FAQ
            translatedOptions = [...faq.relatedQuestions.slice(0, 3)];
          }
          
          // Add back menu button
          translatedOptions.push(t('support.bot.back.menu'));
          
          // If no related questions, add more help button
          if (!faq.relatedQuestions || faq.relatedQuestions.length === 0) {
            translatedOptions.push(t('support.bot.more.help'));
          }

          return {
            ...message,
            text: translatedAnswer,
            options: translatedOptions,
          };
        }
      }

      // If message has FAQ question, try to find and retranslate
      if (message.faqQuestion) {
        // Try to find FAQ by category first (more reliable)
        let faq = message.faqCategory ? faqs.find(f => f.category === message.faqCategory) : null;
        
        // If not found by category, try to find by question text
        if (!faq) {
          faq = faqs.find(f => 
            f.question === message.faqQuestion || 
            f.relatedQuestions?.some(q => q === message.faqQuestion)
          );
        }
        
        if (faq) {
          let translatedOptions: string[] = [];
          
          if (faq.relatedQuestions && faq.relatedQuestions.length > 0) {
            translatedOptions = [...faq.relatedQuestions.slice(0, 3)];
          }
          
          translatedOptions.push(t('support.bot.back.menu'));
          
          if (!faq.relatedQuestions || faq.relatedQuestions.length === 0) {
            translatedOptions.push(t('support.bot.more.help'));
          }
          
          return {
            ...message,
            text: faq.detailedAnswer || faq.answer,
            faqCategory: faq.category,
            faqQuestion: faq.question,
            options: translatedOptions,
          };
        }
      }

      return message;
    };

    const translateUserFAQQuestion = (message: Message): Message => {
      if (message.sender !== 'user') return message;

      // If message has faqCategory, use it directly to get the translated question
      // This is the most reliable method
      if (message.faqCategory) {
        const faq = faqs.find(f => f.category === message.faqCategory);
        if (faq) {
          // If it's a main question (message has faqQuestion that matches main question)
          // or if the text matches the main question, use the main question
          if (message.faqQuestion === faq.question || 
              message.text === faq.question ||
              (message.isFAQQuestion && !message.faqQuestion)) {
            return {
              ...message,
              text: faq.question,
              faqQuestion: faq.question,
            };
          }
          
          // Check if it matches any related question
          if (faq.relatedQuestions && faq.relatedQuestions.length > 0) {
            // First try exact match
            const exactMatch = faq.relatedQuestions.find(q => q === message.text || q === message.faqQuestion);
            if (exactMatch) {
              return {
                ...message,
                text: exactMatch,
                faqQuestion: exactMatch,
              };
            }
            
            // Then try fuzzy match
            const relatedMatch = faq.relatedQuestions.find(q => {
              const qLower = q.toLowerCase();
              const msgLower = message.text.toLowerCase();
              return qLower.includes(msgLower.substring(0, Math.min(20, msgLower.length))) ||
                     msgLower.includes(qLower.substring(0, Math.min(20, qLower.length)));
            });
            if (relatedMatch) {
              return {
                ...message,
                text: relatedMatch,
                faqQuestion: relatedMatch,
              };
            }
          }
          
          // If no match in related questions but we have category, assume it's the main question
          if (message.isFAQQuestion) {
            return {
              ...message,
              text: faq.question,
              faqQuestion: faq.question,
            };
          }
        }
      }

      // If not found by category, search in all FAQs by text matching
      // This handles cases where the message text is a question from any FAQ
      for (const faq of faqs) {
        // Check main question - exact match first
        if (faq.question === message.text) {
          return {
            ...message,
            text: faq.question,
            faqCategory: faq.category,
            faqQuestion: faq.question,
            isFAQQuestion: true,
          };
        }
        
        // Check related questions - exact match first
        if (faq.relatedQuestions && faq.relatedQuestions.length > 0) {
          const exactRelatedMatch = faq.relatedQuestions.find(q => q === message.text);
          if (exactRelatedMatch) {
            return {
              ...message,
              text: exactRelatedMatch,
              faqCategory: faq.category,
              faqQuestion: exactRelatedMatch,
              isFAQQuestion: true,
            };
          }
        }
        
        // Then try fuzzy matching for main question
        if (message.text.toLowerCase().includes(faq.question.toLowerCase().substring(0, 20)) ||
            faq.question.toLowerCase().includes(message.text.toLowerCase().substring(0, 20))) {
          return {
            ...message,
            text: faq.question,
            faqCategory: faq.category,
            faqQuestion: faq.question,
            isFAQQuestion: true,
          };
        }
        
        // Then try fuzzy matching for related questions
        if (faq.relatedQuestions && faq.relatedQuestions.length > 0) {
          const relatedMatch = faq.relatedQuestions.find(q => {
            const qLower = q.toLowerCase();
            const msgLower = message.text.toLowerCase();
            return qLower.includes(msgLower.substring(0, Math.min(20, msgLower.length))) ||
                   msgLower.includes(qLower.substring(0, Math.min(20, qLower.length)));
          });
          if (relatedMatch) {
            return {
              ...message,
              text: relatedMatch,
              faqCategory: faq.category,
              faqQuestion: relatedMatch,
              isFAQQuestion: true,
            };
          }
        }
      }

      // If no match found, return original message
      return message;
    };

    setMessages(prev => {
      const translated = prev.map(msg => {
        if (msg.sender === 'bot') {
          return translateBotMessage(msg);
        } else if (msg.sender === 'user') {
          // Translate all user messages, not just FAQ questions
          return translateUserFAQQuestion(msg);
        }
        return msg;
      });
      return translated;
    });
    setShouldAutoScroll(false); // Prevent auto-scroll when translating
  }, [lang, faqs, t]);

  // Set initial welcome message or update it when language changes
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: '1',
        text: t('support.bot.welcome'),
        sender: 'bot',
        timestamp: new Date(),
        options: faqs.map(faq => faq.question),
      };
      setMessages([welcomeMessage]);
      initialMessageSet.current = true;
      setShouldAutoScroll(true);
    } else {
      // Check if first message is welcome message and update it
      const firstMessage = messages[0];
      if (firstMessage && firstMessage.id === '1' && firstMessage.sender === 'bot') {
        const currentWelcomeText = t('support.bot.welcome');
        const currentOptions = faqs.map(faq => faq.question);
        
        // Only update if text or options have changed
        if (firstMessage.text !== currentWelcomeText || 
            JSON.stringify(firstMessage.options) !== JSON.stringify(currentOptions)) {
          setMessages(prev => {
            const updated = [...prev];
            updated[0] = {
              ...updated[0],
              text: currentWelcomeText,
              options: currentOptions,
            };
            return updated;
          });
        }
      }
    }
  }, [faqs, t, lang, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (shouldAutoScroll && messages.length > 1) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setShouldAutoScroll(false);
      }, 100);
    }
  }, [messages, shouldAutoScroll]);

  const handleOptionClick = (option: string) => {
    if (isTyping) return;

    // Clear any pending timeout
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
    }

    // Check if it's a follow-up question from the current FAQ context
    const lastBotMessage = messages.filter(m => m.sender === 'bot').pop();
    const currentFaq = lastBotMessage?.faqCategory ? faqs.find(f => f.category === lastBotMessage.faqCategory) : null;
    
    let answer = '';
    let options = [t('support.bot.back.menu'), t('support.bot.more.help')];
    let faqCategory = currentFaq?.category;

    // Check if it's a follow-up question
    if (currentFaq?.followUpInfo && currentFaq.followUpInfo[option]) {
      answer = currentFaq.followUpInfo[option];
      faqCategory = currentFaq.category;
    } else {
      // Find FAQ by question text
      const faq = faqs.find(f => f.question === option);
      if (faq) {
        answer = faq.detailedAnswer || faq.answer;
        faqCategory = faq.category;
        if (faq.relatedQuestions && faq.relatedQuestions.length > 0) {
          options = [...faq.relatedQuestions.slice(0, 3), t('support.bot.back.menu')];
        }
      } else {
        answer = 'Lo siento, no encontré información sobre eso. ¿Puedes ser más específico?';
      }
    }

    // Find the FAQ to get the correct category and question text
    // Always use the FAQ's question text to ensure it's in the current language
    let userQuestion = option;
    let userFaqCategory = faqCategory;
    
    // If we found a FAQ by category, use its question text directly
    if (faqCategory) {
      const faq = faqs.find(f => f.category === faqCategory);
      if (faq) {
        // If the option matches the main question, use the FAQ's question text
        if (faq.question === option) {
          userQuestion = faq.question;
        } else if (faq.relatedQuestions && faq.relatedQuestions.includes(option)) {
          // It's a related question, use it as is (already translated)
          userQuestion = option;
        } else {
          // Try to find a match in related questions
          const relatedMatch = faq.relatedQuestions?.find(q => 
            q === option || 
            q.toLowerCase().includes(option.toLowerCase().substring(0, 20)) ||
            option.toLowerCase().includes(q.toLowerCase().substring(0, 20))
          );
          if (relatedMatch) {
            userQuestion = relatedMatch;
          } else {
            // If no match found but we have a category, assume it's the main question
            userQuestion = faq.question;
          }
        }
      }
    } else {
      // If no category, try to find the FAQ by question text
      const faq = faqs.find(f => f.question === option);
      if (faq) {
        userQuestion = faq.question; // Use FAQ's question text (already translated)
        userFaqCategory = faq.category;
      } else {
        // Try to find in related questions
        for (const f of faqs) {
          if (f.relatedQuestions && f.relatedQuestions.includes(option)) {
            userQuestion = option; // Related question is already translated
            userFaqCategory = f.category;
            break;
          }
        }
      }
    }

    // Add user message
    // Always use the FAQ's question text to ensure consistency across languages
    const finalFaq = userFaqCategory ? faqs.find(f => f.category === userFaqCategory) : null;
    const finalQuestion = finalFaq && finalFaq.question === userQuestion ? finalFaq.question : userQuestion;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: finalQuestion,
      sender: 'user',
      timestamp: new Date(),
      isFAQQuestion: true,
      faqCategory: userFaqCategory,
      faqQuestion: finalQuestion,
    };

    setMessages(prev => {
      // Remove intermediate user messages if multiple clicks
      const filtered = prev.filter(msg => !(msg.sender === 'user' && msg.id !== userMessage.id && !msg.isFAQQuestion));
      return [...filtered, userMessage];
    });

    setIsTyping(true);
    setShouldAutoScroll(true);

    // Simulate typing delay
    pendingTimeoutRef.current = setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: answer,
        sender: 'bot',
        timestamp: new Date(),
        faqCategory: faqCategory,
        faqQuestion: option,
        options: options,
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (!input || !input.value.trim() || isTyping) return;

    const userText = input.value.trim();
    input.value = '';

    // Clear any pending timeout
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => {
      // Remove intermediate user messages
      const filtered = prev.filter(msg => !(msg.sender === 'user' && msg.id !== userMessage.id && !msg.isFAQQuestion));
      return [...filtered, userMessage];
    });

    setIsTyping(true);
    setShouldAutoScroll(true);

    // Enhanced keyword matching
    const lowerText = userText.toLowerCase();
    let answer = t('support.bot.not.found');
    let matchedFaq: FAQ | undefined;
    let followUpOptions = [t('support.bot.back.menu'), t('support.bot.more.help')];

    // Keywords mapping for better matching
    const keywordMap: Record<string, string> = {
      'pago': 'payments',
      'wallet': 'payments',
      'dinero': 'payments',
      'cobrar': 'payments',
      'recibir': 'payments',
      'escrow': 'escrow',
      'garantía': 'escrow',
      'depósito': 'escrow',
      'contrato': 'escrow',
      'disputa': 'disputes',
      'problema': 'disputes',
      'conflicto': 'disputes',
      'cuenta': 'account',
      'perfil': 'account',
      'configuración': 'account',
      'tarea': 'tasks',
      'trabajo': 'tasks',
      'proyecto': 'tasks',
      'propuesta': 'tasks',
      'calificación': 'ratings',
      'rating': 'ratings',
      'estrella': 'ratings',
      'mensaje': 'messaging',
      'chat': 'messaging',
      'comunicación': 'messaging',
      'intercambio': 'swap',
      'swap': 'swap',
      'xlm': 'swap',
      'usdc': 'swap',
      'registro': 'registration',
      'registrarse': 'registration',
      'login': 'registration',
      'iniciar sesión': 'registration',
      'comisión': 'fees',
      'tarifa': 'fees',
      'costo': 'fees',
      'precio': 'fees',
      'seguridad': 'security',
      'privacidad': 'security',
      'proteger': 'security',
    };

    // Try to match by keywords
    for (const [keyword, category] of Object.entries(keywordMap)) {
      if (lowerText.includes(keyword)) {
        matchedFaq = faqs.find(f => f.category === category);
        if (matchedFaq) break;
      }
    }

    // If no match by keywords, try direct question matching
    if (!matchedFaq) {
      for (const faq of faqs) {
        if (lowerText.includes(faq.category) || 
            faq.question.toLowerCase().includes(lowerText) ||
            faq.answer.toLowerCase().includes(lowerText)) {
          matchedFaq = faq;
          break;
        }
      }
    }

    if (matchedFaq) {
      answer = matchedFaq.detailedAnswer || matchedFaq.answer;
      if (matchedFaq.relatedQuestions && matchedFaq.relatedQuestions.length > 0) {
        followUpOptions = [...matchedFaq.relatedQuestions.slice(0, 3), t('support.bot.back.menu')];
      }
    }

    pendingTimeoutRef.current = setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: answer,
        sender: 'bot',
        timestamp: new Date(),
        faqCategory: matchedFaq?.category,
        faqQuestion: matchedFaq?.question,
        options: followUpOptions,
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
      setShouldAutoScroll(true);
    }, 1000);
  };

  const handleBackToMenu = () => {
    if (isTyping) return;

    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
    }

    const welcomeMessage: Message = {
      id: (Date.now() + 2).toString(),
      text: t('support.bot.welcome'),
      sender: 'bot',
      timestamp: new Date(),
      options: faqs.map(faq => faq.question),
    };

    setMessages([welcomeMessage]);
    setIsTyping(false);
    setShouldAutoScroll(true);
  };

  const formatTime = (date: Date) => {
    const locale = lang === 'es' ? 'es-ES' : 'en-US';
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOptionIcon = (option: string): React.ReactNode => {
    const backMenuText = t('support.bot.back.menu');
    const moreHelpText = t('support.bot.more.help');
    if (option === backMenuText || (lang === 'es' && option.includes('Volver')) || (lang === 'en' && option.includes('Back'))) return <FaArrowLeft />;
    if (option === moreHelpText || (lang === 'es' && option.includes('ayuda')) || (lang === 'en' && option.includes('help'))) return <FaInfoCircle />;
    if (option.includes('Pago') || option.includes('Wallet') || option.includes('wallet') || option.includes('moneda') || option.includes('tiempo')) return <FaWallet />;
    if (option.includes('Escrow') || option.includes('escrow') || option.includes('Seguridad') || option.includes('seguro') || option.includes('costo') || option.includes('cuenta')) return <FaShieldAlt />;
    if (option.includes('Disputa') || option.includes('disputa') || option.includes('inicio') || option.includes('resuelve') || option.includes('evidencia')) return <FaGavel />;
    if (option.includes('Cuenta') || option.includes('Perfil') || option.includes('perfil') || option.includes('editar') || option.includes('público') || option.includes('estadísticas') || option.includes('contraseña')) return <FaUserCircle />;
    if (option.includes('Tarea') || option.includes('tarea') || option.includes('crear') || option.includes('aplicar') || option.includes('categoría') || option.includes('gestionar')) return <FaTasks />;
    if (option.includes('Calificación') || option.includes('calificación') || option.includes('Rating') || option.includes('rating') || option.includes('editar') || option.includes('mejorar')) return <FaStar />;
    if (option.includes('Mensaje') || option.includes('mensaje') || option.includes('archivo') || option.includes('notificación') || option.includes('eliminar')) return <FaComments />;
    if (option.includes('Intercambio') || option.includes('intercambio') || option.includes('Swap') || option.includes('swap') || option.includes('token') || option.includes('XLM') || option.includes('USDC')) return <FaExchangeAlt />;
    if (option.includes('Registro') || option.includes('registro') || option.includes('autenticación') || option.includes('información')) return <FaUserCircle />;
    if (option.includes('Comisión') || option.includes('comisión') || option.includes('Tarifa') || option.includes('tarifa') || option.includes('costo') || option.includes('comparar')) return <FaWallet />;
    if (option.includes('Flujo') || option.includes('flujo') || option.includes('proceso') || option.includes('iniciado') || option.includes('completar')) return <FaTasks />;
    if (option.includes('Límite') || option.includes('límite') || option.includes('restricción') || option.includes('cooldown') || option.includes('resetear')) return <FaInfoCircle />;
    if (option.includes('Cancelar') || option.includes('cancelar') || option.includes('reembolso')) return <FaGavel />;
    if (option.includes('Notificación') || option.includes('notificación') || option.includes('email')) return <FaComments />;
    if (option.includes('Portfolio') || option.includes('portfolio') || option.includes('perfil público') || option.includes('habilidad')) return <FaUserCircle />;
    if (option.includes('Búsqueda') || option.includes('búsqueda') || option.includes('buscar') || option.includes('filtrar') || option.includes('filtro')) return <FaInfoCircle />;
    return <FaQuestionCircle />;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="support-bot-container">
      <div className="support-bot-header">
        <div className="support-bot-header-content">
          <div className="support-bot-avatar">
            <FaRobot />
          </div>
          <div className="support-bot-header-text">
            <h3>{t('support.bot.title')}</h3>
            <p>{t('support.bot.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="support-bot-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`support-message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
          >
            <div className="message-avatar">
              {message.sender === 'user' ? <FaUser /> : <FaRobot />}
            </div>
            <div className="message-content">
              <div className="message-text">{message.text}</div>
              <div className="message-time">{formatTime(message.timestamp)}</div>
              {message.options && message.options.length > 0 && (
                <div className="message-options">
                  {message.options.map((option, index) => (
                    <button
                      key={index}
                      className="option-button"
                      onClick={() => {
                        if (option === t('support.bot.back.menu')) {
                          handleBackToMenu();
                        } else {
                          handleOptionClick(option);
                        }
                      }}
                      disabled={isTyping}
                    >
                      <span className="option-icon">{getOptionIcon(option)}</span>
                      <span className="option-text">{option}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="support-message bot-message typing">
            <div className="message-avatar">
              <FaRobot />
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="support-bot-input-form" onSubmit={handleSendMessage}>
        <input
          ref={inputRef}
          type="text"
          className="support-bot-input"
          placeholder={t('support.bot.input.placeholder')}
          disabled={isTyping}
        />
        <button type="submit" className="support-bot-send" disabled={isTyping}>
          {t('support.bot.send')}
        </button>
      </form>
    </div>
  );
};

export default SupportBot;
