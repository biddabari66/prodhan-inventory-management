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
  Lightbulb,
  RefreshCw
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

/**
 * 🤖 ENHANCED PROACTIVE AI CHATBOT
 * - Context-aware with detailed page understanding
 * - User-specific data integration
 * - Improved error handling
 * - Retry mechanism
 */

const DETAILED_CONTEXT_HELP = {
  '/Attendance': {
    en: {
      description: 'Attendance tracking system with GPS verification',
      features: ['Check-in/Check-out with location', 'View attendance history', 'Manual entries (admin only)', 'Shift management'],
      commonQuestions: [
        'How do I check in for today?',
        'Why is my location not working?',
        'How do I view my attendance history?',
        'What if I forgot to check out?'
      ],
      tips: 'Enable location services for accurate check-in. Check-in requires you to be within office radius.'
    },
    bn: {
      description: 'GPS যাচাইকরণ সহ উপস্থিতি ট্র্যাকিং সিস্টেম',
      features: ['অবস্থান সহ চেক-ইন/চেক-আউট', 'উপস্থিতি ইতিহাস দেখুন', 'ম্যানুয়াল এন্ট্রি (শুধুমাত্র অ্যাডমিন)', 'শিফট ব্যবস্থাপনা'],
      commonQuestions: [
        'আজকের জন্য আমি কীভাবে চেক ইন করব?',
        'আমার অবস্থান কেন কাজ করছে না?',
        'আমি কীভাবে আমার উপস্থিতি ইতিহাস দেখব?',
        'যদি আমি চেক আউট করতে ভুলে যাই?'
      ],
      tips: 'সঠিক চেক-ইনের জন্য অবস্থান পরিষেবা সক্ষম করুন। চেক-ইনের জন্য আপনাকে অফিস এলাকার মধ্যে থাকতে হবে।'
    }
  },
  '/Dashboard': {
    en: {
      description: 'Business overview with KPIs, revenue, expenses, and analytics',
      features: ['Real-time metrics', 'Revenue & expense charts', 'Performance indicators', 'Quick actions'],
      commonQuestions: [
        'What do the KPI cards mean?',
        'How do I interpret the charts?',
        'What is ROAS and ROI?',
        'How often does data update?'
      ],
      tips: 'Click any card to see detailed information. Use period toggles for different time ranges.'
    },
    bn: {
      description: 'KPI, আয়, খরচ এবং বিশ্লেষণ সহ ব্যবসায়িক সংক্ষিপ্ত বিবরণ',
      features: ['রিয়েল-টাইম মেট্রিক্স', 'আয় এবং খরচ চার্ট', 'পারফরম্যান্স সূচক', 'দ্রুত ক্রিয়া'],
      commonQuestions: [
        'KPI কার্ডগুলির অর্থ কী?',
        'আমি কীভাবে চার্টগুলি ব্যাখ্যা করব?',
        'ROAS এবং ROI কী?',
        'ডেটা কত ঘন ঘন আপডেট হয়?'
      ],
      tips: 'বিস্তারিত তথ্যের জন্য যেকোনো কার্ডে ক্লিক করুন। বিভিন্ন সময়সীমার জন্য পিরিয়ড টগল ব্যবহার করুন।'
    }
  },
  '/CRM': {
    en: {
      description: 'Lead management system with pipeline visualization',
      features: ['Drag-drop pipeline', 'Lead assignment', 'Follow-up tracking', 'Conversion analytics'],
      commonQuestions: [
        'How do I add a new lead?',
        'How do I move leads between stages?',
        'What is lead scoring?',
        'How do I assign leads to team members?'
      ],
      tips: 'Drag leads between columns to change their status. Use filters to find specific leads quickly.'
    },
    bn: {
      description: 'পাইপলাইন ভিজ্যুয়ালাইজেশন সহ লিড ব্যবস্থাপনা সিস্টেম',
      features: ['ড্র্যাগ-ড্রপ পাইপলাইন', 'লিড অ্যাসাইনমেন্ট', 'ফলো-আপ ট্র্যাকিং', 'রূপান্তর বিশ্লেষণ'],
      commonQuestions: [
        'আমি কীভাবে একটি নতুন লিড যোগ করব?',
        'আমি কীভাবে পর্যায়গুলির মধ্যে লিড সরাব?',
        'লিড স্কোরিং কী?',
        'আমি কীভাবে টিম সদস্যদের লিড অ্যাসাইন করব?'
      ],
      tips: 'স্ট্যাটাস পরিবর্তন করতে কলামের মধ্যে লিড টেনে আনুন। নির্দিষ্ট লিড দ্রুত খুঁজতে ফিল্টার ব্যবহার করুন।'
    }
  },
  '/Expenses': {
    en: {
      description: 'Expense submission and approval workflow system',
      features: ['Submit with receipts', 'Multi-level approvals', 'Advance expenses', 'Expense tracking'],
      commonQuestions: [
        'How do I submit an expense?',
        'What happens after I submit?',
        'How do I handle advance expenses?',
        'Who approves my expenses?'
      ],
      tips: 'Always attach receipts for faster approval. Green=Approved, Yellow=Pending, Red=Needs revision.'
    },
    bn: {
      description: 'খরচ জমা এবং অনুমোদন ওয়ার্কফ্লো সিস্টেম',
      features: ['রসিদ সহ জমা', 'মাল্টি-লেভেল অনুমোদন', 'অগ্রিম খরচ', 'খরচ ট্র্যাকিং'],
      commonQuestions: [
        'আমি কীভাবে একটি খরচ জমা দেব?',
        'জমা দেওয়ার পরে কী হয়?',
        'আমি কীভাবে অগ্রিম খরচ পরিচালনা করব?',
        'কে আমার খরচ অনুমোদন করে?'
      ],
      tips: 'দ্রুত অনুমোদনের জন্য সর্বদা রসিদ সংযুক্ত করুন। সবুজ=অনুমোদিত, হলুদ=অপেক্ষমাণ, লাল=সংশোধন প্রয়োজন।'
    }
  },
  '/Inventory': {
    en: {
      description: 'Stock management with AI-powered insights and forecasting',
      features: ['Stock tracking', 'Low stock alerts', 'Supplier management', 'AI predictions'],
      commonQuestions: [
        'How do I add new inventory?',
        'What does low stock mean?',
        'How do I reorder items?',
        'What are the AI insights?'
      ],
      tips: 'Red badge=Low stock, reorder soon! Use department filters to see specific categories.'
    },
    bn: {
      description: 'AI-চালিত অন্তর্দৃষ্টি এবং পূর্বাভাস সহ স্টক ব্যবস্থাপনা',
      features: ['স্টক ট্র্যাকিং', 'কম স্টক সতর্কতা', 'সরবরাহকারী ব্যবস্থাপনা', 'AI পূর্বাভাস'],
      commonQuestions: [
        'আমি কীভাবে নতুন ইনভেন্টরি যোগ করব?',
        'কম স্টক মানে কী?',
        'আমি কীভাবে আইটেম পুনর্মুদ্রণ করব?',
        'AI অন্তর্দৃষ্টি কী?'
      ],
      tips: 'লাল ব্যাজ=কম স্টক, শীঘ্রই পুনর্মুদ্রণ করুন! নির্দিষ্ট বিভাগ দেখতে ডিপার্টমেন্ট ফিল্টার ব্যবহার করুন।'
    }
  },
  '/Procurement': {
    en: {
      description: 'Order management and fulfillment system',
      features: ['Create orders', 'Track shipments', 'Customer management', 'Payment tracking'],
      commonQuestions: [
        'How do I create a new order?',
        'How do I track orders?',
        'What is COD?',
        'How do I change order status?'
      ],
      tips: 'COD=Cash on Delivery. Track order status: Pending→Confirmed→Shipped→Delivered.'
    },
    bn: {
      description: 'অর্ডার ব্যবস্থাপনা এবং পূরণ সিস্টেম',
      features: ['অর্ডার তৈরি', 'শিপমেন্ট ট্র্যাক', 'গ্রাহক ব্যবস্থাপনা', 'পেমেন্ট ট্র্যাকিং'],
      commonQuestions: [
        'আমি কীভাবে একটি নতুন অর্ডার তৈরি করব?',
        'আমি কীভাবে অর্ডার ট্র্যাক করব?',
        'COD কী?',
        'আমি কীভাবে অর্ডার স্ট্যাটাস পরিবর্তন করব?'
      ],
      tips: 'COD=ক্যাশ অন ডেলিভারি। অর্ডার স্ট্যাটাস ট্র্যাক করুন: অপেক্ষমাণ→নিশ্চিত→পাঠানো→বিতরণ।'
    }
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
  const [retryCount, setRetryCount] = useState(0);
  const [userBehavior, setUserBehavior] = useState({
    timeOnPage: 0,
    idleTime: 0,
    lastActivity: Date.now()
  });

  const messagesEndRef = useRef(null);
  const idleTimerRef = useRef(null);
  const pageTimerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Track user behavior
  useEffect(() => {
    if (!currentUser) return;

    pageTimerRef.current = setInterval(() => {
      setUserBehavior(prev => ({
        ...prev,
        timeOnPage: prev.timeOnPage + 1
      }));
    }, 1000);

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

  // Fetch user context
  const fetchUserContext = useCallback(async () => {
    if (!currentUser) return;

    try {
      console.log('📊 Fetching user context data...');

      const [tasks, expenses, attendance, leads] = await Promise.all([
        base44.entities.Task.filter({ 
          assigned_to: { $contains: currentUser.id },
          status: { $in: ['pending', 'in_progress'] }
        }).catch(() => []),
        
        base44.entities.Expense.filter({ 
          $or: [
            { submitted_by: currentUser.id, status: { $in: ['pending_manager_approval', 'pending_finance_approval'] } },
            { status: 'pending_manager_approval' }
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

      const upcomingTasks = tasks
        .filter(t => t.deadline && new Date(t.deadline) > new Date())
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 3);

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

  // Proactive conversation
  useEffect(() => {
    if (!currentUser || !userContext || hasShownProactiveMessage) return;

    const complexPages = ['/Expenses', '/CRM', '/Inventory', '/Procurement'];
    const isComplexPage = complexPages.some(page => currentPageName?.includes(page.slice(1)));

    if (isComplexPage && userBehavior.timeOnPage > 15 && userBehavior.idleTime > 5) {
      initiateProactiveConversation();
      setHasShownProactiveMessage(true);
    }

    if (userContext.overdueTasks > 0 || userContext.pendingExpenses > 3) {
      if (userBehavior.timeOnPage > 10 && !hasShownProactiveMessage) {
        initiateProactiveConversation('urgent');
        setHasShownProactiveMessage(true);
      }
    }
  }, [userBehavior, userContext, currentUser, currentPageName, hasShownProactiveMessage]);

  const initiateProactiveConversation = (type = 'help') => {
    const lang = currentLanguage;
    const pageContext = DETAILED_CONTEXT_HELP[`/${currentPageName}`]?.[lang];
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

    } else if (pageContext) {
      proactiveMessage = lang === 'en'
        ? `Hi ${currentUser.full_name.split(' ')[0]}! 👋\n\nI'm here to help with ${pageContext.description}.\n\n📋 Available features:\n${pageContext.features.map(f => `• ${f}`).join('\n')}\n\n💡 Tip: ${pageContext.tips}\n\nWhat would you like to know?`
        : `হাই ${currentUser.full_name.split(' ')[0]}! 👋\n\nআমি ${pageContext.description} নিয়ে সাহায্য করতে এখানে আছি।\n\n📋 উপলব্ধ বৈশিষ্ট্য:\n${pageContext.features.map(f => `• ${f}`).join('\n')}\n\n💡 টিপ: ${pageContext.tips}\n\nআপনি কী জানতে চান?`;
    }

    setMessages([{
      role: 'assistant',
      content: proactiveMessage,
      timestamp: new Date().toISOString(),
      isProactive: true
    }]);

    setIsOpen(true);
    toast.info('💬 AI Assistant has a message for you!', { duration: 3000 });
  };

  // Enhanced send message with retry
  const handleSendMessage = async (retryAttempt = 0) => {
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
      const pageContext = DETAILED_CONTEXT_HELP[`/${currentPageName}`]?.[currentLanguage];
      
      // Build comprehensive context
      const enhancedContext = `You are a helpful ERP assistant for Biddabari Group.

User Profile:
- Name: ${currentUser.full_name}
- Role: ${currentUser.job_role}
- Department: ${currentUser.department || 'N/A'}

Current Page: ${currentPageName}
${pageContext ? `
Page Description: ${pageContext.description}

Available Features:
${pageContext.features.map(f => `- ${f}`).join('\n')}

Common Questions Users Ask:
${pageContext.commonQuestions.map(q => `- ${q}`).join('\n')}

Pro Tip: ${pageContext.tips}
` : ''}

User's Current Status:
${userContext ? `
- Active Tasks: ${userContext.tasks} (${userContext.overdueTasks} overdue)
- Pending Expense Approvals: ${userContext.pendingExpenses}
- Today's Attendance: ${userContext.todayAttendance ? 'Checked in at ' + userContext.todayAttendance.check_in_time : 'Not checked in yet'}
- Active Leads: ${userContext.activeLeads}
${userContext.upcomingTasks.length > 0 ? `\nUpcoming Deadlines:\n${userContext.upcomingTasks.map(t => `- ${t.title}: ${new Date(t.deadline).toLocaleDateString()}`).join('\n')}` : ''}
` : 'Fetching user context...'}

Language: Respond in ${currentLanguage === 'en' ? 'English' : 'Bengali'}

User Question: ${inputMessage}

Instructions:
- Be helpful, friendly, and professional
- Give specific, actionable advice
- Reference the user's actual data when relevant
- If they ask about features, explain based on the page context
- Keep responses concise but informative (2-3 paragraphs max)
- Use emojis sparingly for emphasis
- If you don't know something, be honest and suggest who to contact
`;

      console.log('🤖 Sending to AI with enhanced context...');

      const response = await base44.functions.invoke('askChatbot', {
        message: enhancedContext
      });

      console.log('✅ AI Response received:', response.data);

      if (response.data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, assistantMessage]);
        setRetryCount(0); // Reset retry count on success

      } else {
        throw new Error(response.data.error || 'AI service error');
      }

    } catch (error) {
      console.error('❌ Chatbot error:', error);
      
      // Retry logic (max 2 retries)
      if (retryAttempt < 2) {
        console.log(`🔄 Retrying... Attempt ${retryAttempt + 1}/2`);
        
        const retryMessage = {
          role: 'assistant',
          content: currentLanguage === 'en'
            ? '⏳ Connection issue detected. Retrying...'
            : '⏳ সংযোগ সমস্যা সনাক্ত করা হয়েছে। পুনরায় চেষ্টা করা হচ্ছে...',
          timestamp: new Date().toISOString(),
          isRetry: true
        };
        
        setMessages(prev => [...prev, retryMessage]);
        
        // Remove retry message and try again after 2 seconds
        setTimeout(() => {
          setMessages(prev => prev.filter(m => !m.isRetry));
          handleSendMessage(retryAttempt + 1);
        }, 2000);
        
        return;
      }
      
      // Final error after retries
      const errorMessage = {
        role: 'assistant',
        content: currentLanguage === 'en'
          ? `😔 I apologize, but I'm having trouble connecting to my AI brain right now.\n\n**What you can do:**\n• Try asking again in a moment\n• Click the refresh button below\n• Contact your IT support if the issue persists\n\nI'm here to help once the connection is restored! 🙏`
          : `😔 আমি দুঃখিত, কিন্তু আমি এখন আমার AI মস্তিষ্কের সাথে সংযোগ করতে সমস্যা হচ্ছে।\n\n**আপনি কী করতে পারেন:**\n• একটু পরে আবার জিজ্ঞাসা করুন\n• নিচের রিফ্রেশ বাটনে ক্লিক করুন\n• সমস্যা অব্যাহত থাকলে আপনার IT সাপোর্টের সাথে যোগাযোগ করুন\n\nসংযোগ পুনরুদ্ধার হলে আমি সাহায্যের জন্য এখানে আছি! 🙏`,
        timestamp: new Date().toISOString(),
        isError: true,
        canRetry: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    // Remove error message and retry
    setMessages(prev => prev.filter(m => !m.isError));
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      setInputMessage(lastUserMessage.content);
      setTimeout(() => handleSendMessage(), 500);
    }
  };

  // Quick actions
  const quickActions = [
    {
      label: currentLanguage === 'en' ? 'Show my tasks' : 'আমার কাজ দেখান',
      icon: CheckCircle,
      action: () => {
        const summary = userContext 
          ? `📋 **Your Tasks Summary:**\n\n• Active: ${userContext.tasks}\n• Overdue: ${userContext.overdueTasks}\n${userContext.upcomingTasks.length > 0 ? `\n**Upcoming Deadlines:**\n${userContext.upcomingTasks.map(t => `• ${t.title} - ${new Date(t.deadline).toLocaleDateString()}`).join('\n')}` : '\n✅ No upcoming deadlines!'}`
          : 'Loading task data...';
        
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
          ? `💰 **Pending Approvals:**\n\n${userContext.pendingExpenses > 0 ? `You have ${userContext.pendingExpenses} expense${userContext.pendingExpenses !== 1 ? 's' : ''} awaiting approval.\n\n💡 **Tip:** Review them in the Expenses page for faster processing.` : '✅ No pending expenses! You\'re all caught up.'}`
          : 'Loading approval data...';
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: summary,
          timestamp: new Date().toISOString()
        }]);
      }
    },
    {
      label: currentLanguage === 'en' ? 'Page help' : 'পৃষ্ঠা সাহায্য',
      icon: Lightbulb,
      action: () => {
        const pageContext = DETAILED_CONTEXT_HELP[`/${currentPageName}`]?.[currentLanguage];
        const help = pageContext 
          ? `📖 **${currentPageName} Help**\n\n${pageContext.description}\n\n**Features:**\n${pageContext.features.map(f => `• ${f}`).join('\n')}\n\n💡 **Tip:** ${pageContext.tips}\n\n**Common Questions:**\n${pageContext.commonQuestions.map(q => `• ${q}`).join('\n')}`
          : 'Ask me anything about using this system!';
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: help,
          timestamp: new Date().toISOString()
        }]);
      }
    }
  ];

  if (!currentUser) return null;

  return (
    <>
      {/* Floating button */}
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

      {/* Chat window */}
      {isOpen && (
        <Card className={`fixed right-6 z-50 shadow-2xl border-2 border-violet-200 transition-all duration-300 ${
          isMinimized 
            ? 'bottom-6 w-80 h-16' 
            : 'bottom-6 w-[420px] max-w-[95vw] h-[600px] max-h-[85vh]'
        }`}>
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
                    {currentLanguage === 'en' ? 'Context-aware help' : 'প্রসঙ্গ-সচেতন সাহায্য'}
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
              {/* Context banner */}
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
                      <p className="text-sm text-muted-foreground mb-6">
                        {currentLanguage === 'en'
                          ? 'Hi! I\'m your AI assistant. How can I help you today?'
                          : 'হাই! আমি আপনার AI সহায়ক। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?'}
                      </p>
                      
                      <div className="space-y-2">
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
                              : msg.isRetry
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {msg.isProactive && (
                            <Badge className="mb-2 bg-yellow-100 text-yellow-800 text-xs">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Proactive
                            </Badge>
                          )}
                          <ReactMarkdown className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                            {msg.content}
                          </ReactMarkdown>
                          {msg.canRetry && (
                            <Button
                              onClick={handleRetry}
                              size="sm"
                              variant="outline"
                              className="mt-3 w-full"
                            >
                              <RefreshCw className="w-3 h-3 mr-2" />
                              {currentLanguage === 'en' ? 'Retry' : 'পুনরায় চেষ্টা করুন'}
                            </Button>
                          )}
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
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder={currentLanguage === 'en' ? 'Type your message...' : 'আপনার বার্তা টাইপ করুন...'}
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={() => handleSendMessage()}
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