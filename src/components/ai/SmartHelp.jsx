import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  X, 
  Sparkles, 
  Volume2,
  VolumeX,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Languages,
  Globe
} from 'lucide-react';
import { erp } from '@/api/erpClient';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * 💡 SMART HELP - MULTILINGUAL ON-PAGE ASSISTANCE
 * Simple language support for non-technical users
 * Full Bengali + English support with voice assistance
 */

const PAGE_HELP_CONTENT = {
  '/Attendance': {
    en: {
      title: '📍 Attendance Help',
      emoji: '🕐',
      simplified: [
        {
          step: '1️⃣ Enable Location',
          detail: 'Turn on GPS/Location on your phone. Without it, you cannot check in.',
          icon: '📱',
          color: 'bg-blue-100 border-blue-300'
        },
        {
          step: '2️⃣ Come to Office',
          detail: 'You must be physically inside the office area. The system checks your location.',
          icon: '🏢',
          color: 'bg-green-100 border-green-300'
        },
        {
          step: '3️⃣ Click "Check In"',
          detail: 'Press the big purple "Check In" button. Wait for confirmation message.',
          icon: '✅',
          color: 'bg-purple-100 border-purple-300'
        },
        {
          step: '4️⃣ Check Out When Leaving',
          detail: 'Before going home, press "Check Out" button. This records your working hours.',
          icon: '🚪',
          color: 'bg-orange-100 border-orange-300'
        }
      ],
      commonMistakes: [
        '❌ Location turned off - Cannot check in',
        '❌ Too far from office - Must be within 100 meters',
        '❌ Forgot to check out - Talk to manager',
        '❌ Wrong time - Check system clock'
      ],
      voiceScript: 'Hello! For attendance, first make sure your phone location is turned on. Then come to the office. Click the purple Check In button. When you leave, click Check Out. Simple!'
    },
    bn: {
      title: '📍 উপস্থিতি সাহায্য',
      emoji: '🕐',
      simplified: [
        {
          step: '1️⃣ অবস্থান চালু করুন',
          detail: 'আপনার ফোনে GPS/অবস্থান চালু করুন। এটি ছাড়া চেক ইন করতে পারবেন না।',
          icon: '📱',
          color: 'bg-blue-100 border-blue-300'
        },
        {
          step: '2️⃣ অফিসে আসুন',
          detail: 'আপনাকে শারীরিকভাবে অফিস এলাকার ভিতরে থাকতে হবে। সিস্টেম আপনার অবস্থান পরীক্ষা করে।',
          icon: '🏢',
          color: 'bg-green-100 border-green-300'
        },
        {
          step: '3️⃣ "চেক ইন" ক্লিক করুন',
          detail: 'বড় বেগুনি "চেক ইন" বাটনে চাপ দিন। নিশ্চিতকরণ বার্তার জন্য অপেক্ষা করুন।',
          icon: '✅',
          color: 'bg-purple-100 border-purple-300'
        },
        {
          step: '4️⃣ চলে যাওয়ার সময় চেক আউট',
          detail: 'বাড়ি যাওয়ার আগে "চেক আউট" বাটন চাপুন। এটি আপনার কাজের ঘন্টা রেকর্ড করে।',
          icon: '🚪',
          color: 'bg-orange-100 border-orange-300'
        }
      ],
      commonMistakes: [
        '❌ অবস্থান বন্ধ - চেক ইন করতে পারবেন না',
        '❌ অফিস থেকে অনেক দূরে - ১০০ মিটারের মধ্যে থাকতে হবে',
        '❌ চেক আউট করতে ভুলে গেছেন - ম্যানেজারকে বলুন',
        '❌ ভুল সময় - সিস্টেম ঘড়ি চেক করুন'
      ],
      voiceScript: 'হ্যালো! উপস্থিতির জন্য, প্রথমে আপনার ফোনের অবস্থান চালু আছে তা নিশ্চিত করুন। তারপর অফিসে আসুন। বেগুনি চেক ইন বাটনে ক্লিক করুন। চলে যাওয়ার সময়, চেক আউট ক্লিক করুন। সহজ!'
    }
  },
  '/Dashboard': {
    en: {
      title: '📊 Dashboard Overview',
      emoji: '📈',
      simplified: [
        {
          step: '1️⃣ KPI Cards = Quick Numbers',
          detail: 'Each colorful card shows important numbers. Green=Good, Red=Needs attention.',
          icon: '💳',
          color: 'bg-violet-100 border-violet-300'
        },
        {
          step: '2️⃣ Charts Show Trends',
          detail: 'Lines going UP = Growing. Lines going DOWN = Need improvement.',
          icon: '📈',
          color: 'bg-green-100 border-green-300'
        },
        {
          step: '3️⃣ Click Cards for Details',
          detail: 'Click any card to see more information.',
          icon: '👆',
          color: 'bg-blue-100 border-blue-300'
        },
        {
          step: '4️⃣ Quick Actions',
          detail: 'Bottom buttons let you quickly do common tasks.',
          icon: '⚡',
          color: 'bg-yellow-100 border-yellow-300'
        }
      ],
      commonMistakes: [
        '❌ Don\'t understand numbers - Ask manager',
        '❌ Charts confusing - Green=good, Red=bad',
        '❌ Too much info - Focus on your department'
      ],
      voiceScript: 'Dashboard shows business health. Each card is one important number. Green is good, red needs fix. Charts show if going up or down.'
    },
    bn: {
      title: '📊 ড্যাশবোর্ড সংক্ষিপ্ত বিবরণ',
      emoji: '📈',
      simplified: [
        {
          step: '1️⃣ KPI কার্ড = দ্রুত সংখ্যা',
          detail: 'প্রতিটি রঙিন কার্ড গুরুত্বপূর্ণ সংখ্যা দেখায়। সবুজ=ভালো, লাল=মনোযোগ প্রয়োজন।',
          icon: '💳',
          color: 'bg-violet-100 border-violet-300'
        },
        {
          step: '2️⃣ চার্ট প্রবণতা দেখায়',
          detail: 'লাইন উপরে = বাড়ছে। লাইন নিচে = উন্নতি প্রয়োজন।',
          icon: '📈',
          color: 'bg-green-100 border-green-300'
        },
        {
          step: '3️⃣ বিস্তারিতের জন্য ক্লিক',
          detail: 'আরও তথ্যের জন্য যেকোনো কার্ডে ক্লিক করুন।',
          icon: '👆',
          color: 'bg-blue-100 border-blue-300'
        },
        {
          step: '4️⃣ দ্রুত ক্রিয়া',
          detail: 'নিচের বাটনগুলি দ্রুত সাধারণ কাজ করতে দেয়।',
          icon: '⚡',
          color: 'bg-yellow-100 border-yellow-300'
        }
      ],
      commonMistakes: [
        '❌ সংখ্যা বুঝছেন না - ম্যানেজারকে জিজ্ঞাসা করুন',
        '❌ চার্ট জটিল - সবুজ=ভালো, লাল=খারাপ',
        '❌ অনেক তথ্য - শুধু আপনার বিভাগে ফোকাস করুন'
      ],
      voiceScript: 'ড্যাশবোর্ড ব্যবসার স্বাস্থ্য দেখায়। প্রতিটি কার্ড একটি গুরুত্বপূর্ণ সংখ্যা। সবুজ ভালো, লাল ঠিক করতে হবে। চার্ট দেখায় উপরে না নিচে যাচ্ছে।'
    }
  },
  '/Expenses': {
    en: {
      title: '💰 Expense Submission',
      emoji: '💸',
      simplified: [
        {
          step: '1️⃣ Click "Submit Expense"',
          detail: 'Find the green button at top.',
          icon: '🟢',
          color: 'bg-green-100 border-green-300'
        },
        {
          step: '2️⃣ Fill the Form',
          detail: 'Enter what, how much (৳), date, category.',
          icon: '📝',
          color: 'bg-blue-100 border-blue-300'
        },
        {
          step: '3️⃣ Upload Receipt',
          detail: 'Take bill photo and upload. VERY important!',
          icon: '📸',
          color: 'bg-purple-100 border-purple-300'
        },
        {
          step: '4️⃣ Submit & Wait',
          detail: 'Click submit. Manager will approve.',
          icon: '⏳',
          color: 'bg-orange-100 border-orange-300'
        }
      ],
      commonMistakes: [
        '❌ No receipt - Will reject',
        '❌ Wrong date - Use actual date',
        '❌ Wrong category - Choose carefully',
        '❌ Didn\'t submit - Must click Submit!'
      ],
      voiceScript: 'For expenses: Click Submit Expense. Fill what you bought, how much, date. Upload bill photo - must! Then submit. Manager approves.'
    },
    bn: {
      title: '💰 খরচ জমা',
      emoji: '💸',
      simplified: [
        {
          step: '1️⃣ "খরচ জমা" ক্লিক করুন',
          detail: 'উপরে সবুজ বাটন খুঁজুন।',
          icon: '🟢',
          color: 'bg-green-100 border-green-300'
        },
        {
          step: '2️⃣ ফর্ম পূরণ করুন',
          detail: 'কি, কত (৳), তারিখ, বিভাগ লিখুন।',
          icon: '📝',
          color: 'bg-blue-100 border-blue-300'
        },
        {
          step: '3️⃣ রসিদ আপলোড করুন',
          detail: 'বিলের ছবি তুলুন এবং আপলোড করুন। অতি গুরুত্বপূর্ণ!',
          icon: '📸',
          color: 'bg-purple-100 border-purple-300'
        },
        {
          step: '4️⃣ জমা দিন ও অপেক্ষা করুন',
          detail: 'জমা ক্লিক করুন। ম্যানেজার অনুমোদন করবেন।',
          icon: '⏳',
          color: 'bg-orange-100 border-orange-300'
        }
      ],
      commonMistakes: [
        '❌ রসিদ নেই - প্রত্যাখ্যান হবে',
        '❌ ভুল তারিখ - প্রকৃত তারিখ ব্যবহার করুন',
        '❌ ভুল বিভাগ - সাবধানে চয়ন করুন',
        '❌ জমা দেননি - জমা ক্লিক করতে হবে!'
      ],
      voiceScript: 'খরচের জন্য: খরচ জমা ক্লিক করুন। কি কিনেছেন, কত টাকা, তারিখ পূরণ করুন। বিল ফটো আপলোড করুন - অবশ্যই! তারপর জমা দিন। ম্যানেজার অনুমোদন করবেন।'
    }
  },
  '/Inventory': {
    en: {
      title: '📦 Stock Management',
      emoji: '📊',
      simplified: [
        {
          step: '1️⃣ Search Product',
          detail: 'Type product name in search box.',
          icon: '🔍',
          color: 'bg-cyan-100 border-cyan-300'
        },
        {
          step: '2️⃣ Check Stock Number',
          detail: 'Look at "Current Stock" - how many you have.',
          icon: '🔢',
          color: 'bg-blue-100 border-blue-300'
        },
        {
          step: '3️⃣ Red = Need to Order',
          detail: 'Red badge means low! Order more soon.',
          icon: '🔴',
          color: 'bg-red-100 border-red-300'
        },
        {
          step: '4️⃣ Update After Sale',
          detail: 'When you sell, reduce stock number.',
          icon: '📉',
          color: 'bg-orange-100 border-orange-300'
        }
      ],
      commonMistakes: [
        '❌ Didn\'t update after sale',
        '❌ Wrong department',
        '❌ Wrong price',
        '❌ No minimum stock set'
      ],
      voiceScript: 'For stock: Search product. Check Current Stock number. Red means low, order more! After selling, reduce number. Keep accurate!'
    },
    bn: {
      title: '📦 স্টক ব্যবস্থাপনা',
      emoji: '📊',
      simplified: [
        {
          step: '1️⃣ পণ্য খুঁজুন',
          detail: 'সার্চ বক্সে পণ্যের নাম টাইপ করুন।',
          icon: '🔍',
          color: 'bg-cyan-100 border-cyan-300'
        },
        {
          step: '2️⃣ স্টক নম্বর দেখুন',
          detail: '"বর্তমান স্টক" দেখুন - আপনার কতটা আছে।',
          icon: '🔢',
          color: 'bg-blue-100 border-blue-300'
        },
        {
          step: '3️⃣ লাল = অর্ডার করুন',
          detail: 'লাল ব্যাজ মানে কম! শীঘ্রই অর্ডার করুন।',
          icon: '🔴',
          color: 'bg-red-100 border-red-300'
        },
        {
          step: '4️⃣ বিক্রয়ের পরে আপডেট',
          detail: 'বিক্রি করলে স্টক নম্বর কমান।',
          icon: '📉',
          color: 'bg-orange-100 border-orange-300'
        }
      ],
      commonMistakes: [
        '❌ বিক্রয়ের পরে আপডেট করেননি',
        '❌ ভুল বিভাগ',
        '❌ ভুল দাম',
        '❌ ন্যূনতম স্টক সেট করা নেই'
      ],
      voiceScript: 'স্টকের জন্য: পণ্য খুঁজুন। বর্তমান স্টক নম্বর দেখুন। লাল মানে কম, অর্ডার করুন! বিক্রয়ের পরে নম্বর কমান। সঠিক রাখুন!'
    }
  },
  '/Procurement': {
    en: {
      title: '🛒 Order Creation',
      emoji: '📦',
      simplified: [
        {
          step: '1️⃣ Click "Create Order"',
          detail: 'Find the purple button at top.',
          icon: '🟣',
          color: 'bg-violet-100 border-violet-300'
        },
        {
          step: '2️⃣ Select Customer',
          detail: 'Choose existing or enter new customer.',
          icon: '👤',
          color: 'bg-blue-100 border-blue-300'
        },
        {
          step: '3️⃣ Add Products',
          detail: 'Select items, enter quantities.',
          icon: '📦',
          color: 'bg-green-100 border-green-300'
        },
        {
          step: '4️⃣ Confirm & Submit',
          detail: 'Check total, fill address, submit.',
          icon: '✅',
          color: 'bg-orange-100 border-orange-300'
        }
      ],
      commonMistakes: [
        '❌ No customer info',
        '❌ No products added',
        '❌ Wrong address',
        '❌ Forgot to confirm'
      ],
      voiceScript: 'For orders: Click Create Order. Choose customer. Add products with quantity. Fill address. Submit order. Done!'
    },
    bn: {
      title: '🛒 অর্ডার তৈরি',
      emoji: '📦',
      simplified: [
        {
          step: '1️⃣ "অর্ডার তৈরি" ক্লিক',
          detail: 'উপরে বেগুনি বাটন খুঁজুন।',
          icon: '🟣',
          color: 'bg-violet-100 border-violet-300'
        },
        {
          step: '2️⃣ গ্রাহক নির্বাচন করুন',
          detail: 'বিদ্যমান চয়ন করুন বা নতুন লিখুন।',
          icon: '👤',
          color: 'bg-blue-100 border-blue-300'
        },
        {
          step: '3️⃣ পণ্য যোগ করুন',
          detail: 'আইটেম নির্বাচন করুন, পরিমাণ লিখুন।',
          icon: '📦',
          color: 'bg-green-100 border-green-300'
        },
        {
          step: '4️⃣ নিশ্চিত ও জমা দিন',
          detail: 'মোট চেক করুন, ঠিকানা পূরণ করুন, জমা দিন।',
          icon: '✅',
          color: 'bg-orange-100 border-orange-300'
        }
      ],
      commonMistakes: [
        '❌ গ্রাহক তথ্য নেই',
        '❌ পণ্য যোগ করা হয়নি',
        '❌ ভুল ঠিকানা',
        '❌ নিশ্চিত করতে ভুলে গেছেন'
      ],
      voiceScript: 'অর্ডারের জন্য: অর্ডার তৈরি ক্লিক করুন। গ্রাহক চয়ন করুন। পরিমাণ সহ পণ্য যোগ করুন। ঠিকানা পূরণ করুন। অর্ডার জমা দিন। হয়ে গেছে!'
    }
  }
};

export default function SmartHelp({ currentPage, currentLanguage: propLanguage = 'en' }) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(propLanguage);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userDismissed, setUserDismissed] = useState(false);

  const pageHelp = PAGE_HELP_CONTENT[currentPage]?.[currentLanguage];

  // Sync with parent language
  useEffect(() => {
    setCurrentLanguage(propLanguage);
  }, [propLanguage]);

  // Translations
  const t = {
    en: {
      smartHelp: 'Smart Help',
      simplified: 'Simplified',
      commonMistakes: '⚠️ Common Mistakes to Avoid:',
      needMore: 'Need more help?',
      listen: 'Listen',
      askFeluda: 'Ask Feluda',
      wasHelpful: 'Was this guide helpful?',
      yes: 'Yes',
      no: 'No',
      dontShow: 'Don\'t show again',
      switchLang: 'বাংলা'
    },
    bn: {
      smartHelp: 'স্মার্ট হেল্প',
      simplified: 'সরলীকৃত',
      commonMistakes: '⚠️ এড়ানোর জন্য সাধারণ ভুল:',
      needMore: 'আরও সাহায্য দরকার?',
      listen: 'শুনুন',
      askFeluda: 'ফেলুদাকে জিজ্ঞাসা করুন',
      wasHelpful: 'এই গাইড কি সহায়ক ছিল?',
      yes: 'হ্যাঁ',
      no: 'না',
      dontShow: 'আর দেখাবেন না',
      switchLang: 'English'
    }
  };

  const text = t[currentLanguage];

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await erp.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  // Auto-show for non-technical or Bengali users
  useEffect(() => {
    if (!currentUser || !pageHelp) return;

    const isNonTechnical = ['employee', 'sales', 'admission'].includes(currentUser.job_role?.toLowerCase());
    const isBengaliSpeaker = currentLanguage === 'bn';
    const hasSeenHelp = localStorage.getItem(`smart_help_seen_${currentPage}_${currentUser.id}`);

    if ((isNonTechnical || isBengaliSpeaker) && !hasSeenHelp) {
      setTimeout(() => {
        setIsVisible(true);
        toast.info(currentLanguage === 'en' 
          ? '💡 Smart Help is here!'
          : '💡 স্মার্ট হেল্প এখানে!',
          { duration: 3000 }
        );
      }, 3000);

      localStorage.setItem(`smart_help_seen_${currentPage}_${currentUser.id}`, 'true');
    }
  }, [currentUser, pageHelp, currentPage, currentLanguage]);

  const handleVoiceHelp = () => {
    if (!pageHelp?.voiceScript) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      if (!isVoiceEnabled) {
        const utterance = new SpeechSynthesisUtterance(pageHelp.voiceScript);
        utterance.lang = currentLanguage === 'bn' ? 'bn-BD' : 'en-US';
        utterance.rate = 0.85;
        utterance.pitch = 1;
        
        utterance.onend = () => setIsVoiceEnabled(false);
        utterance.onerror = () => {
          setIsVoiceEnabled(false);
          toast.error(currentLanguage === 'en' 
            ? 'Voice not available on this device' 
            : 'এই ডিভাইসে ভয়েস নেই'
          );
        };

        window.speechSynthesis.speak(utterance);
        setIsVoiceEnabled(true);
        toast.info(currentLanguage === 'en' ? '🔊 Voice guide playing...' : '🔊 ভয়েস গাইড চলছে...');
      } else {
        window.speechSynthesis.cancel();
        setIsVoiceEnabled(false);
      }
    } else {
      toast.error(currentLanguage === 'en' 
        ? 'Voice not supported' 
        : 'ভয়েস সমর্থিত নয়'
      );
    }
  };

  const handleFeedback = async (helpful) => {
    try {
      await erp.entities.FeludaFeedback.create({
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        user_question: `Smart Help: ${currentPage}`,
        feluda_response: JSON.stringify(pageHelp.simplified),
        rating: helpful ? 'helpful' : 'not_helpful',
        page_context: currentPage,
        user_role: currentUser.job_role,
        language: currentLanguage,
        was_helpful: helpful
      });

      toast.success(helpful 
        ? (currentLanguage === 'en' ? '✅ Thank you!' : '✅ ধন্যবাদ!')
        : (currentLanguage === 'en' ? 'Feedback recorded!' : 'মতামত সংরক্ষিত!')
      );
    } catch (error) {
      console.error('Failed to save feedback:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(`help_dismissed_${currentPage}`, 'true');
    setUserDismissed(true);
  };

  if (!pageHelp) return null;

  return (
    <>
      {/* Floating button */}
      {!isVisible && !userDismissed && (
        <Button
          onClick={() => setIsVisible(true)}
          className="fixed bottom-24 right-6 z-40 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-2xl rounded-full w-14 h-14 p-0"
          title={currentLanguage === 'en' ? 'Smart Help' : 'স্মার্ট হেল্প'}
        >
          <Lightbulb className="w-6 h-6 animate-pulse" />
        </Button>
      )}

      {/* Help panel */}
      {isVisible && (
        <Card className="fixed bottom-24 right-6 z-40 w-96 max-w-[95vw] shadow-2xl border-2 border-blue-300 bg-white animate-in slide-in-from-bottom duration-300">
          <CardContent className="p-5 max-h-[550px] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-2xl">
                  {pageHelp.emoji}
                </div>
                <div>
                  <h3 className="font-bold text-base">{pageHelp.title}</h3>
                  <Badge className="bg-blue-100 text-blue-800 text-xs mt-1">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {text.simplified}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Language switcher */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-7 px-2"
                    >
                      <Globe className="w-3 h-3 mr-1" />
                      {currentLanguage === 'en' ? 'EN' : 'বাং'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setCurrentLanguage('en');
                      toast.success('🌐 Switched to English');
                    }}>
                      🇬🇧 English
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setCurrentLanguage('bn');
                      toast.success('🌐 বাংলায় পরিবর্তিত');
                    }}>
                      🇧🇩 বাংলা
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleDismiss}
                  className="h-7 w-7 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3 mb-4">
              {pageHelp.simplified.map((item, index) => (
                <div 
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 ${item.color} animate-in fade-in slide-in-from-left`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="text-3xl flex-shrink-0">{item.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-sm mb-1">{item.step}</p>
                    <p className="text-xs text-gray-700">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Common mistakes */}
            <div className="bg-red-50 p-3 rounded-lg border-2 border-red-200 mb-4">
              <p className="font-bold text-sm mb-2 text-red-800">
                {text.commonMistakes}
              </p>
              <div className="space-y-1">
                {pageHelp.commonMistakes.map((mistake, index) => (
                  <p key={index} className="text-xs text-red-700">{mistake}</p>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <div className="border-t pt-3">
                <p className="text-xs font-bold text-gray-600 mb-2">
                  {text.needMore}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleVoiceHelp}
                    className="text-xs"
                  >
                    {isVoiceEnabled ? (
                      <>
                        <VolumeX className="w-3 h-3 mr-1" />
                        {currentLanguage === 'en' ? 'Stop' : 'বন্ধ'}
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3 mr-1" />
                        {text.listen}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    <MessageCircle className="w-3 h-3 mr-1" />
                    {text.askFeluda}
                  </Button>
                </div>
              </div>

              {/* Feedback */}
              <div className="border-t pt-3">
                <p className="text-xs font-bold text-gray-600 mb-2">
                  {text.wasHelpful}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeedback(true)}
                    className="hover:bg-green-50 hover:border-green-500"
                  >
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    {text.yes}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeedback(false)}
                    className="hover:bg-red-50 hover:border-red-500"
                  >
                    <ThumbsDown className="w-3 h-3 mr-1" />
                    {text.no}
                  </Button>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="w-full text-xs text-muted-foreground"
              >
                {text.dontShow}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}