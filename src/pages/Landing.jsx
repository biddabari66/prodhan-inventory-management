import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Boxes,
  Users,
  Fingerprint,
  Wallet,
  Calculator,
  ScanLine,
  Webhook,
  Sparkles,
  Building2,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Star,
  Menu,
  Zap,
  ShieldCheck,
  Globe,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Reveal from '@/components/landing/Reveal';

const features = [
  {
    icon: Boxes,
    title: 'Smart Inventory',
    desc: 'Real-time stock across warehouses, low-stock alerts, batch & expiry tracking, and instant reconciliation.',
  },
  {
    icon: Users,
    title: 'CRM + Excel Import',
    desc: 'Manage leads & customers and bulk-import your existing contacts from Excel in a single click.',
  },
  {
    icon: Fingerprint,
    title: 'HR & Biometric Attendance',
    desc: 'Biometric & device check-ins, shift management, leave tracking and a self-service portal for staff.',
  },
  {
    icon: Wallet,
    title: 'Payroll',
    desc: 'Auto-calculate salaries, overtime, bonuses & deductions. Generate payslips that fit Bangladeshi rules.',
  },
  {
    icon: Calculator,
    title: 'Accounting & Requisitions',
    desc: 'Expenses, approvals, purchase orders and requisitions with full audit trails and ledgers.',
  },
  {
    icon: ScanLine,
    title: 'Barcode Ship / Receive',
    desc: 'Scan to receive stock and ship orders. Cut human error with barcode & QR-driven logistics.',
  },
  {
    icon: Webhook,
    title: 'Automation & Webhooks',
    desc: 'Connect Facebook leads, WhatsApp and third-party apps. Trigger workflows automatically.',
  },
  {
    icon: Sparkles,
    title: 'AI Insights',
    desc: 'Demand forecasting, anomaly detection and smart recommendations powered by AI.',
  },
  {
    icon: Building2,
    title: 'Multi-Department',
    desc: 'Granular roles & permissions so every department sees exactly what it should — nothing more.',
  },
  {
    icon: BarChart3,
    title: 'Reports & Dashboards',
    desc: 'Beautiful KPI dashboards, scheduled reports and one-click exports for owners and managers.',
  },
];

const steps = [
  {
    n: '01',
    title: 'Sign up free in minutes',
    desc: 'Create your ZYPRA ERP workspace, add your team and import data from Excel — no credit card needed.',
  },
  {
    n: '02',
    title: 'Connect your operations',
    desc: 'Set up inventory, attendance devices, payroll rules and link bKash, Facebook & WhatsApp.',
  },
  {
    n: '03',
    title: 'Run & grow on autopilot',
    desc: 'Watch live dashboards, automate routine work and let AI surface what needs your attention.',
  },
];

const testimonials = [
  {
    quote:
      'ZYPRA ERP replaced four different tools for us. Our stock counts finally match reality and payroll takes minutes, not days.',
    name: 'Rafiqul Islam',
    role: 'Owner, Dhaka Retail Group',
  },
  {
    quote:
      'The biometric attendance and bKash payouts are a game changer. My accountant actually enjoys month-end now.',
    name: 'Nusrat Jahan',
    role: 'GM, Chattogram Garments',
  },
  {
    quote:
      'Importing our customers from Excel and getting AI demand forecasts in the same week felt like magic.',
    name: 'Tanvir Ahmed',
    role: 'Founder, Sylhet Wholesale',
  },
];

const tiers = [
  {
    name: 'Free',
    price: '৳0',
    period: '/month',
    tagline: 'For solo founders getting started',
    features: ['Up to 2 users', 'Inventory & basic CRM', '1 warehouse', 'Community support'],
    cta: 'Start Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '৳2,500',
    period: '/month',
    tagline: 'For growing SMEs that need it all',
    features: [
      'Up to 25 users',
      'All modules incl. Payroll & HR',
      'Biometric attendance',
      'AI insights & automation',
      'bKash payouts & priority support',
    ],
    cta: 'Get Started',
    highlight: true,
  },
  {
    name: 'Business',
    price: '৳7,500',
    period: '/month',
    tagline: 'For multi-branch enterprises',
    features: [
      'Unlimited users',
      'Multi-department & branches',
      'Advanced permissions & audit',
      'Custom webhooks & integrations',
      'Dedicated account manager',
    ],
    cta: 'Get Started',
    highlight: false,
  },
];

const faqs = [
  {
    q: 'Is ZYPRA ERP built for Bangladeshi businesses?',
    a: 'Yes. ZYPRA ERP supports BDT (৳), bKash payouts, Bangla-friendly workflows and payroll rules designed for SMEs across Bangladesh.',
  },
  {
    q: 'Can I pay with bKash?',
    a: 'Absolutely. You can subscribe and make payouts using bKash, along with bank transfer and card options.',
  },
  {
    q: 'Do I need technical skills to set it up?',
    a: 'No. Most teams are up and running the same day. Import your data from Excel and our guided setup handles the rest.',
  },
  {
    q: 'Does it work with biometric attendance devices?',
    a: 'Yes. ZYPRA ERP connects to popular biometric devices and also supports mobile and web check-ins for remote staff.',
  },
  {
    q: 'Is my data secure?',
    a: 'Your data is encrypted in transit and at rest, with role-based permissions and full audit trails on every action.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30">
              <Zap className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">ZYPRA ERP</span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">Features</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">Pricing</a>
            <a href="#faq" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">FAQ</a>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/Auth">Sign In</Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/30 hover:from-amber-600 hover:to-orange-600">
              <Link to="/Auth">Get Started</Link>
            </Button>
            <button className="md:hidden text-slate-600" aria-label="Menu">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section id="top" className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-amber-200 via-orange-100 to-rose-100 blur-3xl opacity-70" />
          <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-emerald-100 blur-3xl opacity-60" />
        </div>

        <div className="mx-auto max-w-7xl px-4 pt-20 pb-16 text-center sm:px-6 lg:px-8 lg:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700"
          >
            <span className="flex h-2 w-2 rounded-full bg-amber-500" />
            Made in Bangladesh, for Bangladeshi SMEs
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
          >
            Run your entire business from{' '}
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              one smart hive
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-slate-600"
          >
            Inventory, CRM, HR & biometric attendance, payroll, accounting and automation —
            all in one suite. Pay with <span className="font-semibold text-pink-600">bKash</span>,
            built Bangla-friendly for teams of every size.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="h-12 px-8 text-base bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/30 hover:from-amber-600 hover:to-orange-600">
              <Link to="/Auth">
                Get Started Free <ArrowRight className="ml-1 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
              <Link to="/Auth">Sign In</Link>
            </Button>
          </motion.div>

          <p className="mt-4 text-sm text-slate-500">No credit card required · Free forever plan · bKash accepted</p>

          {/* Hero visual / dashboard mock */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mx-auto mt-14 max-w-5xl"
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-300/40">
              <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-5 sm:p-8">
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: 'Monthly Revenue', value: '৳ 12,84,500', icon: Wallet, tint: 'from-emerald-400 to-green-500' },
                    { label: 'Items in Stock', value: '8,412', icon: Boxes, tint: 'from-amber-400 to-orange-500' },
                    { label: 'Staff Present Today', value: '142 / 150', icon: Fingerprint, tint: 'from-sky-400 to-indigo-500' },
                  ].map((c) => (
                    <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">{c.label}</span>
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${c.tint} text-white`}>
                          <c.icon className="h-4 w-4" />
                        </span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{c.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
                  {[40, 65, 50, 80, 60, 92, 70, 100, 78, 88].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-amber-300 to-orange-500"
                      style={{ height: `${h}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            { icon: Globe, stat: '1,200+', label: 'Businesses onboarded' },
            { icon: ShieldCheck, stat: '99.9%', label: 'Uptime guarantee' },
            { icon: Zap, stat: '8+', label: 'Modules, one login' },
            { icon: Star, stat: '4.9/5', label: 'Average rating' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xl font-bold">{s.stat}</p>
                <p className="text-sm text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-500">Everything you need</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            One platform. Every part of your business.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Stop juggling spreadsheets and disconnected apps. ZYPRA ERP brings your whole operation under one roof.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.08}>
              <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-100">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/20 transition-transform group-hover:scale-110">
                  <f.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-orange-500">How it works</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Live in 3 simple steps</h2>
          </Reveal>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <div className="relative h-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                  <span className="text-5xl font-extrabold text-amber-200">{s.n}</span>
                  <h3 className="mt-3 text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-slate-600">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-500">Pricing</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Simple, transparent BDT pricing</h2>
          <p className="mt-4 text-lg text-slate-600">
            Start free, upgrade when you grow. Pay easily with <span className="font-semibold text-pink-600">bKash</span>, bank transfer or card.
          </p>
        </Reveal>

        <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
          {tiers.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <div
                className={`relative flex h-full flex-col rounded-2xl border p-8 ${
                  t.highlight
                    ? 'border-orange-300 bg-gradient-to-b from-amber-50 to-white shadow-2xl shadow-orange-200/60 lg:scale-[1.04]'
                    : 'border-slate-200 bg-white shadow-sm'
                }`}
              >
                {t.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1 text-xs font-bold text-white shadow">
                    MOST POPULAR
                  </span>
                )}
                <h3 className="text-lg font-bold">{t.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{t.tagline}</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="text-4xl font-extrabold">{t.price}</span>
                  <span className="mb-1 text-slate-500">{t.period}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {t.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  size="lg"
                  className={`mt-8 w-full ${
                    t.highlight
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                      : ''
                  }`}
                  variant={t.highlight ? 'default' : 'outline'}
                >
                  <Link to="/Auth">{t.cta}</Link>
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">
          All plans include free updates. Pay monthly via bKash — cancel anytime.
        </p>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-400">Loved by SMEs</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Trusted across Bangladesh</h2>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.1}>
                <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur">
                  <div className="flex gap-1 text-amber-400">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Star key={k} className="h-4 w-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="mt-4 flex-1 text-slate-200">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-6">
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-sm text-slate-400">{t.role}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Reveal className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-500">FAQ</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Frequently asked questions</h2>
        </Reveal>

        <Reveal className="mt-10">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-slate-600">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-8 py-16 text-center text-white shadow-2xl shadow-orange-300/40">
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold sm:text-4xl">
              Ready to run your business smarter?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
              Join 1,200+ Bangladeshi businesses growing with ZYPRA ERP. Start free today — no card needed.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 bg-white px-8 text-base font-semibold text-orange-600 hover:bg-slate-100">
                <Link to="/Auth">Get Started Free</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 border-white/60 bg-transparent px-8 text-base text-white hover:bg-white/10">
                <Link to="/Auth">Sign In</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                  <Zap className="h-5 w-5" />
                </span>
                <span className="text-lg font-extrabold">ZYPRA ERP</span>
              </div>
              <p className="mt-4 max-w-xs text-sm text-slate-600">
                The all-in-one business suite built for Bangladeshi SMEs. Inventory, HR, payroll, accounting & more — in one hive.
              </p>
            </div>

            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Integrations', 'AI Insights'] },
              { title: 'Company', links: ['About', 'Careers', 'Blog', 'Contact'] },
              { title: 'Support', links: ['Help Center', 'Documentation', 'bKash Billing', 'Status'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold text-slate-900">{col.title}</h4>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-sm text-slate-600 transition hover:text-orange-600">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row">
            <p className="text-sm text-slate-500">© 2026 ZYPRA ERP. All rights reserved.</p>
            <p className="text-sm text-slate-500">Made with care in Bangladesh 🇧🇩 · Pay with bKash</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
