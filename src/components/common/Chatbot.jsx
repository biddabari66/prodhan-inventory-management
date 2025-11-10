import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  Send, 
  X, 
  Loader2, 
  Sparkles, 
  Bot,
  MinusCircle,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  Lightbulb
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

/**
 * 🤖 PROACTIVE AI CHATBOT WITH PERSONALIZED SUPPORT
 * - Initiates conversations based on user behavior
 * - Summarizes user-specific data (tasks, deadlines, approvals)
 * - Integrates with AI help system for contextual tips
 * - Learns from user interactions
 */

const CONTEXT_HELP_INTEGRATION = {
  '/Dashboard': {
    en: 'I can help you understand your dashboard metrics, KPIs, and performance analytics.',
    bn: 'আমি আপনার ড্যাশবোর্ড মেট্রিক্স, KPI এবং পারফরম্যান্স বিশ্লেষণ বুঝতে সাহায্য করতে পারি।'
  },
  '/Attendance': {
    en: 'Need help with check-in/check-out or viewing attendance records? Just ask!',
    bn: 'চেক-ইন/চেক-আউট বা উপস্থিতি রেকর্ড দেখতে সাহায্য দরকার? শুধু জিজ্ঞাসা করুন!'
  },
  '/Expenses': {
    en: 'I can guide you through expense submission, approval workflows, and tracking.',
    bn: 'আমি আপনাকে খরচ জমা, অনুমোদন প্রক্রিয়া এবং ট্র্যাকিং এর মাধ্যমে গাইড করতে পারি।'
  },
  '/CRM': {
    en: 'Ask me about managing leads, follow-ups, and conversion strategies.',
    bn: 'লিড পরিচালনা, ফলো-আপ এবং রূপান্তর কৌশল সম্পর্কে আমাকে জিজ্ঞাসা করুন।'
  },
  '/Inventory': {
    en: 'I can help with stock management, reordering, and inventory analytics.',
    bn: 'আমি স্টক ব্যবস্থাপনা, পুনর্মুদ্রণ এবং ইনভেন্টরি বিশ্লেষণে সাহায্য করতে পারি।'
  }
};

export default function Chatbot({ currentUser, currentPageName, currentLanguage = 'en' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState(null);
  const [hasShownProactiveMessage, setHasShownProactiveMessage] = useState(false);
  const [userBehavior, setUserBehavior] = useState({
    timeOnPage: 0,
    idleTime: 0,
    lastActivity: Date.now()
  });

  const messagesEndRef = useRef(null);
  const idleTimerRef = useRef(null);
  const pageTimerRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 🔥 PROACTIVE: Track user behavior
  useEffect(() => {
    if (!currentUser) return;

    // Track time on page
    pageTimerRef.current = setInterval(() => {
      setUserBehavior(prev => ({
        ...prev,
        timeOnPage: prev.timeOnPage + 1
      }));
    }, 1000);

    // Track idle time
    const resetIdleTimer = () => {
      setUserBehavior(prev => ({
        ...prev,
        idleTime: 0,
        lastActivity: Date.now()
      }));
    };

    idleTimerRef.current = setInterval(() => {
      setUserBehavior(prev => ({
        ...prev,
        idleTime: prev.idleTime + 1
      }));
    }, 1000);

    // Reset idle on activity
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetIdleTimer);
    });

    return () => {
      clearInterval(pageTimerRef.current);
      clearInterval(idleTimerRef.current);
      events.forEach(event => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [currentUser]);

  // 🔥 PROACTIVE: Fetch user-specific context data
  const fetchUserContext = useCallback(async () => {
    if (!currentUser) return;

    try {
      console.log('📊 Fetching user context data...');

      // Fetch in parallel for speed
      const [tasks, expenses, attendance, leads] = await Promise.all([
        base44.entities.Task.filter({ 
          assigned_to: { $contains: currentUser.id },
          status: { $in: ['pending', 'in_progress'] }
        }).catch(() => []),
        
        base44.entities.Expense.filter({ 
          $or: [
            { submitted_by: currentUser.id, status: { $in: ['pending_manager_approval', 'pending_finance_approval'] } },
            { status: 'pending_manager_approval' } // If user is manager
          ]
        }).catch(() => []),
        
        base44.entities.Attendance.filter({
          employee_id: currentUser.id,
          date: new Date().toISOString().split('T')[0]
        }).catch(() => []),
        
        currentUser.job_role === 'admin' || currentUser.job_role === 'manager'
          ? base44.entities.Lead.filter({ 
              assigned_to: currentUser.id,
              lead_status: { $in: ['new', 'contacted'] }
            }).catch(() => [])
          : []
      ]);

      // Calculate upcoming deadlines
      const upcomingTasks = tasks
        .filter(t => t.deadline && new Date(t.deadline) > new Date())
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 3);

      // Find overdue tasks
      const overdueTasks = tasks.filter(t => 
        t.deadline && new Date(t.deadline) < new Date()
      );

      const context = {
        tasks: tasks.length,
        upcomingTasks,
        overdueTasks: overdueTasks.length,
        pendingExpenses: expenses.length,
        todayAttendance: attendance.length > 0 ? attendance[0] : null,
        activeLeads: leads.length,
        lastUpdated: new Date().toISOString()
      };

      setUserContext(context);
      console.log('✅ User context loaded:', context);
      
      return context;
    } catch (error) {
      console.error('Failed to fetch user context:', error);
      return null;
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && !userContext) {
      fetchUserContext();
    }
  }, [currentUser, userContext, fetchUserContext]);

  // 🔥 PROACTIVE: Initiate conversation based on behavior
  useEffect(() => {
    if (!currentUser || !userContext || hasShownProactiveMessage) return;

    // Trigger proactive message after user dwells on complex page
    const complexPages = ['/Expenses', '/CRM', '/Inventory', '/Procurement'];
    const isComplexPage = complexPages.some(page => currentPageName?.includes(page.slice(1)));

    if (isComplexPage && userBehavior.timeOnPage > 15 && userBehavior.idleTime > 5) {
      initiateProactiveConversation();
      setHasShownProactiveMessage(true);
    }

    // Trigger if user has urgent items
    if (userContext.overdueTasks > 0 || userContext.pendingExpenses > 3) {
      if (userBehavior.timeOnPage > 10 && !hasShownProactiveMessage) {
        initiateProactiveConversation('urgent');
        setHasShownProactiveMessage(true);
      }
    }
  }, [userBehavior, userContext, currentUser, currentPageName, hasShownProactiveMessage]);

  const initiateProactiveConversation = (type = 'help') => {
    const lang = currentLanguage;
    let proactiveMessage = '';

    if (type === 'urgent') {
      const urgentItems = [];
      
      if (userContext.overdueTasks > 0) {
        urgentItems.push(lang === 'en' 
          ? `⚠️ You have ${userContext.overdueTasks} overdue task${userContext.overdueTasks > 1 ? 's' : ''}`
          : `⚠️ আপনার ${userContext.overdueTasks}টি মেয়াদোত্তীর্ণ কাজ রয়েছে`
        );
      }

      if (userContext.pendingExpenses > 3) {
        urgentItems.push(lang === 'en'
          ? `💰 ${userContext.pendingExpenses} expenses awaiting approval`
          : `💰 ${userContext.pendingExpenses}টি খরচ অনুমোদনের অপেক্ষায়`
        );
      }

      proactiveMessage = lang === 'en'
        ? `Hi ${currentUser.full_name.split(' ')[0]}! 👋\n\nI noticed you have some urgent items:\n\n${urgentItems.join('\n')}\n\nWould you like help managing these?`
        : `হাই ${currentUser.full_name.split(' ')[0]}! 👋\n\nআমি লক্ষ্য করেছি আপনার কিছু জরুরি আইটেম আছে:\n\n${urgentItems.join('\n')}\n\nএগুলো পরিচালনায় সাহায্য চান?`;

    } else {
      const pageHelp = CONTEXT_HELP_INTEGRATION[`/${currentPageName}`]?.[lang] || '';
      
      proactiveMessage = lang === 'en'
        ? `Hi ${currentUser.full_name.split(' ')[0]}! 👋\n\nI'm your AI assistant. I noticed you're on the ${currentPageName} page. ${pageHelp}\n\nHow can I help you today?`
        : `হাই ${currentUser.full_name.split(' ')[0]}! 👋\n\nআমি আপনার AI সহায়ক। আমি লক্ষ্য করেছি আপনি ${currentPageName} পৃষ্ঠায় আছেন। ${pageHelp}\n\nআজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?`;
    }

    // Add proactive message
    setMessages([{
      role: 'assistant',
      content: proactiveMessage,
      timestamp: new Date().toISOString(),
      isProactive: true
    }]);

    // Auto-open chatbot with animation
    setIsOpen(true);
    toast.info('💬 AI Assistant has a message for you!', { duration: 3000 });
  };

  // 🔥 ENHANCED: Send message with context awareness
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build enhanced context for AI
      const enhancedContext = `
User Information:
- Name: ${currentUser.full_name}
- Role: ${currentUser.job_role}
- Department: ${currentUser.department || 'N/A'}
- Current Page: ${currentPageName}

User's Current Situation:
${userContext ? `
- Active Tasks: ${userContext.tasks}
- Overdue Tasks: ${userContext.overdueTasks}
- Pending Expenses: ${userContext.pendingExpenses}
- Active Leads: ${userContext.activeLeads}
- Today's Attendance: ${userContext.todayAttendance ? 'Checked in' : 'Not checked in yet'}
${userContext.upcomingTasks.length > 0 ? `\nUpcoming Deadlines:\n${userContext.upcomingTasks.map(t => `- ${t.title}: ${new Date(t.deadline).toLocaleDateString()}`).join('\n')}` : ''}
` : 'Context data not available'}

Page Context:
${CONTEXT_HELP_INTEGRATION[`/${currentPageName}`]?.[currentLanguage] || 'General ERP assistance'}

Language: ${currentLanguage === 'en' ? 'English' : 'Bengali'}

User Question: ${inputMessage}

Instructions:
- Be helpful, friendly, and concise
- Reference the user's specific data when relevant
- Provide actionable advice based on their role
- Respond in ${currentLanguage === 'en' ? 'English' : 'Bengali'}
- Use emojis appropriately for engagement
- If they ask about specific data, summarize what you know
- Offer to help with next steps or related tasks
`;

      const response = await base44.functions.invoke('askChatbot', {
        message: enhancedContext
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response || 'I apologize, but I encountered an issue. Please try again.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chatbot error:', error);
      
      const errorMessage = {
        role: 'assistant',
        content: currentLanguage === 'en'
          ? '😔 I\'m having trouble connecting right now. Please try again in a moment.'
          : '😔 আমি এখন সংযোগ করতে সমস্যা হচ্ছে। অনুগ্রহ করে একটু পরে আবার চেষ্টা করুন।',
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔥 Quick Action Buttons
  const quickActions = [
    {
      label: currentLanguage === 'en' ? 'Show my tasks' : 'আমার কাজ দেখান',
      icon: CheckCircle,
      action: () => {
        const summary = userContext 
          ? `You have ${userContext.tasks} active task${userContext.tasks !== 1 ? 's' : ''}${userContext.overdueTasks > 0 ? `, including ${userContext.overdueTasks} overdue` : ''}. ${userContext.upcomingTasks.length > 0 ? `\n\nUpcoming:\n${userContext.upcomingTasks.map(t => `• ${t.title} - ${new Date(t.deadline).toLocaleDateString()}`).join('\n')}` : ''}`
          : 'No task data available yet.';
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: summary,
          timestamp: new Date().toISOString()
        }]);
      }
    },
    {
      label: currentLanguage === 'en' ? 'Pending approvals' : 'অপেক্ষমাণ অনুমোদন',
      icon: Clock,
      action: () => {
        const summary = userContext 
          ? `You have ${userContext.pendingExpenses} expense${userContext.pendingExpenses !== 1 ? 's' : ''} awaiting approval. ${userContext.pendingExpenses > 0 ? 'Would you like to review them now?' : ''}`
          : 'No pending expenses.';
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: summary,
          timestamp: new Date().toISOString()
        }]);
      }
    },
    {
      label: currentLanguage === 'en' ? 'How do I...?' : 'আমি কীভাবে...?',
      icon: Lightbulb,
      action: () => {
        const tip = CONTEXT_HELP_INTEGRATION[`/${currentPageName}`]?.[currentLanguage];
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: tip || (currentLanguage === 'en' 
            ? 'Ask me anything about using this ERP system! I\'m here to help.'
            : 'এই ERP সিস্টেম ব্যবহার সম্পর্কে আমাকে যেকোনো কিছু জিজ্ঞাসা করুন! আমি সাহায্যের জন্য এখানে আছি।'),
          timestamp: new Date().toISOString()
        }]);
      }
    }
  ];

  if (!currentUser) return null;

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => {
            setIsOpen(true);
            if (messages.length === 0) {
              fetchUserContext();
            }
          }}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-2xl rounded-full w-16 h-16 p-0 transform transition-all duration-300 hover:scale-110"
        >
          <MessageCircle className="w-7 h-7" />
          {userContext && (userContext.overdueTasks > 0 || userContext.pendingExpenses > 3) && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
              {userContext.overdueTasks + userContext.pendingExpenses}
            </div>
          )}
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className={`fixed right-6 z-50 shadow-2xl border-2 border-violet-200 transition-all duration-300 ${
          isMinimized 
            ? 'bottom-6 w-80 h-16' 
            : 'bottom-6 w-[420px] max-w-[95vw] h-[600px] max-h-[85vh]'
        }`}>
          {/* Header */}
          <CardHeader className="flex flex-row items-center justify-between p-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">AI Assistant</CardTitle>
                {!isMinimized && (
                  <p className="text-xs text-white/80 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {currentLanguage === 'en' ? 'Always here to help' : 'সাহায্যের জন্য সর্বদা এখানে'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <MinusCircle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          {!isMinimized && (
            <CardContent className="p-0 flex flex-col h-[calc(100%-80px)]">
              {/* Context Summary Banner */}
              {userContext && (
                <div className="p-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <CheckCircle className={`w-3 h-3 ${userContext.tasks > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className="font-medium">{userContext.tasks} tasks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className={`w-3 h-3 ${userContext.pendingExpenses > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
                      <span className="font-medium">{userContext.pendingExpenses} pending</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className={`w-3 h-3 ${userContext.overdueTasks > 0 ? 'text-red-600' : 'text-green-600'}`} />
                      <span className="font-medium">
                        {userContext.overdueTasks === 0 ? 'All good!' : `${userContext.overdueTasks} overdue`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <Bot className="w-12 h-12 mx-auto mb-3 text-violet-600" />
                      <p className="text-sm text-muted-foreground">
                        {currentLanguage === 'en'
                          ? 'Hi! I\'m your AI assistant. How can I help you today?'
                          : 'হাই! আমি আপনার AI সহায়ক। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?'}
                      </p>
                      
                      {/* Quick Actions */}
                      <div className="mt-6 space-y-2">
                        <p className="text-xs font-semibold text-gray-600 mb-3">Quick Actions:</p>
                        {quickActions.map((action, index) => (
                          <Button
                            key={index}
                            onClick={action.action}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-left"
                          >
                            <action.icon className="w-4 h-4 mr-2" />
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            msg.role === 'user'
                              ? 'bg-violet-600 text-white'
                              : msg.isError
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {msg.isProactive && (
                            <Badge className="mb-2 bg-yellow-100 text-yellow-800 text-xs">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Proactive Assistant
                            </Badge>
                          )}
                          <ReactMarkdown className="text-sm prose prose-sm max-w-none">
                            {msg.content}
                          </ReactMarkdown>
                          <p className="text-xs opacity-70 mt-2">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-gray-100 rounded-2xl px-4 py-3">
                        <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t bg-white">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={currentLanguage === 'en' ? 'Type your message...' : 'আপনার বার্তা টাইপ করুন...'}
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="bg-violet-600 hover:bg-violet-700"
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
          )}
        </Card>
      )}
    </>
  );
}