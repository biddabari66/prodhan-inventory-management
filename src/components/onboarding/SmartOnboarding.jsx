import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  ChevronRight, 
  Check, 
  Zap, 
  Target, 
  Award,
  X,
  Globe
} from 'lucide-react';
import { erp } from '@/api/erpClient';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

/**
 * 🎯 ENHANCED SMART ONBOARDING SYSTEM
 * - 2-step quick onboarding
 * - Shows only once per user
 * - Role-based personalization
 * - Bilingual support (English/Bengali)
 * - Single close button (Skip Tour)
 * - Auto-responsive design
 */

const translations = {
  en: {
    welcome: 'Welcome to Biddabari ERP! 🎉',
    subtitle: 'Let\'s get you started in 2 quick steps',
    step1_title: 'Choose Your Language',
    step1_desc: 'Select your preferred language for the system',
    step2_title: 'Your Role & Quick Tour',
    step2_desc: 'Here\'s what you can do based on your role',
    continue: 'Continue',
    complete: 'Start Using ERP',
    skip: 'Skip Tour',
    english: 'English',
    bengali: 'বাংলা (Bengali)',
    roleIntro: 'As a',
    youCan: 'you can:',
    getStarted: 'You\'re all set! Let\'s get started.',
    completing: 'Completing setup...'
  },
  bn: {
    welcome: 'বিদ্যাবাড়ি ERP-তে স্বাগতম! 🎉',
    subtitle: 'মাত্র ২টি ধাপে শুরু করুন',
    step1_title: 'আপনার ভাষা নির্বাচন করুন',
    step1_desc: 'সিস্টেমের জন্য পছন্দের ভাষা বেছে নিন',
    step2_title: 'আপনার ভূমিকা এবং দ্রুত ট্যুর',
    step2_desc: 'আপনার ভূমিকা অনুযায়ী আপনি কী করতে পারবেন',
    continue: 'চালিয়ে যান',
    complete: 'ERP ব্যবহার শুরু করুন',
    skip: 'ট্যুর এড়িয়ে যান',
    english: 'English',
    bengali: 'বাংলা (Bengali)',
    roleIntro: 'একজন',
    youCan: 'হিসাবে আপনি করতে পারবেন:',
    getStarted: 'সব প্রস্তুত! চলুন শুরু করি।',
    completing: 'সেটআপ সম্পন্ন করা হচ্ছে...'
  }
};

const ROLE_PERMISSIONS = {
  admin: {
    en: ['Manage all modules', 'Approve expenses', 'View reports', 'Manage employees', 'Full system access'],
    bn: ['সব মডিউল পরিচালনা', 'খরচ অনুমোদন', 'রিপোর্ট দেখুন', 'কর্মচারী পরিচালনা', 'সম্পূর্ণ সিস্টেম অ্যাক্সেস']
  },
  super_admin: {
    en: ['Complete system control', 'Financial data access', 'User permissions', 'System settings', 'All features unlocked'],
    bn: ['সম্পূর্ণ সিস্টেম নিয়ন্ত্রণ', 'আর্থিক তথ্য অ্যাক্সেস', 'ব্যবহারকারী অনুমতি', 'সিস্টেম সেটিংস', 'সব বৈশিষ্ট্য আনলক']
  },
  manager: {
    en: ['View team data', 'Approve expenses', 'Manage attendance', 'Track performance', 'Generate reports'],
    bn: ['টিম ডেটা দেখুন', 'খরচ অনুমোদন', 'উপস্থিতি পরিচালনা', 'কর্মক্ষমতা ট্র্যাক', 'রিপোর্ট তৈরি']
  },
  employee: {
    en: ['Mark attendance', 'Submit expenses', 'View tasks', 'Update profile', 'Track own performance'],
    bn: ['উপস্থিতি চিহ্নিত করুন', 'খরচ জমা দিন', 'কাজ দেখুন', 'প্রোফাইল আপডেট', 'নিজের কর্মক্ষমতা ট্র্যাক']
  }
};

export default function SmartOnboarding({ user, onComplete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isCompleting, setIsCompleting] = useState(false);
  const [onboardingData, setOnboardingData] = useState(null);

  const t = (key) => translations[selectedLanguage]?.[key] || translations.en[key];

  useEffect(() => {
    checkOnboardingStatus();
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user) return;

    try {
      const records = await erp.entities.UserOnboarding.filter({ user_id: user.id });
      
      if (records.length === 0) {
        // New user - show onboarding
        setIsOpen(true);
        setOnboardingData(null);
      } else {
        const record = records[0];
        setOnboardingData(record);
        
        if (!record.onboarding_completed && !record.skipped) {
          // User started but didn't complete
          setCurrentStep(record.current_step || 1);
          setSelectedLanguage(record.preferred_language || 'en');
          setIsOpen(true);
        }
        // If completed or skipped, don't show
      }
    } catch (error) {
      console.error('Error checking onboarding:', error);
    }
  };

  const handleLanguageSelect = async (lang) => {
    setSelectedLanguage(lang);
    
    // Save language preference
    try {
      if (onboardingData) {
        await erp.entities.UserOnboarding.update(onboardingData.id, {
          preferred_language: lang,
          current_step: 2,
          steps_completed: ['language_selected']
        });
      } else {
        const newRecord = await erp.entities.UserOnboarding.create({
          user_id: user.id,
          preferred_language: lang,
          current_step: 2,
          steps_completed: ['language_selected']
        });
        setOnboardingData(newRecord);
      }
      
      // Also update global language
      localStorage.setItem('biddabari_language', lang);
      
      setCurrentStep(2);
    } catch (error) {
      console.error('Error saving language:', error);
      setCurrentStep(2); // Continue anyway
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);

    try {
      if (onboardingData) {
        await erp.entities.UserOnboarding.update(onboardingData.id, {
          onboarding_completed: true,
          completed_date: new Date().toISOString(),
          current_step: 2,
          steps_completed: ['language_selected', 'role_tour_completed'],
          role_intro_shown: true
        });
      } else {
        await erp.entities.UserOnboarding.create({
          user_id: user.id,
          onboarding_completed: true,
          completed_date: new Date().toISOString(),
          preferred_language: selectedLanguage,
          current_step: 2,
          steps_completed: ['language_selected', 'role_tour_completed'],
          role_intro_shown: true
        });
      }

      // Celebration!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast.success('🎉 Welcome aboard! You\'re all set!');
      
      setIsOpen(false);
      if (onComplete) onComplete();
      
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to save onboarding. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSkip = async () => {
    try {
      if (onboardingData) {
        await erp.entities.UserOnboarding.update(onboardingData.id, {
          skipped: true,
          onboarding_completed: true,
          completed_date: new Date().toISOString()
        });
      } else {
        await erp.entities.UserOnboarding.create({
          user_id: user.id,
          skipped: true,
          onboarding_completed: true,
          completed_date: new Date().toISOString(),
          preferred_language: selectedLanguage
        });
      }

      setIsOpen(false);
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      setIsOpen(false);
    }
  };

  const userRole = user?.job_role || 'employee';
  const rolePermissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.employee;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="onboarding-dialog max-w-2xl w-[95vw] max-h-[90vh] p-0 overflow-y-auto border-0 bg-gradient-to-br from-violet-50 to-pink-50"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* 🔥 FIXED: Hide default Dialog close button */}
        <style>{`
          .onboarding-dialog > button[aria-label="Close"] {
            display: none !important;
          }
        `}</style>

        {/* Progress Bar */}
        <div className="relative sticky top-0 z-10 bg-gradient-to-br from-violet-50 to-pink-50">
          <Progress value={(currentStep / 2) * 100} className="h-2 rounded-none" />
        </div>

        <div className="p-4 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-violet-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gradient mb-2">
              {t('welcome')}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>

          {/* Step 1: Language Selection */}
          {currentStep === 1 && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom duration-300">
              <div className="text-center">
                <Globe className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-violet-500" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">{t('step1_title')}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('step1_desc')}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Card 
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 ${selectedLanguage === 'en' ? 'border-2 border-violet-500 bg-violet-50' : ''}`}
                  onClick={() => handleLanguageSelect('en')}
                >
                  <CardContent className="p-4 sm:p-6 text-center">
                    <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🇬🇧</div>
                    <h4 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">{translations.en.english}</h4>
                    <p className="text-xs text-muted-foreground">International</p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 ${selectedLanguage === 'bn' ? 'border-2 border-violet-500 bg-violet-50' : ''}`}
                  onClick={() => handleLanguageSelect('bn')}
                >
                  <CardContent className="p-4 sm:p-6 text-center">
                    <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🇧🇩</div>
                    <h4 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">{translations.bn.bengali}</h4>
                    <p className="text-xs text-muted-foreground">স্থানীয়</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 2: Role Introduction */}
          {currentStep === 2 && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom duration-300">
              <div className="text-center">
                <Award className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-violet-500" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">{t('step2_title')}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('step2_desc')}</p>
              </div>

              <Card className="bg-gradient-to-br from-violet-100 to-pink-100 border-2 border-violet-300">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-violet-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">{t('roleIntro')}</p>
                      <h4 className="text-base sm:text-xl font-bold text-violet-700 capitalize truncate">
                        {user?.designation || userRole?.replace('_', ' ')}
                      </h4>
                    </div>
                  </div>

                  <p className="font-semibold text-sm sm:text-base text-violet-800 mb-2 sm:mb-3">{t('youCan')}</p>
                  <div className="space-y-2">
                    {rolePermissions[selectedLanguage]?.map((permission, index) => (
                      <div 
                        key={index} 
                        className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-white/70 backdrop-blur-sm rounded-lg animate-in fade-in slide-in-from-left"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm text-gray-700">{permission}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-blue-800">
                    <p className="font-semibold mb-1">💡 {selectedLanguage === 'en' ? 'Pro Tip' : 'প্রো টিপ'}</p>
                    <p>
                      {selectedLanguage === 'en' 
                        ? 'Use the search bar (top) to quickly find anything. Click the AI assistant (bottom-right) for instant help!'
                        : 'যেকোনো কিছু দ্রুত খুঁজতে সার্চ বার (উপরে) ব্যবহার করুন। তাৎক্ষণিক সাহায্যের জন্য AI সহায়ক (নিচে-ডানে) ক্লিক করুন!'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center pt-2 sm:pt-4">
                <Button
                  onClick={handleComplete}
                  disabled={isCompleting}
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white px-8 sm:px-12 py-4 sm:py-6 text-base sm:text-lg rounded-xl shadow-lg w-full sm:w-auto"
                >
                  {isCompleting ? (
                    <>
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                      {t('completing')}
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      {t('complete')}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 sm:mt-3">
                  {t('getStarted')}
                </p>
              </div>
            </div>
          )}

          {/* Step Indicator */}
          <div className="flex justify-center gap-2 mt-6 sm:mt-8">
            {[1, 2].map((step) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  step === currentStep
                    ? 'bg-violet-600 w-8'
                    : step < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Fixed Skip Button - Bottom Right */}
          <div className="mt-6 sm:mt-8 flex justify-end">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSkip}
              className="text-xs text-muted-foreground hover:text-foreground hover:bg-white/50 gap-1"
            >
              {t('skip')}
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}