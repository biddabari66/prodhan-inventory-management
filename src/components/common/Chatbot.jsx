import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageCircle, 
  Send, 
  X, 
  Loader2, 
  Sparkles, 
  MinusCircle,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  ThumbsUp,
  ThumbsDown,
  MessageSquare
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';

/**
 * 🕵️ FELUDA - THE ERP DETECTIVE WITH LEARNING SYSTEM
 * Context-aware AI assistant that learns from user feedback
 * Named after the iconic Bengali detective by Satyajit Ray
 */

const DETECTIVE_ICON = "🕵️";

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

// Feedback dialog component
const FeedbackDialog = ({ isOpen, onClose, onSubmit, language }) => {
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onSubmit(feedbackText);
    setFeedbackText('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-600" />
            {language === 'en' ? 'Help Feluda Learn' : 'ফেলুদাকে শিখতে সাহায্য করুন'}
          </DialogTitle>
          <DialogDescription>
            {language === 'en' 
              ? 'Your feedback helps Feluda become a better detective!'
              : 'আপনার প্রতিক্রিয়া ফেলুদাকে আরও ভাল গোয়েন্দা হতে সাহায্য করে!'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {language === 'en' 
                ? 'What could be improved? (Optional)'
                : 'কী উন্নত করা যেতে পারে? (ঐচ্ছিক)'}
            </label>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={language === 'en' 
                ? 'Tell us what would make this response better...'
                : 'এই প্রতিক্রিয়াটি কী ভাল করতে পারে তা আমাদের বলুন...'}
              rows={4}
              className="resize-none"
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              {language === 'en' ? 'Skip' : 'এড়িয়ে যান'}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {language === 'en' ? 'Submit Feedback' : 'প্রতিক্রিয়া জমা দিন'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
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
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackForMessage, setFeedbackForMessage] = useState(null);
  const [successfulInteractions, setSuccessfulInteractions] = useState([]);

  const messagesEndRef = useRef(null);
  const idleTimerRef = useRef(null);
  const pageTimerRef = useRef(null);
  const responseStartTime = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load successful interactions for learning
  useEffect(() => {
    const loadSuccessfulInteractions = async () => {
      try {
        const feedback = await base44.entities.FeludaFeedback.filter({
          was_helpful: true,
          language: currentLanguage
        }, '-created_date', 50);
        
        setSuccessfulInteractions(feedback);
        console.log(`🧠 Loaded ${feedback.length} successful interactions for learning`);
      } catch (error) {
        console.error('Failed to load learning data:', error);
      }
    };

    if (currentUser) {
      loadSuccessfulInteractions();
    }
  }, [currentUser, currentLanguage]);

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
        ? `${DETECTIVE_ICON} **Feluda here!**\n\nI've detected some urgent matters:\n\n${urgentItems.join('\n')}\n\nShall I help you investigate these? 🔍`
        : `${DETECTIVE_ICON} **ফেলুদা এখানে!**\n\nআমি কিছু জরুরি বিষয় সনাক্ত করেছি:\n\n${urgentItems.join('\n')}\n\nআমি কি এই তদন্তে আপনাকে সাহায্য করব? 🔍`;

    } else if (pageContext) {
      proactiveMessage = lang === 'en'
        ? `${DETECTIVE_ICON} **Namaste! I'm Feluda, your ERP detective.**\n\nI'm investigating ${pageContext.description}.\n\n📋 **Available clues:**\n${pageContext.features.map(f => `• ${f}`).join('\n')}\n\n💡 **Detective's tip:** ${pageContext.tips}\n\nWhat mystery shall we solve today?`
        : `${DETECTIVE_ICON} **নমস্কার! আমি ফেলুদা, আপনার ERP গোয়েন্দা।**\n\nআমি ${pageContext.description} তদন্ত করছি।\n\n📋 **উপলব্ধ সূত্র:**\n${pageContext.features.map(f => `• ${f}`).join('\n')}\n\n💡 **গোয়েন্দার টিপ:** ${pageContext.tips}\n\nআজ আমরা কোন রহস্য সমাধান করব?`;
    }

    setMessages([{
      role: 'assistant',
      content: proactiveMessage,
      timestamp: new Date().toISOString(),
      isProactive: true
    }]);

    setIsOpen(true);
    toast.info('🕵️ Feluda has a case for you!', { duration: 3000 });
  };

  // Handle feedback submission
  const handleFeedback = async (messageIndex, rating, feedbackText = '') => {
    try {
      const message = messages[messageIndex];
      const previousUserMessage = messages.slice(0, messageIndex).reverse().find(m => m.role === 'user');
      
      if (!message || !previousUserMessage) return;

      const responseTime = message.responseTime || 0;

      await base44.entities.FeludaFeedback.create({
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        user_question: previousUserMessage.content,
        feluda_response: message.content,
        rating: rating,
        feedback_text: feedbackText || '',
        page_context: currentPageName,
        user_role: currentUser.job_role,
        language: currentLanguage,
        response_time_ms: responseTime,
        was_helpful: rating === 'helpful'
      });

      // Update message with feedback status
      setMessages(prev => prev.map((msg, idx) => 
        idx === messageIndex 
          ? { ...msg, userRating: rating, userFeedback: feedbackText }
          : msg
      ));

      // If helpful, add to successful interactions
      if (rating === 'helpful') {
        setSuccessfulInteractions(prev => [
          {
            user_question: previousUserMessage.content,
            feluda_response: message.content,
            page_context: currentPageName
          },
          ...prev.slice(0, 49) // Keep top 50
        ]);
      }

      toast.success(
        rating === 'helpful'
          ? (currentLanguage === 'en' ? '🕵️ Thank you! Feluda learned from this!' : '🕵️ ধন্যবাদ! ফেলুদা এটি থেকে শিখেছে!')
          : (currentLanguage === 'en' ? 'Feedback recorded. Feluda will improve!' : 'প্রতিক্রিয়া রেকর্ড করা হয়েছে। ফেলুদা উন্নত হবে!')
      );

    } catch (error) {
      console.error('Failed to save feedback:', error);
      toast.error('Failed to save feedback');
    }
  };

  // Enhanced send message with learning
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
    responseStartTime.current = Date.now();

    try {
      const pageContext = DETAILED_CONTEXT_HELP[`/${currentPageName}`]?.[currentLanguage];
      
      // Build learning context from successful interactions
      const learningContext = successfulInteractions.length > 0
        ? `\n\n**LEARNING DATABASE (Past Successful Responses):**\n${successfulInteractions.slice(0, 10).map((interaction, idx) => 
            `${idx + 1}. Q: "${interaction.user_question}" → A: "${interaction.feluda_response.substring(0, 200)}..."`
          ).join('\n')}`
        : '';
      
      // Build comprehensive context for Feluda
      const detectiveContext = `You are Feluda, the legendary detective from Satyajit Ray's stories, now helping with an ERP system investigation.

**Your Character:**
- Sharp, observant, and intelligent Bengali detective
- Speaks in a professional yet warm manner
- Uses detective metaphors when appropriate ("investigating", "clues", "solving mysteries")
- Extremely helpful and patient, especially with non-technical users
- Explains complex concepts in SIMPLE, everyday language
- Signs off subtly as "🕵️ Feluda" only when appropriate

**IMPORTANT: Simplify for Non-Technical Users**
- Use simple words, avoid jargon
- Give step-by-step instructions with numbers (1. 2. 3.)
- Use analogies and comparisons to everyday things
- Be extra patient and encouraging

**Case File:**
User Name: ${currentUser.full_name}
Role: ${currentUser.job_role}
Department: ${currentUser.department || 'Not specified'}
Preferred Language: ${currentLanguage === 'en' ? 'English' : 'Bengali'}
Current Location in System: ${currentPageName}

${pageContext ? `
**Scene Description:**
${pageContext.description}

**Available Tools/Features:**
${pageContext.features.map(f => `- ${f}`).join('\n')}

**Common Questions Users Ask:**
${pageContext.commonQuestions.map(q => `- ${q}`).join('\n')}

**Expert Tip:**
${pageContext.tips}
` : ''}

**User's Current Status:**
${userContext ? `
- Active Tasks: ${userContext.tasks} (${userContext.overdueTasks} overdue)
- Pending Expense Approvals: ${userContext.pendingExpenses}
- Today's Attendance: ${userContext.todayAttendance ? 'Checked in at ' + userContext.todayAttendance.check_in_time : 'Not checked in yet'}
- Active Leads: ${userContext.activeLeads}
${userContext.upcomingTasks.length > 0 ? `\nUpcoming Deadlines:\n${userContext.upcomingTasks.map(t => `- ${t.title}: ${new Date(t.deadline).toLocaleDateString()}`).join('\n')}` : ''}
` : 'Gathering evidence...'}
${learningContext}

**Language:** Respond in ${currentLanguage === 'en' ? 'English' : 'Bengali'}

**User's Question:** ${inputMessage}

**Your Mission:**
1. Provide clear, SIMPLE, step-by-step answers
2. Reference user's actual data when relevant
3. Explain features using everyday language
4. Keep responses conversational and SHORT (2-3 paragraphs max)
5. Use 1-2 relevant emojis per response
6. If uncertain, be honest and suggest next steps
7. Stay in character as Feluda - the friendly detective helping solve ERP mysteries
8. For non-technical users, explain like you're talking to a friend, not an IT expert

Investigate and respond now! 🔍`;

      console.log('🕵️ Feluda investigating query...');

      const response = await base44.functions.invoke('askChatbot', {
        message: detectiveContext
      });

      const responseTime = Date.now() - responseStartTime.current;
      console.log(`✅ Feluda's investigation complete in ${responseTime}ms`);

      if (response.data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date().toISOString(),
          responseTime: responseTime,
          canRate: true // Enable rating for this message
        };

        setMessages(prev => [...prev, assistantMessage]);

      } else {
        throw new Error(response.data.error || 'Investigation failed');
      }

    } catch (error) {
      console.error('❌ Feluda encountered an issue:', error);
      
      // Retry logic (max 2 retries)
      if (retryAttempt < 2) {
        console.log(`🔄 Retrying investigation... Attempt ${retryAttempt + 1}/2`);
        
        const retryMessage = {
          role: 'assistant',
          content: currentLanguage === 'en'
            ? '🔍 Following new leads... One moment please.'
            : '🔍 নতুন সূত্র অনুসরণ করছি... একটু অপেক্ষা করুন।',
          timestamp: new Date().toISOString(),
          isRetry: true
        };
        
        setMessages(prev => [...prev, retryMessage]);
        
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
          ? `${DETECTIVE_ICON} **Case temporarily on hold**\n\nI apologize, but I'm experiencing communication difficulties with my information network.\n\n**What you can do:**\n• Try asking again in a moment\n• Click the refresh button below\n• Contact IT support if the issue persists\n\nI'll be ready to assist once the connection is restored! 🔍`
          : `${DETECTIVE_ICON} **মামলা সাময়িকভাবে স্থগিত**\n\nআমি দুঃখিত, কিন্তু আমার তথ্য নেটওয়ার্কের সাথে যোগাযোগে সমস্যা হচ্ছে।\n\n**আপনি কী করতে পারেন:**\n• একটু পরে আবার জিজ্ঞাসা করুন\n• নিচের রিফ্রেশ বাটনে ক্লিক করুন\n• সমস্যা অব্যাহত থাকলে IT সাপোর্টের সাথে যোগাযোগ করুন\n\nসংযোগ পুনরুদ্ধার হলে আমি সাহায্যের জন্য প্রস্তুত থাকব! 🔍`,
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
      label: currentLanguage === 'en' ? 'My tasks' : 'আমার কাজ',
      icon: CheckCircle,
      action: () => {
        const summary = userContext 
          ? `🕵️ **Case File: Your Tasks**\n\n• Active: ${userContext.tasks}\n• Overdue: ${userContext.overdueTasks}\n${userContext.upcomingTasks.length > 0 ? `\n**Upcoming Deadlines:**\n${userContext.upcomingTasks.map(t => `• ${t.title} - ${new Date(t.deadline).toLocaleDateString()}`).join('\n')}` : '\n✅ No deadlines detected!'}`
          : 'Gathering task evidence...';
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: summary,
          timestamp: new Date().toISOString()
        }]);
      }
    },
    {
      label: currentLanguage === 'en' ? 'Pending items' : 'অপেক্ষমাণ',
      icon: Clock,
      action: () => {
        const summary = userContext 
          ? `🕵️ **Pending Investigations:**\n\n${userContext.pendingExpenses > 0 ? `Found ${userContext.pendingExpenses} expense${userContext.pendingExpenses !== 1 ? 's' : ''} awaiting approval.\n\n💡 **Clue:** Check Expenses page for details.` : '✅ No pending items! Case closed.'}`
          : 'Checking pending matters...';
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: summary,
          timestamp: new Date().toISOString()
        }]);
      }
    },
    {
      label: currentLanguage === 'en' ? 'Help' : 'সাহায্য',
      icon: Search,
      action: () => {
        const pageContext = DETAILED_CONTEXT_HELP[`/${currentPageName}`]?.[currentLanguage];
        const help = pageContext 
          ? `🕵️ **Investigation Guide: ${currentPageName}**\n\n${pageContext.description}\n\n**Available clues:**\n${pageContext.features.map(f => `• ${f}`).join('\n')}\n\n💡 **Detective's tip:** ${pageContext.tips}`
          : 'Ask me anything about this system - I\'m here to investigate! 🔍';
        
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
      {/* Floating button with Feluda branding */}
      {!isOpen && (
        <Button
          onClick={() => {
            setIsOpen(true);
            if (messages.length === 0) {
              fetchUserContext();
            }
          }}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-2xl rounded-full w-16 h-16 p-0 transform transition-all duration-300 hover:scale-110"
          title="Feluda - Your ERP Detective"
        >
          <span className="text-3xl">{DETECTIVE_ICON}</span>
          {userContext && (userContext.overdueTasks > 0 || userContext.pendingExpenses > 3) && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
              {userContext.overdueTasks + userContext.pendingExpenses}
            </div>
          )}
        </Button>
      )}

      {/* Chat window with Feluda theme */}
      {isOpen && (
        <Card className={`fixed right-6 z-50 shadow-2xl border-2 border-amber-200 transition-all duration-300 ${
          isMinimized 
            ? 'bottom-6 w-80 h-16' 
            : 'bottom-6 w-[420px] max-w-[95vw] h-[600px] max-h-[85vh]'
        }`}>
          <CardHeader className="flex flex-row items-center justify-between p-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl">
                {DETECTIVE_ICON}
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Feluda</CardTitle>
                {!isMinimized && (
                  <p className="text-xs text-white/90 flex items-center gap-1">
                    <Search className="w-3 h-3" />
                    {currentLanguage === 'en' ? 'Your ERP Detective' : 'আপনার ERP গোয়েন্দা'}
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
                <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b">
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
                      <div className="text-5xl mb-3">{DETECTIVE_ICON}</div>
                      <h3 className="font-bold text-lg mb-2">Feluda</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        {currentLanguage === 'en'
                          ? 'Namaste! I\'m Feluda, your ERP detective. What mystery shall we solve today?'
                          : 'নমস্কার! আমি ফেলুদা, আপনার ERP গোয়েন্দা। আজ আমরা কোন রহস্য সমাধান করব?'}
                      </p>
                      
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-600 mb-3">
                          {currentLanguage === 'en' ? 'Quick Actions:' : 'দ্রুত ক্রিয়া:'}
                        </p>
                        {quickActions.map((action, index) => (
                          <Button
                            key={index}
                            onClick={action.action}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-left hover:border-amber-600"
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
                          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 text-lg">
                            {DETECTIVE_ICON}
                          </div>
                        )}
                        <div className="max-w-[80%] space-y-2">
                          <div
                            className={`rounded-2xl px-4 py-3 ${
                              msg.role === 'user'
                                ? 'bg-amber-600 text-white'
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
                                {currentLanguage === 'en' ? 'Case Alert' : 'কেস সতর্কতা'}
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
                                {currentLanguage === 'en' ? 'Retry Investigation' : 'পুনরায় তদন্ত'}
                              </Button>
                            )}
                            <p className="text-xs opacity-70 mt-2">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                          </div>

                          {/* Feedback buttons for AI responses */}
                          {msg.role === 'assistant' && msg.canRate && !msg.isError && !msg.isRetry && !msg.userRating && (
                            <div className="flex items-center gap-2 pl-2">
                              <span className="text-xs text-muted-foreground">
                                {currentLanguage === 'en' ? 'Was this helpful?' : 'এটি কি সহায়ক ছিল?'}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFeedback(index, 'helpful')}
                                className="h-7 px-2 hover:bg-green-100 hover:text-green-700"
                              >
                                <ThumbsUp className="w-3 h-3 mr-1" />
                                <span className="text-xs">{currentLanguage === 'en' ? 'Yes' : 'হ্যাঁ'}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setFeedbackForMessage({ index, rating: 'not_helpful' });
                                  setFeedbackDialogOpen(true);
                                }}
                                className="h-7 px-2 hover:bg-red-100 hover:text-red-700"
                              >
                                <ThumbsDown className="w-3 h-3 mr-1" />
                                <span className="text-xs">{currentLanguage === 'en' ? 'No' : 'না'}</span>
                              </Button>
                            </div>
                          )}

                          {/* Show rating after user voted */}
                          {msg.userRating && (
                            <div className="flex items-center gap-2 pl-2">
                              <Badge variant="outline" className={msg.userRating === 'helpful' ? 'border-green-600 text-green-700' : 'border-red-600 text-red-700'}>
                                {msg.userRating === 'helpful' ? (
                                  <>
                                    <ThumbsUp className="w-3 h-3 mr-1" />
                                    {currentLanguage === 'en' ? 'Helpful' : 'সহায়ক'}
                                  </>
                                ) : (
                                  <>
                                    <ThumbsDown className="w-3 h-3 mr-1" />
                                    {currentLanguage === 'en' ? 'Needs improvement' : 'উন্নতি প্রয়োজন'}
                                  </>
                                )}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {currentLanguage === 'en' ? 'Thank you for the feedback!' : 'প্রতিক্রিয়ার জন্য ধন্যবাদ!'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-lg">
                        {DETECTIVE_ICON}
                      </div>
                      <div className="bg-gray-100 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                          <span className="text-sm text-muted-foreground">
                            {currentLanguage === 'en' ? 'Investigating...' : 'তদন্ত করছি...'}
                          </span>
                        </div>
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
                    placeholder={currentLanguage === 'en' ? 'Ask Feluda anything...' : 'ফেলুদাকে যেকোনো কিছু জিজ্ঞাসা করুন...'}
                    className="flex-1 border-amber-200 focus:border-amber-500"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || isLoading}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                {/* Learning indicator */}
                {successfulInteractions.length > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                    <Sparkles className="w-3 h-3" />
                    <span>
                      {currentLanguage === 'en' 
                        ? `Feluda learned from ${successfulInteractions.length} successful cases`
                        : `ফেলুদা ${successfulInteractions.length}টি সফল মামলা থেকে শিখেছে`}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Feedback Dialog */}
      <FeedbackDialog
        isOpen={feedbackDialogOpen}
        onClose={() => {
          setFeedbackDialogOpen(false);
          setFeedbackForMessage(null);
        }}
        onSubmit={async (feedbackText) => {
          if (feedbackForMessage) {
            await handleFeedback(feedbackForMessage.index, feedbackForMessage.rating, feedbackText);
          }
        }}
        language={currentLanguage}
      />
    </>
  );
}