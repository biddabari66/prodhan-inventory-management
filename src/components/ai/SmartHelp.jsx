import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Volume2,
  VolumeX,
  MessageCircle,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * 💡 SMART HELP - ON-PAGE AI ASSISTANCE
 * Provides contextual help for low-IQ users and Bengali speakers
 * Works alongside Feluda chatbot for comprehensive support
 */

const PAGE_HELP_CONTENT = {
  '/Attendance': {
    en: {
      title: '📍 Attendance Help',
      simplified: [
        {
          step: '1️⃣ Enable Location',
          detail: 'Turn on GPS/Location on your phone. Without it, you cannot check in.',
          icon: '📱'
        },
        {
          step: '2️⃣ Come to Office',
          detail: 'You must be physically inside the office area. The system checks your location.',
          icon: '🏢'
        },
        {
          step: '3️⃣ Click "Check In"',
          detail: 'Press the big purple "Check In" button. Wait for confirmation message.',
          icon: '✅'
        },
        {
          step: '4️⃣ Check Out When Leaving',
          detail: 'Before going home, press "Check Out" button. This records your working hours.',
          icon: '🚪'
        }
      ],
      commonMistakes: [
        '❌ Location turned off - Cannot check in',
        '❌ Too far from office - Must be within 100 meters',
        '❌ Forgot to check out - Talk to your manager',
        '❌ Wrong time - Check system clock is correct'
      ],
      voiceScript: 'Hello! For attendance, first make sure your phone location is turned on. Then come to the office. Click the purple Check In button. When you leave, click Check Out. Simple!'
    },
    bn: {
      title: '📍 উপস্থিতি সাহায্য',
      simplified: [
        {
          step: '1️⃣ অবস্থান চালু করুন',
          detail: 'আপনার ফোনে GPS/অবস্থান চালু করুন। এটি ছাড়া আপনি চেক ইন করতে পারবেন না।',
          icon: '📱'
        },
        {
          step: '2️⃣ অফিসে আসুন',
          detail: 'আপনাকে শারীরিকভাবে অফিস এলাকার ভিতরে থাকতে হবে। সিস্টেম আপনার অবস্থান পরীক্ষা করে।',
          icon: '🏢'
        },
        {
          step: '3️⃣ "চেক ইন" ক্লিক করুন',
          detail: 'বড় বেগুনি "চেক ইন" বাটন টিপুন। নিশ্চিতকরণ বার্তার জন্য অপেক্ষা করুন।',
          icon: '✅'
        },
        {
          step: '4️⃣ চলে যাওয়ার সময় চেক আউট',
          detail: 'বাড়ি যাওয়ার আগে "চেক আউট" বাটন টিপুন। এটি আপনার কাজের ঘন্টা রেকর্ড করে।',
          icon: '🚪'
        }
      ],
      commonMistakes: [
        '❌ অবস্থান বন্ধ - চেক ইন করতে পারবেন না',
        '❌ অফিস থেকে অনেক দূরে - ১০০ মিটারের মধ্যে থাকতে হবে',
        '❌ চেক আউট করতে ভুলে গেছেন - আপনার ম্যানেজারের সাথে কথা বলুন',
        '❌ ভুল সময় - সিস্টেম ঘড়ি সঠিক কিনা পরীক্ষা করুন'
      ],
      voiceScript: 'হ্যালো! উপস্থিতির জন্য, প্রথমে নিশ্চিত করুন আপনার ফোনের অবস্থান চালু আছে। তারপর অফিসে আসুন। বেগুনি চেক ইন বাটনে ক্লিক করুন। যখন চলে যাবেন, চেক আউট ক্লিক করুন। সহজ!'
    }
  },
  '/Expenses': {
    en: {
      title: '💰 Expense Submission Help',
      simplified: [
        {
          step: '1️⃣ Click "Submit Expense"',
          detail: 'Find and click the green "Submit Expense" button at the top.',
          icon: '🟢'
        },
        {
          step: '2️⃣ Fill the Form',
          detail: 'Enter what you spent money on, how much (৳), date, and category (like "tea", "paper", etc.)',
          icon: '📝'
        },
        {
          step: '3️⃣ Upload Receipt Photo',
          detail: 'Take a photo of your bill/receipt and upload it. This is VERY important!',
          icon: '📸'
        },
        {
          step: '4️⃣ Submit & Wait',
          detail: 'Click submit. Your manager will check and approve. You will get notification.',
          icon: '⏳'
        }
      ],
      commonMistakes: [
        '❌ No receipt attached - Will be rejected',
        '❌ Wrong date - Put the actual date you spent',
        '❌ Wrong category - Choose from dropdown carefully',
        '❌ Forgot to submit - Must click final Submit button'
      ],
      voiceScript: 'For expenses: Click Submit Expense button. Fill what you bought, how much money, and date. Upload bill photo - this is must! Then submit. Manager will approve.'
    },
    bn: {
      title: '💰 খরচ জমা সাহায্য',
      simplified: [
        {
          step: '1️⃣ "খরচ জমা দিন" ক্লিক করুন',
          detail: 'উপরে সবুজ "খরচ জমা দিন" বাটন খুঁজুন এবং ক্লিক করুন।',
          icon: '🟢'
        },
        {
          step: '2️⃣ ফর্ম পূরণ করুন',
          detail: 'আপনি কিসে টাকা খরচ করেছেন, কত (৳), তারিখ এবং বিভাগ লিখুন (যেমন "চা", "কাগজ" ইত্যাদি)',
          icon: '📝'
        },
        {
          step: '3️⃣ রসিদ ছবি আপলোড করুন',
          detail: 'আপনার বিল/রসিদের ছবি তুলুন এবং আপলোড করুন। এটি অত্যন্ত গুরুত্বপূর্ণ!',
          icon: '📸'
        },
        {
          step: '4️⃣ জমা দিন এবং অপেক্ষা করুন',
          detail: 'জমা ক্লিক করুন। আপনার ম্যানেজার পরীক্ষা করে অনুমোদন করবেন। আপনি বিজ্ঞপ্তি পাবেন।',
          icon: '⏳'
        }
      ],
      commonMistakes: [
        '❌ কোন রসিদ সংযুক্ত নেই - প্রত্যাখ্যান করা হবে',
        '❌ ভুল তারিখ - আপনি যে তারিখে খরচ করেছেন সেটি দিন',
        '❌ ভুল বিভাগ - ড্রপডাউন থেকে সাবধানে চয়ন করুন',
        '❌ জমা দিতে ভুলে গেছেন - অবশ্যই চূড়ান্ত জমা বাটনে ক্লিক করুন'
      ],
      voiceScript: 'খরচের জন্য: খরচ জমা দিন বাটন ক্লিক করুন। আপনি কি কিনেছেন, কত টাকা এবং তারিখ পূরণ করুন। বিল ফটো আপলোড করুন - এটি অবশ্যই! তারপর জমা দিন। ম্যানেজার অনুমোদন করবেন।'
    }
  },
  '/Inventory': {
    en: {
      title: '📦 Inventory Help',
      simplified: [
        {
          step: '1️⃣ Find Your Product',
          detail: 'Use search box at top. Type product name, like "BCS book" or "pen".',
          icon: '🔍'
        },
        {
          step: '2️⃣ Check Stock Number',
          detail: 'Look at "Current Stock" column. This shows how many items you have.',
          icon: '📊'
        },
        {
          step: '3️⃣ Red Badge = Urgent',
          detail: 'If you see red color, stock is LOW. Need to order more soon!',
          icon: '🔴'
        },
        {
          step: '4️⃣ Add New Item',
          detail: 'Click "Add Item" button. Fill name, quantity, price. Click save.',
          icon: '➕'
        }
      ],
      commonMistakes: [
        '❌ Forgot to update stock after sale',
        '❌ Wrong department selected',
        '❌ Price not entered correctly',
        '❌ Minimum stock not set - Set it to avoid running out!'
      ],
      voiceScript: 'For inventory: Search your product at top. Check Current Stock number - this is how many you have. Red color means low, order more! To add new item, click Add Item, fill details, save.'
    },
    bn: {
      title: '📦 ইনভেন্টরি সাহায্য',
      simplified: [
        {
          step: '1️⃣ আপনার পণ্য খুঁজুন',
          detail: 'উপরে সার্চ বক্স ব্যবহার করুন। পণ্যের নাম টাইপ করুন, যেমন "BCS বই" বা "কলম"।',
          icon: '🔍'
        },
        {
          step: '2️⃣ স্টক নম্বর দেখুন',
          detail: '"বর্তমান স্টক" কলাম দেখুন। এটি দেখায় আপনার কতগুলি আইটেম আছে।',
          icon: '📊'
        },
        {
          step: '3️⃣ লাল ব্যাজ = জরুরি',
          detail: 'যদি আপনি লাল রঙ দেখেন, স্টক কম। শীঘ্রই আরও অর্ডার করতে হবে!',
          icon: '🔴'
        },
        {
          step: '4️⃣ নতুন আইটেম যোগ করুন',
          detail: '"আইটেম যোগ করুন" বাটন ক্লিক করুন। নাম, পরিমাণ, দাম পূরণ করুন। সংরক্ষণ ক্লিক করুন।',
          icon: '➕'
        }
      ],
      commonMistakes: [
        '❌ বিক্রয়ের পরে স্টক আপডেট করতে ভুলে গেছেন',
        '❌ ভুল বিভাগ নির্বাচন করা হয়েছে',
        '❌ দাম সঠিকভাবে প্রবেশ করা হয়নি',
        '❌ ন্যূনতম স্টক সেট করা হয়নি - শেষ হওয়া এড়াতে এটি সেট করুন!'
      ],
      voiceScript: 'ইনভেন্টরির জন্য: উপরে আপনার পণ্য খুঁজুন। বর্তমান স্টক নম্বর দেখুন - এটি আপনার কতগুলি আছে। লাল রঙ মানে কম, আরও অর্ডার করুন! নতুন আইটেম যোগ করতে, আইটেম যোগ করুন ক্লিক করুন, বিবরণ পূরণ করুন, সংরক্ষণ করুন।'
    }
  },
  '/Dashboard': {
    en: {
      title: '📊 Dashboard Help',
      simplified: [
        {
          step: '1️⃣ KPI Cards = Quick Numbers',
          detail: 'Each colorful card shows important business numbers. Green = good, Red = needs attention.',
          icon: '💳'
        },
        {
          step: '2️⃣ Charts Show Trends',
          detail: 'Lines going UP = business growing. Lines going DOWN = need to improve.',
          icon: '📈'
        },
        {
          step: '3️⃣ Click Cards for Details',
          detail: 'Click any card to see more information. Helps you understand better.',
          icon: '👆'
        },
        {
          step: '4️⃣ Quick Actions',
          detail: 'Bottom buttons let you quickly do common tasks like add admission or income.',
          icon: '⚡'
        }
      ],
      commonMistakes: [
        '❌ Don\'t understand numbers - Ask your manager',
        '❌ Charts confusing - Look at colors: green=good, red=bad',
        '❌ Too much information - Focus on your department only'
      ],
      voiceScript: 'Dashboard shows your business health. Each colorful card is one important number. Green is good, red needs fix. Charts show if business is going up or down. Click cards to learn more.'
    },
    bn: {
      title: '📊 ড্যাশবোর্ড সাহায্য',
      simplified: [
        {
          step: '1️⃣ KPI কার্ড = দ্রুত সংখ্যা',
          detail: 'প্রতিটি রঙিন কার্ড গুরুত্বপূর্ণ ব্যবসায়িক সংখ্যা দেখায়। সবুজ = ভালো, লাল = মনোযোগ প্রয়োজন।',
          icon: '💳'
        },
        {
          step: '2️⃣ চার্ট প্রবণতা দেখায়',
          detail: 'লাইন উপরে যাচ্ছে = ব্যবসা বাড়ছে। লাইন নিচে যাচ্ছে = উন্নতি করতে হবে।',
          icon: '📈'
        },
        {
          step: '3️⃣ বিস্তারিতের জন্য কার্ড ক্লিক করুন',
          detail: 'আরও তথ্য দেখতে যেকোনো কার্ডে ক্লিক করুন। আপনাকে ভালোভাবে বুঝতে সাহায্য করে।',
          icon: '👆'
        },
        {
          step: '4️⃣ দ্রুত ক্রিয়া',
          detail: 'নিচের বাটনগুলি আপনাকে দ্রুত সাধারণ কাজ করতে দেয় যেমন ভর্তি বা আয় যোগ করা।',
          icon: '⚡'
        }
      ],
      commonMistakes: [
        '❌ সংখ্যা বুঝছেন না - আপনার ম্যানেজারকে জিজ্ঞাসা করুন',
        '❌ চার্ট বিভ্রান্তিকর - রঙ দেখুন: সবুজ=ভালো, লাল=খারাপ',
        '❌ অনেক তথ্য - শুধুমাত্র আপনার বিভাগে ফোকাস করুন'
      ],
      voiceScript: 'ড্যাশবোর্ড আপনার ব্যবসার স্বাস্থ্য দেখায়। প্রতিটি রঙিন কার্ড একটি গুরুত্বপূর্ণ সংখ্যা। সবুজ ভালো, লাল ঠিক করতে হবে। চার্ট দেখায় ব্যবসা উপরে বা নিচে যাচ্ছে। আরও জানতে কার্ডে ক্লিক করুন।'
    }
  },
  '/Inventory': {
    en: {
      title: '📦 Stock Management Help',
      simplified: [
        {
          step: '1️⃣ Search Your Item',
          detail: 'Type product name in search box. Like "BCS Book" or "Pen".',
          icon: '🔍'
        },
        {
          step: '2️⃣ Look at Stock Number',
          detail: 'See "Current Stock" - this is how many you have now.',
          icon: '🔢'
        },
        {
          step: '3️⃣ Red = Need to Order',
          detail: 'Red badge means running out! Tell manager to order more.',
          icon: '🔴'
        },
        {
          step: '4️⃣ Update After Sale',
          detail: 'When you sell, reduce the stock number. Keep it accurate!',
          icon: '📉'
        }
      ],
      commonMistakes: [
        '❌ Didn\'t update after selling - Stock shows wrong',
        '❌ Ordered but didn\'t add to system',
        '❌ Wrong department - Boibari for books, Prodhan for other items'
      ],
      voiceScript: 'For stock: Search product name. Check Current Stock number - how many you have. Red color means low, need more! After selling, reduce the number. Keep accurate!'
    },
    bn: {
      title: '📦 স্টক ব্যবস্থাপনা সাহায্য',
      simplified: [
        {
          step: '1️⃣ আপনার আইটেম খুঁজুন',
          detail: 'সার্চ বক্সে পণ্যের নাম টাইপ করুন। যেমন "BCS বই" বা "কলম"।',
          icon: '🔍'
        },
        {
          step: '2️⃣ স্টক নম্বর দেখুন',
          detail: '"বর্তমান স্টক" দেখুন - এটি আপনার এখন কতগুলি আছে।',
          icon: '🔢'
        },
        {
          step: '3️⃣ লাল = অর্ডার করতে হবে',
          detail: 'লাল ব্যাজ মানে শেষ হয়ে যাচ্ছে! ম্যানেজারকে আরও অর্ডার করতে বলুন।',
          icon: '🔴'
        },
        {
          step: '4️⃣ বিক্রয়ের পরে আপডেট করুন',
          detail: 'যখন আপনি বিক্রি করেন, স্টক নম্বর কমান। এটি সঠিক রাখুন!',
          icon: '📉'
        }
      ],
      commonMistakes: [
        '❌ বিক্রয়ের পরে আপডেট করেননি - স্টক ভুল দেখায়',
        '❌ অর্ডার করেছেন কিন্তু সিস্টেমে যোগ করেননি',
        '❌ ভুল বিভাগ - বইয়ের জন্য বইবাড়ি, অন্যান্য আইটেমের জন্য প্রধান'
      ],
      voiceScript: 'স্টকের জন্য: পণ্যের নাম খুঁজুন। বর্তমান স্টক নম্বর দেখুন - আপনার কতগুলি আছে। লাল রঙ মানে কম, আরও দরকার! বিক্রয়ের পরে, নম্বর কমান। সঠিক রাখুন!'
    }
  }
};

export default function SmartHelp({ currentPage, currentLanguage = 'en' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const pageHelp = PAGE_HELP_CONTENT[currentPage]?.[currentLanguage];

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  // Auto-show for non-technical users or Bengali speakers
  useEffect(() => {
    if (!currentUser || !pageHelp) return;

    const isNonTechnical = ['employee', 'sales', 'admission'].includes(currentUser.job_role?.toLowerCase());
    const isBengaliSpeaker = currentLanguage === 'bn';
    const hasSeenHelp = localStorage.getItem(`smart_help_seen_${currentPage}_${currentUser.id}`);

    if ((isNonTechnical || isBengaliSpeaker) && !hasSeenHelp) {
      setTimeout(() => {
        setIsOpen(true);
        toast.info(currentLanguage === 'en' 
          ? '💡 Smart Help is here to guide you!'
          : '💡 স্মার্ট হেল্প আপনাকে গাইড করতে এখানে!',
          { duration: 3000 }
        );
      }, 3000);

      localStorage.setItem(`smart_help_seen_${currentPage}_${currentUser.id}`, 'true');
    }
  }, [currentUser, pageHelp, currentPage, currentLanguage]);

  const handleVoiceHelp = () => {
    if (!pageHelp?.voiceScript) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any ongoing speech

      if (!isVoiceEnabled) {
        const utterance = new SpeechSynthesisUtterance(pageHelp.voiceScript);
        utterance.lang = currentLanguage === 'bn' ? 'bn-BD' : 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        
        utterance.onend = () => setIsVoiceEnabled(false);
        utterance.onerror = () => {
          setIsVoiceEnabled(false);
          toast.error('Voice help not available on this device');
        };

        window.speechSynthesis.speak(utterance);
        setIsVoiceEnabled(true);
      } else {
        window.speechSynthesis.cancel();
        setIsVoiceEnabled(false);
      }
    } else {
      toast.error('Voice help not supported on this browser');
    }
  };

  const handleFeedback = async (helpful) => {
    try {
      await base44.entities.FeludaFeedback.create({
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        user_question: `Smart Help for ${currentPage}`,
        feluda_response: JSON.stringify(pageHelp.simplified),
        rating: helpful ? 'helpful' : 'not_helpful',
        page_context: currentPage,
        user_role: currentUser.job_role,
        language: currentLanguage,
        was_helpful: helpful
      });

      toast.success(helpful 
        ? (currentLanguage === 'en' ? '✅ Thank you for the feedback!' : '✅ প্রতিক্রিয়ার জন্য ধন্যবাদ!')
        : (currentLanguage === 'en' ? 'Feedback recorded!' : 'প্রতিক্রিয়া রেকর্ড করা হয়েছে!')
      );
    } catch (error) {
      console.error('Failed to save help feedback:', error);
    }
  };

  if (!pageHelp) return null;

  return (
    <>
      {/* Floating Help Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-6 z-40 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-xl rounded-full w-14 h-14 p-0"
          title={currentLanguage === 'en' ? 'Smart Help' : 'স্মার্ট হেল্প'}
        >
          <Lightbulb className="w-6 h-6" />
        </Button>
      )}

      {/* Help Panel */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-40 w-96 max-w-[95vw] shadow-2xl border-2 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              <CardTitle className="text-base font-semibold">
                {currentLanguage === 'en' ? 'Smart Help' : 'স্মার্ট হেল্প'}
              </CardTitle>
              <Badge className="bg-white/20 text-white text-xs">
                {currentLanguage === 'en' ? 'Simplified' : 'সরলীকৃত'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVoiceHelp}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
                title={currentLanguage === 'en' ? 'Voice Help' : 'ভয়েস হেল্প'}
              >
                {isVoiceEnabled ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
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

          {isExpanded && (
            <CardContent className="p-4 max-h-[500px] overflow-y-auto space-y-4">
              <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                {pageHelp.title}
              </h3>

              {/* Step-by-step instructions */}
              <div className="space-y-3">
                {pageHelp.simplified.map((item, index) => (
                  <div key={index} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm mb-1">{item.step}</p>
                        <p className="text-xs text-gray-700">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Common mistakes */}
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <p className="font-semibold text-sm mb-2 text-red-800">
                  {currentLanguage === 'en' ? '⚠️ Common Mistakes to Avoid:' : '⚠️ এড়ানোর জন্য সাধারণ ভুল:'}
                </p>
                <div className="space-y-1">
                  {pageHelp.commonMistakes.map((mistake, index) => (
                    <p key={index} className="text-xs text-red-700">{mistake}</p>
                  ))}
                </div>
              </div>

              {/* Help options */}
              <div className="border-t pt-3 space-y-2">
                <p className="text-xs font-semibold text-gray-600">
                  {currentLanguage === 'en' ? 'Need more help?' : 'আরও সাহায্য দরকার?'}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={handleVoiceHelp}
                  >
                    <Volume2 className="w-3 h-3 mr-1" />
                    {currentLanguage === 'en' ? 'Listen' : 'শুনুন'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      // This would open Feluda chatbot
                      toast.info(currentLanguage === 'en' 
                        ? '💬 Ask Feluda for detailed help!'
                        : '💬 বিস্তারিত সাহায্যের জন্য ফেলুদাকে জিজ্ঞাসা করুন!'
                      );
                    }}
                  >
                    <MessageCircle className="w-3 h-3 mr-1" />
                    {currentLanguage === 'en' ? 'Ask Feluda' : 'ফেলুদাকে জিজ্ঞাসা করুন'}
                  </Button>
                </div>
              </div>

              {/* Feedback */}
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  {currentLanguage === 'en' ? 'Was this guide helpful?' : 'এই গাইড কি সহায়ক ছিল?'}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeedback(true)}
                    className="flex-1 hover:bg-green-50 hover:border-green-500"
                  >
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    {currentLanguage === 'en' ? 'Yes' : 'হ্যাঁ'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeedback(false)}
                    className="flex-1 hover:bg-red-50 hover:border-red-500"
                  >
                    <ThumbsDown className="w-3 h-3 mr-1" />
                    {currentLanguage === 'en' ? 'No' : 'না'}
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