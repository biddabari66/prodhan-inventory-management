
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, Loader2, Sparkles } from 'lucide-react';
import { askChatbot } from '@/functions/askChatbot';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';

const JAMES_BOND_AVATAR_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/686aeb57b62314958e21fd12/49c3e79d6_image.png";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Greetings. The name's ERP, Bee ERP. I'm your AI assistant. How can I be of service?",
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const scrollAreaRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (e) {
        console.warn("Chatbot: User not logged in.");
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current?.viewport) {
      scrollAreaRef.current.viewport.scrollTop = scrollAreaRef.current.viewport.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await askChatbot({ query: inputMessage });
      
      if (response.data?.response) {
        const botMessage = {
          id: Date.now() + 1,
          text: response.data.response,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(response.data?.error || 'No response received');
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Apologies, my communication systems are momentarily jammed. Please try again.',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  // Custom renderer for markdown links - FIXED: Purple styling
  const MarkdownLinkRenderer = ({ href, children }) => {
    if (href && href.startsWith('page:')) {
      const pageName = href.substring(5);
      return (
        <Link 
          to={createPageUrl(pageName)} 
          className="text-purple-400 hover:text-purple-300 font-semibold underline decoration-purple-400 hover:decoration-purple-300 transition-all duration-200"
          onClick={() => setIsOpen(false)}
        >
          {children}
        </Link>
      );
    }
    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{children}</a>;
  };

  return (
    <>
      {/* Enhanced floating button with multilingual support */}
      <motion.div
        className="fixed bottom-4 right-4 z-50"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="relative w-20 h-20 rounded-full bg-slate-900 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 border-2 border-slate-700 p-0 overflow-hidden group"
          style={{ minWidth: '80px', minHeight: '80px' }}
        >
          <img 
            src={JAMES_BOND_AVATAR_URL} 
            alt="AI Assistant" 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors"></div>
          {/* Enhanced tooltip for multilingual support */}
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Ask me anything! / আমাকে কিছু জিজ্ঞাসা করুন!
          </div>
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[60] md:bg-transparent md:pointer-events-none"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed z-[70] inset-4 md:inset-auto md:bottom-28 md:right-4 md:w-96 md:h-[500px]"
            >
              <Card className="w-full h-full flex flex-col shadow-2xl border border-slate-700 bg-slate-900 text-white">
                <CardHeader className="flex-shrink-0 bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={JAMES_BOND_AVATAR_URL} alt="AI Assistant" />
                        <AvatarFallback>007</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">Agent 00E</CardTitle>
                        <p className="text-slate-400 text-sm flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                          <span className="text-xs">Multilingual • বহুভাষিক</span>
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="text-slate-400 hover:bg-slate-700 w-8 h-8 p-0 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                  <ScrollArea 
                    ref={scrollAreaRef}
                    className="flex-1 p-4"
                  >
                    <div className="space-y-6">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex items-end gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          {message.sender === 'bot' && (
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={JAMES_BOND_AVATAR_URL} />
                              <AvatarFallback>00E</AvatarFallback>
                            </Avatar>
                          )}
                           <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                              message.sender === 'user'
                                ? 'bg-violet-600 text-white rounded-br-none'
                                : 'bg-slate-700 text-slate-200 rounded-bl-none'
                            }`}
                          >
                            <ReactMarkdown
                               components={{ 
                                 a: MarkdownLinkRenderer,
                                 // Enhanced styling for better readability
                                 p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                 ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                                 li: ({ children }) => <li className="mb-1">{children}</li>
                               }}
                               className="prose prose-sm prose-invert max-w-none"
                            >
                               {message.text}
                            </ReactMarkdown>
                          </div>
                          {message.sender === 'user' && (
                             <Avatar className="w-8 h-8">
                              <AvatarImage src={currentUser?.profile_picture_url} />
                              <AvatarFallback className="bg-violet-600 text-white">
                                {currentUser?.full_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}
                      
                      {isLoading && (
                        <div className="flex items-end gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={JAMES_BOND_AVATAR_URL} />
                            <AvatarFallback>00E</AvatarFallback>
                          </Avatar>
                          <div className="bg-slate-700 rounded-2xl px-4 py-3 rounded-bl-none">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                              <span className="text-sm text-slate-400">
                                Processing intel... / তথ্য প্রক্রিয়াকরণ...
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  <div className="flex-shrink-0 p-4 bg-slate-800/50 border-t border-slate-700">
                    <div className="flex gap-2">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="State your mission... / আপনার মিশন বলুন..."
                        disabled={isLoading}
                        className="flex-1 bg-slate-700 border-slate-600 focus:border-purple-500 h-12 text-base text-white placeholder-slate-400"
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={isLoading || !inputMessage.trim()}
                        className="bg-purple-600 hover:bg-purple-700 text-white w-12 h-12 p-0 rounded-full"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
