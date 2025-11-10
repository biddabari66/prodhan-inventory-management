import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, X, Sparkles, Globe } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * 🧠 AI SMART HELP SYSTEM
 * Provides contextual, personalized learning tips in English or Bengali
 * Helps non-technical users understand features easily
 */

const CONTEXT_HELP_MAP = {
  // Page-specific help
  '/Dashboard': {
    en: {
      title: '📊 Dashboard Overview',
      tips: [
        'The dashboard shows your business at a glance - revenue, expenses, and key metrics',
        'Click on any card to see detailed information',
        'Use the period toggle (Weekly/Monthly) to change time range',
        'Charts update automatically with fresh data'
      ]
    },
    bn: {
      title: '📊 ড্যাশবোর্ড ওভারভিউ',
      tips: [
        'ড্যাশবোর্ড আপনার ব্যবসার সংক্ষিপ্ত চিত্র দেখায় - আয়, খরচ এবং গুরুত্বপূর্ণ মেট্রিক্স',
        'বিস্তারিত তথ্যের জন্য যেকোনো কার্ডে ক্লিক করুন',
        'সময়সীমা পরিবর্তনের জন্য পিরিয়ড টগল (সাপ্তাহিক/মাসিক) ব্যবহার করুন',
        'চার্ট স্বয়ংক্রিয়ভাবে নতুন ডেটা দিয়ে আপডেট হয়'
      ]
    }
  },
  '/Attendance': {
    en: {
      title: '🕐 Attendance Made Easy',
      tips: [
        'Click "Check In" when you arrive at work - your location is verified automatically',
        'Click "Check Out" when leaving - working hours are calculated for you',
        'Your attendance is tracked in Bangladesh timezone (UTC+6)',
        'Managers can view team attendance and add manual entries if needed'
      ]
    },
    bn: {
      title: '🕐 সহজ উপস্থিতি',
      tips: [
        'কাজে আসার সময় "চেক ইন" ক্লিক করুন - আপনার অবস্থান স্বয়ংক্রিয়ভাবে যাচাই করা হয়',
        'যাওয়ার সময় "চেক আউট" ক্লিক করুন - কাজের সময় স্বয়ংক্রিয়ভাবে গণনা করা হয়',
        'আপনার উপস্থিতি বাংলাদেশ সময়ে (UTC+6) ট্র্যাক করা হয়',
        'ম্যানেজাররা টিম উপস্থিতি দেখতে এবং প্রয়োজনে ম্যানুয়াল এন্ট্রি যোগ করতে পারেন'
      ]
    }
  },
  '/CRM': {
    en: {
      title: '🎯 CRM - Managing Leads',
      tips: [
        'Leads are potential customers interested in your courses',
        'Drag and drop leads between columns to change their status',
        'Click "Assign" to give leads to your team members',
        'Use filters to find specific leads quickly',
        'Green "Converted" means they became students!'
      ]
    },
    bn: {
      title: '🎯 CRM - লিড পরিচালনা',
      tips: [
        'লিড হল সম্ভাব্য গ্রাহক যারা আপনার কোর্সে আগ্রহী',
        'স্ট্যাটাস পরিবর্তনের জন্য লিডগুলি কলামের মধ্যে ড্র্যাগ এবং ড্রপ করুন',
        'আপনার টিম সদস্যদের লিড দিতে "অ্যাসাইন" ক্লিক করুন',
        'দ্রুত নির্দিষ্ট লিড খুঁজতে ফিল্টার ব্যবহার করুন',
        'সবুজ "কনভার্টেড" মানে তারা শিক্ষার্থী হয়ে গেছে!'
      ]
    }
  },
  '/Expenses': {
    en: {
      title: '💰 Expense Management',
      tips: [
        'Submit expenses with receipts for approval',
        'Green status = Approved, Yellow = Pending, Red = Needs revision',
        'Managers approve expenses in stages (Manager → Finance)',
        'Advance expenses need adjustment after spending',
        'Always attach receipts for faster approval'
      ]
    },
    bn: {
      title: '💰 খরচ ব্যবস্থাপনা',
      tips: [
        'অনুমোদনের জন্য রসিদ সহ খরচ জমা দিন',
        'সবুজ স্ট্যাটাস = অনুমোদিত, হলুদ = অপেক্ষমাণ, লাল = সংশোধন প্রয়োজন',
        'ম্যানেজাররা পর্যায়ক্রমে খরচ অনুমোদন করেন (ম্যানেজার → ফিনান্স)',
        'অগ্রিম খরচ খরচ করার পরে সমন্বয় প্রয়োজন',
        'দ্রুত অনুমোদনের জন্য সর্বদা রসিদ সংযুক্ত করুন'
      ]
    }
  },
  '/Inventory': {
    en: {
      title: '📦 Inventory Simplified',
      tips: [
        'Red badge = Low stock - reorder soon!',
        'Current Stock shows what you have now',
        'Minimum Stock is your safety level - don\'t go below this',
        'Use department filter to see Boibari (Books) or Prodhan.com items',
        'AI Insights tab shows smart recommendations'
      ]
    },
    bn: {
      title: '📦 সহজ ইনভেন্টরি',
      tips: [
        'লাল ব্যাজ = কম স্টক - শীঘ্রই রিঅর্ডার করুন!',
        'বর্তমান স্টক দেখায় আপনার কাছে এখন কী আছে',
        'মিনিমাম স্টক হল আপনার নিরাপত্তা স্তর - এর নিচে যাবেন না',
        'বইবাড়ি (বই) বা প্রধান.কম আইটেম দেখতে ডিপার্টমেন্ট ফিল্টার ব্যবহার করুন',
        'AI ইনসাইটস ট্যাব স্মার্ট সুপারিশ দেখায়'
      ]
    }
  },
  '/Procurement': {
    en: {
      title: '🛒 Order Management',
      tips: [
        'Create orders for customer purchases',
        'Select products, add quantities, calculate totals automatically',
        'Track order status: Pending → Confirmed → Shipped → Delivered',
        'COD means "Cash on Delivery" - customer pays when they receive',
        'Tracking codes help customers track their deliveries'
      ]
    },
    bn: {
      title: '🛒 অর্ডার ব্যবস্থাপনা',
      tips: [
        'গ্রাহক ক্রয়ের জন্য অর্ডার তৈরি করুন',
        'পণ্য নির্বাচন করুন, পরিমাণ যোগ করুন, স্বয়ংক্রিয়ভাবে মোট গণনা করুন',
        'অর্ডার স্ট্যাটাস ট্র্যাক করুন: অপেক্ষমাণ → নিশ্চিত → পাঠানো → বিতরণ',
        'COD মানে "ক্যাশ অন ডেলিভারি" - গ্রাহক প্রাপ্তির সময় পেমেন্ট করে',
        'ট্র্যাকিং কোড গ্রাহকদের তাদের ডেলিভারি ট্র্যাক করতে সাহায্য করে'
      ]
    }
  }
};

export default function SmartHelp({ currentPage, currentLanguage = 'en' }) {
  const [isVisible, setIsVisible] = useState(false);
  const [aiTip, setAiTip] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userDismissed, setUserDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed help for this page
    const dismissed = localStorage.getItem(`help_dismissed_${currentPage}`);
    if (dismissed) {
      setUserDismissed(true);
      return;
    }

    // Show help after 2 seconds on page load
    const timer = setTimeout(() => {
      if (!userDismissed) {
        setIsVisible(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentPage, userDismissed]);

  const generateAITip = useCallback(async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a helpful ERP assistant. Provide ONE short, practical tip (max 20 words) for using the ${currentPage} page in ${currentLanguage === 'en' ? 'English' : 'Bengali'}. Be conversational and encouraging.`,
        response_json_schema: {
          type: 'object',
          properties: {
            tip: { type: 'string' }
          }
        }
      });

      setAiTip(response.tip);
    } catch (error) {
      console.error('Failed to generate AI tip:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [currentPage, currentLanguage, isGenerating]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(`help_dismissed_${currentPage}`, 'true');
    setUserDismissed(true);
  };

  const handleShow = () => {
    setIsVisible(true);
    setUserDismissed(false);
    localStorage.removeItem(`help_dismissed_${currentPage}`);
  };

  const contextHelp = CONTEXT_HELP_MAP[currentPage]?.[currentLanguage] || null;

  if (!contextHelp && !aiTip) return null;

  return (
    <>
      {/* Floating Help Button */}
      {!isVisible && !userDismissed && (
        <Button
          onClick={handleShow}
          className="fixed bottom-24 right-6 z-40 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-2xl rounded-full w-14 h-14 p-0"
        >
          <Lightbulb className="w-6 h-6 animate-pulse" />
        </Button>
      )}

      {/* Help Card */}
      {isVisible && contextHelp && (
        <Card className="fixed bottom-24 right-6 z-40 w-96 shadow-2xl border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50 animate-in slide-in-from-bottom duration-300">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{contextHelp.title}</h3>
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs mt-1">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Smart Help
                  </Badge>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDismiss}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2 mb-4">
              {contextHelp.tips.map((tip, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-2 text-sm p-2 bg-white/60 rounded-lg animate-in fade-in slide-in-from-left"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="text-green-600 font-bold flex-shrink-0">•</span>
                  <span className="text-gray-700">{tip}</span>
                </div>
              ))}
            </div>

            {/* AI-Generated Tip */}
            <div className="border-t border-yellow-200 pt-3 mt-3">
              {aiTip ? (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-200">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-purple-800 font-medium">{aiTip}</p>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={generateAITip}
                  disabled={isGenerating}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-3 h-3 mr-2 animate-spin" />
                      Generating tip...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-2" />
                      Get AI Tip
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-yellow-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-xs text-muted-foreground"
              >
                Don't show again
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newLang = currentLanguage === 'en' ? 'bn' : 'en';
                  localStorage.setItem('biddabari_language', newLang);
                  window.location.reload();
                }}
                className="text-xs"
              >
                <Globe className="w-3 h-3 mr-1" />
                Switch Language
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}