// Transparent client-side lead scoring (0-100).
// source weight + value tier + contact recency + priority.
import { differenceInDays } from 'date-fns';

const SOURCE_WEIGHTS = {
  REFERRAL: 25,
  WHATSAPP: 20,
  PHONE: 20,
  FACEBOOK: 15,
  INSTAGRAM: 15,
  GOOGLE_ADS: 15,
  WEBSITE: 10,
  WALK_IN: 15,
};

const PRIORITY_WEIGHTS = { URGENT: 20, HIGH: 12, MEDIUM: 6, LOW: 0 };

export function scoreLead(lead) {
  let score = 0;
  score += SOURCE_WEIGHTS[lead.lead_source] || 5;

  const value = Number(lead.value) || 0;
  if (value > 5000) score += 25;
  else if (value > 2000) score += 15;
  else if (value > 0) score += 8;

  if (lead.last_contact_date) {
    const days = differenceInDays(new Date(), new Date(lead.last_contact_date));
    if (days <= 3) score += 20;
    else if (days <= 7) score += 10;
  }

  score += PRIORITY_WEIGHTS[lead.priority] || 0;

  return Math.min(100, Math.max(0, score));
}

export function scoreTier(score) {
  if (score >= 70) return { label: 'Hot', badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200' };
  if (score >= 40) return { label: 'Warm', badge: 'bg-amber-100 text-amber-700 border border-amber-200' };
  return { label: 'Cold', badge: 'bg-slate-100 text-slate-600 border border-slate-200' };
}
