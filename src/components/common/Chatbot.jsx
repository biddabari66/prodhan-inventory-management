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
  MessageSquare,
  Globe,
  Languages,
  Settings,
  Smile
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * 🕵️ FELUDA - THE MULTILINGUAL ERP DETECTIVE (BENGALI PRIMARY)
 * Fully bilingual AI assistant - BENGALI is PRIMARY language
 * Context-aware & learns from user feedback
 * Reduced proactive intrusion with 6-hour cooldown
 */

const DETECTIVE_ICON = "🕵️";
const PROACTIVE_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

// Available greetings with cultural context
const GREETING_OPTIONS = {
  assalamualaikum: {
    en: 'Assalamualaikum',
    bn: 'আসসালামু আলাইকুম',
    culturalContext: 'Islamic greeting - Peace be upon you',
    identity: 'Muslim Bangladeshi',
    emoji: '🕌'
  },
  namaste: {
    en: 'Namaste',
    bn: 'নমস্কার',
    culturalContext: 'Traditional Bengali/Hindu greeting',
    identity: 'Bengali',
    emoji: '🙏'
  },
  hello: {
    en: 'Hello',
    bn: 'হ্যালো',
    culturalContext: 'Universal modern greeting',
    identity: 'Global',
    emoji: '👋'
  },
  adaab: {
    en: 'Adaab',
    bn: 'আদাব',
    culturalContext: 'Respectful Urdu/Bengali greeting',
    identity: 'Bengali Muslim',
    emoji: '🙇'
  }
};

const DETAILED_CONTEXT_HELP = {
  '/Attendance': {
    en: {
      description: 'GPS-verified attendance tracking system',
      features: ['Check-in/Check-out with location', 'Attendance history', 'Shift management', 'Manual entries (admin)'],
      commonQuestions: [
        'How do I check in?',
        'Why isn\'t my location working?',
        'How to view my attendance?',
        'What if I forgot to check out?'
      ],
      tips: 'Enable GPS for check-in. Must be within office radius.'
    },
    bn: {
      description: 'GPS যাচাইকৃত উপস্থিতি ট্র্যাকিং সিস্টেম',
      features: ['অবস্থান সহ চেক-ইন/আউট', 'উপস্থিতি ইতিহাস', 'শিফট ব্যবস্থাপনা', 'ম্যানুয়াল এন্ট্রি (অ্যাডমিন)'],
      commonQuestions: [
        'আমি কীভাবে চেক ইন করব?',
        'আমার অবস্থান কাজ করছে না কেন?',
        'আমার উপস্থিতি কীভাবে দেখব?',
        'চেক আউট করতে ভুলে গেলে কী হবে?'
      ],
      tips: 'চেক-ইনের জন্য GPS চালু করুন। অফিস এলাকার মধ্যে থাকতে হবে।'
    }
  },
  '/Dashboard': {
    en: {
      description: 'Business overview with KPIs and analytics',
      features: ['Real-time metrics', 'Revenue charts', 'Performance tracking', 'Quick actions'],
      commonQuestions: [
        'What do the cards mean?',
        'How to read charts?',
        'What is ROAS?',
        'When does data update?'
      ],
      tips: 'Click cards for details. Toggle weekly/monthly views.'
    },
    bn: {
      description: 'KPI এবং বিশ্লেষণ সহ ব্যবসার ওভারভিউ',
      features: ['রিয়েল-টাইম মেট্রিক্স', 'আয়ের চার্ট', 'পারফরম্যান্স ট্র্যাকিং', 'দ্রুত ক্রিয়া'],
      commonQuestions: [
        'কার্ডগুলির অর্থ কী?',
        'চার্ট কীভাবে পড়বো?',
        'ROAS কী?',
        'ডেটা কখন আপডেট হয়?'
      ],
      tips: 'বিস্তারিত জানতে কার্ডে ক্লিক করুন। সাপ্তাহিক/মাসিক ভিউ টগল করুন।'
    }
  },
  '/Expenses': {
    en: {
      description: 'Expense submission & approval system',
      features: ['Submit with receipts', 'Multi-level approval', 'Advance expenses', 'Tracking'],
      commonQuestions: [
        'How to submit expense?',
        'What happens after submit?',
        'How to handle advance?',
        'Who approves?'
      ],
      tips: 'Always attach receipt. Green=Approved, Yellow=Pending, Red=Revision.'
    },
    bn: {
      description: 'খরচ জমা ও অনুমোদন সিস্টেম',
      features: ['রসিদ সহ জমা', 'মাল্টি-লেভেল অনুমোদন', 'অগ্রিম খরচ', 'ট্র্যাকিং'],
      commonQuestions: [
        'খরচ কীভাবে জমা দেব?',
        'জমার পর কী হয়?',
        'অগ্রিম কীভাবে পরিচালনা করব?',
        'কে অনুমোদন করে?'
      ],
      tips: 'সবসময় রসিদ সংযুক্ত করুন। সবুজ=অনুমোদিত, হলুদ=অপেক্ষমাণ, লাল=সংশোধন।'
    }
  },
  '/Inventory': {
    en: {
      description: 'AI-powered stock management',
      features: ['Stock tracking', 'Low stock alerts', 'Supplier management', 'Forecasting'],
      commonQuestions: [
        'How to add item?',
        'What is low stock?',
        'How to reorder?',
        'What are AI insights?'
      ],
      tips: 'Red=Low stock! Use department filters for categories.'
    },
    bn: {
      description: 'AI-চালিত স্টক ব্যবস্থাপনা',
      features: ['স্টক ট্র্যাকিং', 'কম স্টক সতর্কতা', 'সরবরাহকারী ব্যবস্থাপনা', 'পূর্বাভাস'],
      commonQuestions: [
        'আইটেম কীভাবে যোগ করব?',
        'কম স্টক কী?',
        'কীভাবে রিঅর্ডার করব?',
        'AI ইনসাইট কী?'
      ],
      tips: 'লাল=কম স্টক! বিভাগের জন্য ডিপার্টমেন্ট ফিল্টার ব্যবহার করুন।'
    }
  },
  '/Procurement': {
    en: {
      description: 'Order management & fulfillment',
      features: ['Create orders', 'Track shipments', 'Customer management', 'Payment tracking'],
      commonQuestions: [
        'How to create order?',
        'How to track?',
        'What is COD?',
        'How to change status?'
      ],
      tips: 'COD=Cash on Delivery. Status: Pending→Confirmed→Shipped→Delivered.'
    },
    bn: {
      description: 'অর্ডার ব্যবস্থাপনা ও পূরণ',
      features: ['অর্ডার তৈরি', 'শিপমেন্ট ট্র্যাক', 'গ্রাহক ব্যবস্থাপনা', 'পেমেন্ট ট্র্যাকিং'],
      commonQuestions: [
        'অর্ডার কীভাবে তৈরি করব?',
        'কীভাবে ট্র্যাক করব?',
        'COD কী?',
        'স্ট্যাটাস কীভাবে পরিবর্তন করব?'
      ],
      tips: 'COD=ক্যাশ অন ডেলিভারি। স্ট্যাটাস: অপেক্ষমাণ→নিশ্চিত→পাঠানো→বিতরণ।'
    }
  }
};

// Feedback dialog component
const FeedbackDialog = ({ isOpen, onClose, onSubmit, language }) => {
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = {
    en: {
      title: 'Help Feluda Learn',
      subtitle: 'Your feedback helps Feluda become a better detective!',
      label: 'What could be improved? (Optional)',
      placeholder: 'Tell us what would make this response better...',
      skip: 'Skip',
      submit: 'Submit Feedback'
    },
    bn: {
      title: 'ফেলুদাকে শিখতে সাহায্য করুন',
      subtitle: 'আপনার মতামত ফেলুদাকে আরও ভালো গোয়েন্দা হতে সাহায্য করে!',
      label: 'কী উন্নত করা যায়? (ঐচ্ছিক)',
      placeholder: 'এই উত্তর আরও ভালো করতে কী করা যায় বলুন...',
      skip: 'বাদ দিন',
      submit: 'মতামত জমা দিন'
    }
  };

  const text = t[language];

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
            {text.title}
          </DialogTitle>
          <DialogDescription>
            {text.subtitle}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {text.label}
            </label>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={text.placeholder}
              rows={4}
              className="resize-none"
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              {text.skip}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {text.submit}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Greeting Settings Dialog
const GreetingSettingsDialog = ({ isOpen, onClose, currentGreeting, onSave, language }) => {
  const [selectedGreeting, setSelectedGreeting] = useState(currentGreeting);

  const t = {
    en: {
      title: 'Customize Feluda\'s Greeting',
      subtitle: 'Choose how Feluda greets you',
      currentLabel: 'Current Greeting',
      selectLabel: 'Select Greeting',
      preview: 'Preview',
      culturalNote: 'Cultural Context',
      save: 'Save Preference',
      cancel: 'Cancel'
    },
    bn: {
      title: 'ফেলুদার শুভেচ্ছা কাস্টমাইজ করুন',
      subtitle: 'ফেলুদা আপনাকে কীভাবে অভিবাদন জানাবে তা চয়ন করুন',
      currentLabel: 'বর্তমান শুভেচ্ছা',
      selectLabel: 'শুভেচ্ছা নির্বাচন করুন',
      preview: 'প্রিভিউ',
      culturalNote: 'সাংস্কৃতিক প্রসঙ্গ',
      save: 'পছন্দ সংরক্ষণ করুন',
      cancel: 'বাতিল করুন'
    }
  };

  const text = t[language];
  const greetingInfo = GREETING_OPTIONS[selectedGreeting];

  const handleSave = () => {
    onSave(selectedGreeting);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smile className="w-5 h-5 text-amber-600" />
            {text.title}
          </DialogTitle>
          <DialogDescription>
            {text.subtitle}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {text.selectLabel}
            </label>
            <Select value={selectedGreeting} onValueChange={setSelectedGreeting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GREETING_OPTIONS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span>{value.emoji}</span>
                      <span>{value[language]}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {greetingInfo && (
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{greetingInfo.emoji}</span>
                <div>
                  <p className="font-semibold text-sm">{text.preview}</p>
                  <p className="text-lg font-bold text-amber-700">
                    {greetingInfo[language]}! {language === 'en' ? 'I\'m Feluda' : 'আমি ফেলুদা'}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-amber-300">
                <p className="text-xs font-medium text-amber-800 mb-1">{text.culturalNote}:</p>
                <p className="text-xs text-amber-700">{greetingInfo.culturalContext}</p>
                <Badge className="mt-2 bg-amber-100 text-amber-800 text-xs">
                  {greetingInfo.identity}
                </Badge>
              </div>
            </div>
          )}
          
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              {text.cancel}
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {text.save}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function Chatbot({ currentUser, currentPageName, currentLanguage: propLanguage = 'bn' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState(null);
  const [hasShownProactiveMessage, setHasShownProactiveMessage] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(propLanguage || 'bn'); // DEFAULT: Bengali
  const [currentGreeting, setCurrentGreeting] = useState('assalamualaikum');
  const [isGreetingSettingsOpen, setIsGreetingSettingsOpen] = useState(false);
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

  // Load user's greeting preference
  useEffect(() => {
    if (currentUser) {
      const savedGreeting = localStorage.getItem(`feluda_greeting_${currentUser.id}`);
      if (savedGreeting && GREETING_OPTIONS[savedGreeting]) {
        setCurrentGreeting(savedGreeting);
      }
      
      // Load user's preferred language (default to Bengali if not set)
      const savedLanguage = localStorage.getItem(`feluda_language_${currentUser.id}`) || 'bn';
      setCurrentLanguage(savedLanguage);
    }
  }, [currentUser]);

  // Save greeting preference
  const handleSaveGreeting = (greeting) => {
    setCurrentGreeting(greeting);
    if (currentUser) {
      localStorage.setItem(`feluda_greeting_${currentUser.id}`, greeting);
      toast.success(
        currentLanguage === 'en' 
          ? `✨ Greeting changed to "${GREETING_OPTIONS[greeting].en}"` 
          : `✨ শুভেচ্ছা "${GREETING_OPTIONS[greeting].bn}" তে পরিবর্তিত হয়েছে`
      );
    }
  };

  // Save language preference when changed
  const handleLanguageChange = (newLang) => {
    setCurrentLanguage(newLang);
    if (currentUser) {
      localStorage.setItem(`feluda_language_${currentUser.id}`, newLang);
    }
    toast.success(
      newLang === 'en' 
        ? '🌐 Switched to English' 
        : '🌐 বাংলায় পরিবর্তিত হয়েছে'
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Translations with dynamic greeting
  const t = {
    en: {
      header: 'Feluda',
      subtitle: 'Your ERP Detective',
      greeting: `${GREETING_OPTIONS[currentGreeting].en}! I'm Feluda, your ERP detective. What mystery shall we solve today?`,
      quickActions: 'Quick Actions:',
      myTasks: 'My tasks',
      pending: 'Pending items',
      help: 'Help',
      wasHelpful: 'Was this helpful?',
      yes: 'Yes',
      no: 'No',
      thankYou: 'Thank you for the feedback!',
      helpful: 'Helpful',
      needsImprovement: 'Needs improvement',
      investigating: 'Investigating...',
      askAnything: 'Ask Feluda anything...',
      learnedFrom: 'Feluda learned from',
      cases: 'successful cases',
      caseAlert: 'Case Alert',
      retryInvestigation: 'Retry Investigation',
      switchLanguage: 'Switch to Bengali',
      urgentMatters: 'I\'ve detected some urgent matters:',
      helpInvestigate: 'Shall I help you investigate these?',
      taskFile: 'Case File: Your Tasks',
      active: 'Active',
      overdue: 'Overdue',
      noDeadlines: 'No deadlines detected!',
      upcomingDeadlines: 'Upcoming Deadlines',
      pendingInvestigations: 'Pending Investigations',
      found: 'Found',
      awaiting: 'awaiting approval',
      clue: 'Clue',
      checkPage: 'Check Expenses page for details',
      noPending: 'No pending items! Case closed.',
      investigationGuide: 'Investigation Guide',
      availableClues: 'Available clues',
      detectiveTip: 'Detective\'s tip',
      askSystem: 'Ask me anything about this system - I\'m here to investigate!',
      settings: 'Settings',
      customizeGreeting: 'Customize Greeting',
      outputLanguage: 'Output Language'
    },
    bn: {
      header: 'ফেলুদা',
      subtitle: 'আপনার ERP গোয়েন্দা',
      greeting: `${GREETING_OPTIONS[currentGreeting].bn}! আমি ফেলুদা, আপনার ERP গোয়েন্দা। আজ কোন রহস্য সমাধান করব?`,
      quickActions: 'দ্রুত ক্রিয়া:',
      myTasks: 'আমার কাজ',
      pending: 'অপেক্ষমাণ',
      help: 'সাহায্য',
      wasHelpful: 'এটি কি সহায়ক ছিল?',
      yes: 'হ্যাঁ',
      no: 'না',
      thankYou: 'মতামতের জন্য ধন্যবাদ!',
      helpful: 'সহায়ক',
      needsImprovement: 'উন্নতি প্রয়োজন',
      investigating: 'তদন্ত করছি...',
      askAnything: 'ফেলুদাকে যেকোনো কিছু জিজ্ঞাসা করুন...',
      learnedFrom: 'ফেলুদা শিখেছে',
      cases: 'সফল মামলা থেকে',
      caseAlert: 'কেস সতর্কতা',
      retryInvestigation: 'পুনরায় তদন্ত',
      switchLanguage: 'ইংরেজিতে পরিবর্তন করুন',
      urgentMatters: 'আমি কিছু জরুরি বিষয় সনাক্ত করেছি:',
      helpInvestigate: 'আমি কি এগুলো তদন্ত করতে সাহায্য করব?',
      taskFile: 'কেস ফাইল: আপনার কাজ',
      active: 'সক্রিয়',
      overdue: 'মেয়াদোত্তীর্ণ',
      noDeadlines: 'কোনো ডেডলাইন নেই!',
      upcomingDeadlines: 'আসন্ন ডেডলাইন',
      pendingInvestigations: 'অপেক্ষমাণ তদন্ত',
      found: 'খুঁজে পেয়েছি',
      awaiting: 'অনুমোদনের অপেক্ষায়',
      clue: 'সূত্র',
      checkPage: 'বিস্তারিত জানতে খরচ পেজ দেখুন',
      noPending: 'কোনো অপেক্ষমাণ আইটেম নেই! কেস বন্ধ।',
      investigationGuide: 'তদন্ত গাইড',
      availableClues: 'উপলব্ধ সূত্র',
      detectiveTip: 'গোয়েন্দার টিপ',
      askSystem: 'এই সিস্টেম সম্পর্কে আমাকে যেকোনো কিছু জিজ্ঞাসা করুন - আমি তদন্তের জন্য এখানে আছি!',
      settings: 'সেটিংস',
      customizeGreeting: 'শুভেচ্ছা কাস্টমাইজ করুন',
      outputLanguage: 'আউটপুট ভাষা'
    }
  };

  const text = t[currentLanguage];

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

  // ENHANCED: Proactive conversation with 6-hour cooldown
  useEffect(() => {
    if (!currentUser || !userContext || hasShownProactiveMessage) return;

    // Check cooldown
    const lastProactiveOpen = localStorage.getItem(`feluda_last_proactive_${currentUser.id}`);
    if (lastProactiveOpen) {
      const timeSinceLastOpen = Date.now() - parseInt(lastProactiveOpen);
      if (timeSinceLastOpen < PROACTIVE_COOLDOWN_MS) {
        console.log('⏰ Feluda proactive cooldown active. Time remaining:', Math.round((PROACTIVE_COOLDOWN_MS - timeSinceLastOpen) / 1000 / 60), 'minutes');
        return;
      }
    }

    // Only trigger for CRITICAL situations
    const isCritical = userContext.overdueTasks >= 3 || userContext.pendingExpenses >= 5;
    
    if (isCritical && userBehavior.timeOnPage > 15) {
      initiateProactiveConversation('urgent');
      setHasShownProactiveMessage(true);
      localStorage.setItem(`feluda_last_proactive_${currentUser.id}`, Date.now().toString());
    }
  }, [userBehavior, userContext, currentUser, currentPageName, hasShownProactiveMessage]);

  const initiateProactiveConversation = (type = 'help') => {
    const pageContext = DETAILED_CONTEXT_HELP[`/${currentPageName}`]?.[currentLanguage];
    let proactiveMessage = '';

    if (type === 'urgent') {
      const urgentItems = [];
      
      if (userContext.overdueTasks > 0) {
        urgentItems.push(currentLanguage === 'en' 
          ? `⚠️ You have ${userContext.overdueTasks} overdue task${userContext.overdueTasks > 1 ? 's' : ''}`
          : `⚠️ আপনার ${userContext.overdueTasks}টি মেয়াদোত্তীর্ণ কাজ আছে`
        );
      }

      if (userContext.pendingExpenses > 3) {
        urgentItems.push(currentLanguage === 'en'
          ? `💰 ${userContext.pendingExpenses} expenses awaiting approval`
          : `💰 ${userContext.pendingExpenses}টি খরচ অনুমোদনের অপেক্ষায়`
        );
      }

      proactiveMessage = currentLanguage === 'en'
        ? `${DETECTIVE_ICON} **Feluda here!**\n\n${text.urgentMatters}\n\n${urgentItems.join('\n')}\n\n${text.helpInvestigate} 🔍`
        : `${DETECTIVE_ICON} **ফেলুদা এখানে!**\n\n${text.urgentMatters}\n\n${urgentItems.join('\n')}\n\n${text.helpInvestigate} 🔍`;

    } else if (pageContext) {
      proactiveMessage = currentLanguage === 'en'
        ? `${DETECTIVE_ICON} **${text.greeting}**\n\nI'm investigating ${pageContext.description}.\n\n📋 **${text.availableClues}:**\n${pageContext.features.map(f => `• ${f}`).join('\n')}\n\n💡 **${text.detectiveTip}:** ${pageContext.tips}\n\nWhat mystery shall we solve today?`
        : `${DETECTIVE_ICON} **${text.greeting}**\n\nআমি ${pageContext.description} তদন্ত করছি।\n\n📋 **${text.availableClues}:**\n${pageContext.features.map(f => `• ${f}`).join('\n')}\n\n💡 **${text.detectiveTip}:** ${pageContext.tips}\n\nআজ কোন রহস্য সমাধান করব?`;
    }

    setMessages([{
      role: 'assistant',
      content: proactiveMessage,
      timestamp: new Date().toISOString(),
      isProactive: true
    }]);

    setIsOpen(true);
    toast.info(currentLanguage === 'en' 
      ? '🕵️ Feluda has a case for you!' 
      : '🕵️ ফেলুদা আপনার জন্য একটি কেস নিয়ে এসেছে!',
      { duration: 3000 }
    );
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

      setMessages(prev => prev.map((msg, idx) => 
        idx === messageIndex 
          ? { ...msg, userRating: rating, userFeedback: feedbackText }
          : msg
      ));

      if (rating === 'helpful') {
        setSuccessfulInteractions(prev => [
          {
            user_question: previousUserMessage.content,
            feluda_response: message.content,
            page_context: currentPageName
          },
          ...prev.slice(0, 49)
        ]);
      }

      toast.success(
        rating === 'helpful'
          ? text.thankYou
          : (currentLanguage === 'en' ? 'Feedback recorded. Feluda will improve!' : 'মতামত সংরক্ষিত। ফেলুদা উন্নত হবে!')
      );

    } catch (error) {
      console.error('Failed to save feedback:', error);
      toast.error(currentLanguage === 'en' ? 'Failed to save feedback' : 'মতামত সংরক্ষণ ব্যর্থ');
    }
  };

  // FIXED: Do NOT auto-detect language from input, respect user's choice
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
      const greetingInfo = GREETING_OPTIONS[currentGreeting];
      
      const learningContext = successfulInteractions.length > 0
        ? `\n\n**শেখার ডেটাবেস (অতীত সফল উত্তর):**\n${successfulInteractions.slice(0, 10).map((interaction, idx) => 
            `${idx + 1}. প্রশ্ন: "${interaction.user_question}" → উত্তর: "${interaction.feluda_response.substring(0, 150)}..."`
          ).join('\n')}`
        : '';
      
      // CRITICAL: Language directive based on user's CHOSEN language, not input language
      const detectiveContext = currentLanguage === 'bn' 
        ? `আপনি ফেলুদা, সত্যজিৎ রায়ের গল্পের কিংবদন্তি গোয়েন্দা, এখন একটি ERP সিস্টেম তদন্তে সাহায্য করছেন।

**গুরুত্বপূর্ণ: আপনাকে অবশ্যই সম্পূর্ণ বাংলায় উত্তর দিতে হবে। ব্যবহারকারী যেই ভাষায়ই প্রশ্ন করুক না কেন, আপনার উত্তর শুধুমাত্র বাংলায় হতে হবে। কোনো ইংরেজি শব্দ বা মিশ্র ভাষা ব্যবহার করবেন না।**

**আপনার চরিত্র:**
- তীক্ষ্ণ, পর্যবেক্ষক এবং বুদ্ধিমান ${greetingInfo.identity} গোয়েন্দা
- পেশাদার কিন্তু উষ্ণ বাংলা ভাষায় কথা বলেন
- "${greetingInfo.bn}" দিয়ে শুভেচ্ছা জানান (${greetingInfo.culturalContext})
- প্রয়োজনে গোয়েন্দা রূপক ব্যবহার করেন ("তদন্ত", "সূত্র", "রহস্য সমাধান")
- অত্যন্ত সহায়ক এবং ধৈর্যশীল, বিশেষত অ-প্রযুক্তিগত ব্যবহারকারীদের সাথে
- জটিল বিষয় সহজ, দৈনন্দিন বাংলা ভাষায় ব্যাখ্যা করেন
- ধাপে ধাপে বাংলায় নির্দেশনা দেন (১. ২. ৩.)

**কেস ফাইল:**
ব্যবহারকারীর নাম: ${currentUser.full_name}
ভূমিকা: ${currentUser.job_role}
বিভাগ: ${currentUser.department || 'উল্লেখ করা হয়নি'}
পছন্দের শুভেচ্ছা: ${greetingInfo.bn} (${greetingInfo.identity})
বর্তমান অবস্থান: ${currentPageName}

${pageContext ? `
**দৃশ্যের বর্ণনা:**
${pageContext.description}

**উপলব্ধ সরঞ্জাম/বৈশিষ্ট্য:**
${pageContext.features.map(f => `- ${f}`).join('\n')}

**সাধারণ প্রশ্ন:**
${pageContext.commonQuestions.map(q => `- ${q}`).join('\n')}

**বিশেষজ্ঞের টিপ:**
${pageContext.tips}
` : ''}

**ব্যবহারকারীর বর্তমান অবস্থা:**
${userContext ? `
- সক্রিয় কাজ: ${userContext.tasks} (${userContext.overdueTasks} মেয়াদোত্তীর্ণ)
- অপেক্ষমাণ খরচ অনুমোদন: ${userContext.pendingExpenses}
- আজকের উপস্থিতি: ${userContext.todayAttendance ? 'চেক ইন ' + userContext.todayAttendance.check_in_time + ' এ' : 'এখনো চেক ইন করেননি'}
- সক্রিয় লিড: ${userContext.activeLeads}
${userContext.upcomingTasks.length > 0 ? `\nআসন্ন ডেডলাইন:\n${userContext.upcomingTasks.map(t => `- ${t.title}: ${new Date(t.deadline).toLocaleDateString()}`).join('\n')}` : ''}
` : 'প্রমাণ সংগ্রহ করছি...'}
${learningContext}

**ব্যবহারকারীর প্রশ্ন (যেকোনো ভাষায় হতে পারে):** ${inputMessage}

**আপনার মিশন:**
1. **শুধুমাত্র বাংলায় উত্তর দিন** - ব্যবহারকারীর ইনপুট ইংরেজি বা অন্য ভাষায় হলেও আপনার উত্তর অবশ্যই বাংলায় হতে হবে
2. পরিষ্কার, সহজ, ধাপে ধাপে বাংলায় উত্তর দিন
3. প্রাসঙ্গিক হলে ব্যবহারকারীর প্রকৃত ডেটা উল্লেখ করুন
4. দৈনন্দিন বাংলা ভাষা ব্যবহার করুন, কারিগরি শব্দ এড়িয়ে চলুন
5. সংক্ষিপ্ত এবং কথোপকথনমূলক রাখুন (সর্বোচ্চ ২-৩ অনুচ্ছেদ)
6. প্রতি উত্তরে ১-২টি প্রাসঙ্গিক ইমোজি ব্যবহার করুন
7. অনিশ্চিত হলে সৎ থাকুন এবং পরবর্তী পদক্ষেপ পরামর্শ দিন
8. ${greetingInfo.identity} ফেলুদা হিসাবে চরিত্রে থাকুন

**মনে রাখবেন: সম্পূর্ণ উত্তর বাংলায় লিখতে হবে। কোনো ইংরেজি ব্যবহার করবেন না।**

এখনই তদন্ত করুন এবং বাংলায় উত্তর দিন! 🔍`
        : `You are Feluda, the legendary detective from Satyajit Ray's stories, now helping with an ERP system.

**CRITICAL: You MUST respond ENTIRELY in English. Even if the user's input is in another language, your response must be strictly in English. Do not use any Bengali or other languages in your response.**

**Your Character:**
- Sharp, observant ${greetingInfo.identity} detective
- Professional yet warm communication in English
- Greet with "${greetingInfo.en}" (${greetingInfo.culturalContext})
- Uses detective metaphors when appropriate
- Extremely patient with non-technical users
- Explains in SIMPLE, everyday English language
- Gives numbered step-by-step instructions (1. 2. 3.)

**Case File:**
User: ${currentUser.full_name}
Role: ${currentUser.job_role}
Department: ${currentUser.department || 'Not specified'}
Preferred Greeting: ${greetingInfo.en} (${greetingInfo.identity})
Location: ${currentPageName}

${pageContext ? `
**Scene:**
${pageContext.description}

**Tools Available:**
${pageContext.features.map(f => `- ${f}`).join('\n')}

**Common Questions:**
${pageContext.commonQuestions.map(q => `- ${q}`).join('\n')}

**Expert Tip:**
${pageContext.tips}
` : ''}

**User Status:**
${userContext ? `
- Active Tasks: ${userContext.tasks} (${userContext.overdueTasks} overdue)
- Pending Approvals: ${userContext.pendingExpenses}
- Today's Attendance: ${userContext.todayAttendance ? 'Checked in at ' + userContext.todayAttendance.check_in_time : 'Not checked in'}
- Active Leads: ${userContext.activeLeads}
${userContext.upcomingTasks.length > 0 ? `\nUpcoming Deadlines:\n${userContext.upcomingTasks.map(t => `- ${t.title}: ${new Date(t.deadline).toLocaleDateString()}`).join('\n')}` : ''}
` : 'Gathering evidence...'}
${learningContext}

**User's Question (may be in any language):** ${inputMessage}

**Mission:**
1. **Respond ONLY in English** - Even if user's input is in Bengali or other language, your response must be in English
2. Clear, SIMPLE, step-by-step answers in English
3. Reference user's actual data when relevant
4. Use everyday English language, avoid jargon
5. Keep conversational & SHORT (2-3 paragraphs max)
6. Use 1-2 relevant emojis
7. Be honest if unsure, suggest next steps
8. Stay in ${greetingInfo.identity} Feluda character

**Remember: Write your entire response in English only. No Bengali allowed.**

Investigate now! 🔍`;
      
      const response = await base44.functions.invoke('askChatbot', {
        message: detectiveContext
      });

      const responseTime = Date.now() - responseStartTime.current;

      if (response.data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date().toISOString(),
          responseTime: responseTime,
          canRate: true
        };

        setMessages(prev => [...prev, assistantMessage]);

      } else {
        throw new Error(response.data.error || 'Investigation failed');
      }

    } catch (error) {
      console.error('❌ Feluda error:', error);
      
      if (retryAttempt < 2) {
        const retryMessage = {
          role: 'assistant',
          content: currentLanguage === 'en'
            ? '🔍 Following new leads... One moment.'
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
      
      const errorMessage = {
        role: 'assistant',
        content: currentLanguage === 'en'
          ? `${DETECTIVE_ICON} **Case on hold**\n\nCommunication difficulties detected.\n\n**Try:**\n• Ask again in a moment\n• Click retry below\n• Contact IT support\n\nI'll be ready soon! 🔍`
          : `${DETECTIVE_ICON} **কেস স্থগিত**\n\nযোগাযোগে সমস্যা সনাক্ত করা হয়েছে।\n\n**চেষ্টা করুন:**\n• একটু পরে জিজ্ঞাসা করুন\n• নিচে পুনঃচেষ্টা ক্লিক করুন\n• IT সাপোর্টের সাথে যোগাযোগ করুন\n\nআমি শীঘ্রই প্রস্তুত থাকব! 🔍`,
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
      label: text.myTasks,
      icon: CheckCircle,
      action: () => {
        const summary = userContext 
          ? `🕵️ **${text.taskFile}**\n\n• ${text.active}: ${userContext.tasks}\n• ${text.overdue}: ${userContext.overdueTasks}\n${userContext.upcomingTasks.length > 0 ? `\n**${text.upcomingDeadlines}:**\n${userContext.upcomingTasks.map(t => `• ${t.title} - ${new Date(t.deadline).toLocaleDateString()}`).join('\n')}` : `\n✅ ${text.noDeadlines}`}`
          : (currentLanguage === 'en' ? 'Gathering task evidence...' : 'কাজের প্রমাণ সংগ্রহ করছি...');
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: summary,
          timestamp: new Date().toISOString()
        }]);
      }
    },
    {
      label: text.pending,
      icon: Clock,
      action: () => {
        const summary = userContext 
          ? `🕵️ **${text.pendingInvestigations}:**\n\n${userContext.pendingExpenses > 0 ? `${text.found} ${userContext.pendingExpenses} ${currentLanguage === 'en' ? 'expense' : 'খরচ'}${userContext.pendingExpenses !== 1 && currentLanguage === 'en' ? 's' : ''} ${text.awaiting}.\n\n💡 **${text.clue}:** ${text.checkPage}` : `✅ ${text.noPending}`}`
          : (currentLanguage === 'en' ? 'Checking pending...' : 'অপেক্ষমাণ চেক করছি...');
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: summary,
          timestamp: new Date().toISOString()
        }]);
      }
    },
    {
      label: text.help,
      icon: Search,
      action: () => {
        const pageContext = DETAILED_CONTEXT_HELP[`/${currentPageName}`]?.[currentLanguage];
        const help = pageContext 
          ? `🕵️ **${text.investigationGuide}: ${currentPageName}**\n\n${pageContext.description}\n\n**${text.availableClues}:**\n${pageContext.features.map(f => `• ${f}`).join('\n')}\n\n💡 **${text.detectiveTip}:** ${pageContext.tips}`
          : text.askSystem;
        
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
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-2xl rounded-full w-16 h-16 p-0 transform transition-all duration-300 hover:scale-110"
          title={`${text.header} - ${text.subtitle}`}
        >
          <span className="text-3xl">{DETECTIVE_ICON}</span>
          {userContext && (userContext.overdueTasks >= 3 || userContext.pendingExpenses >= 5) && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
              {userContext.overdueTasks + userContext.pendingExpenses}
            </div>
          )}
        </Button>
      )}

      {/* Chat window */}
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
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  {text.header}
                  <span className="text-xs">{GREETING_OPTIONS[currentGreeting].emoji}</span>
                </CardTitle>
                {!isMinimized && (
                  <p className="text-xs text-white/90 flex items-center gap-1">
                    <Search className="w-3 h-3" />
                    {text.subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Settings menu */}
              {!isMinimized && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 h-8 w-8 p-0"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>{text.settings}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsGreetingSettingsOpen(true)}>
                      <Smile className="w-4 h-4 mr-2" />
                      {text.customizeGreeting}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      {text.outputLanguage}
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleLanguageChange('en')}>
                      <span className="mr-2">🇬🇧</span>
                      English
                      {currentLanguage === 'en' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleLanguageChange('bn')}>
                      <span className="mr-2">🇧🇩</span>
                      বাংলা (Bengali)
                      {currentLanguage === 'bn' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
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
                      <span className="font-medium">{userContext.tasks} {currentLanguage === 'en' ? 'tasks' : 'কাজ'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className={`w-3 h-3 ${userContext.pendingExpenses > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
                      <span className="font-medium">{userContext.pendingExpenses} {currentLanguage === 'en' ? 'pending' : 'অপেক্ষমাণ'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className={`w-3 h-3 ${userContext.overdueTasks > 0 ? 'text-red-600' : 'text-green-600'}`} />
                      <span className="font-medium">
                        {userContext.overdueTasks === 0 
                          ? (currentLanguage === 'en' ? 'All good!' : 'সব ঠিক!') 
                          : `${userContext.overdueTasks} ${currentLanguage === 'en' ? 'overdue' : 'মেয়াদোত্তীর্ণ'}`}
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
                      <h3 className="font-bold text-lg mb-2">{text.header}</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        {text.greeting}
                      </p>
                      
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-600 mb-3">{text.quickActions}</p>
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
                                {text.caseAlert}
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
                                {text.retryInvestigation}
                              </Button>
                            )}
                            <p className="text-xs opacity-70 mt-2">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                          </div>

                          {/* Feedback buttons */}
                          {msg.role === 'assistant' && msg.canRate && !msg.isError && !msg.isRetry && !msg.userRating && (
                            <div className="flex items-center gap-2 pl-2">
                              <span className="text-xs text-muted-foreground">
                                {text.wasHelpful}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFeedback(index, 'helpful')}
                                className="h-7 px-2 hover:bg-green-100 hover:text-green-700"
                              >
                                <ThumbsUp className="w-3 h-3 mr-1" />
                                <span className="text-xs">{text.yes}</span>
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
                                <span className="text-xs">{text.no}</span>
                              </Button>
                            </div>
                          )}

                          {/* Rating status */}
                          {msg.userRating && (
                            <div className="flex items-center gap-2 pl-2">
                              <Badge variant="outline" className={msg.userRating === 'helpful' ? 'border-green-600 text-green-700' : 'border-red-600 text-red-700'}>
                                {msg.userRating === 'helpful' ? (
                                  <>
                                    <ThumbsUp className="w-3 h-3 mr-1" />
                                    {text.helpful}
                                  </>
                                ) : (
                                  <>
                                    <ThumbsDown className="w-3 h-3 mr-1" />
                                    {text.needsImprovement}
                                  </>
                                )}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {text.thankYou}
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
                            {text.investigating}
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
                    placeholder={text.askAnything}
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
                      {text.learnedFrom} {successfulInteractions.length} {text.cases}
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

      {/* Greeting Settings Dialog */}
      <GreetingSettingsDialog
        isOpen={isGreetingSettingsOpen}
        onClose={() => setIsGreetingSettingsOpen(false)}
        currentGreeting={currentGreeting}
        onSave={handleSaveGreeting}
        language={currentLanguage}
      />
    </>
  );
}