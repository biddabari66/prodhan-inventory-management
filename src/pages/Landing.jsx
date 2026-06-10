import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
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
  Zap,
  ShieldCheck,
  Globe,
  TrendingUp,
  Send,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Reveal from '@/components/landing/Reveal';
import AuroraBackground from '@/components/landing/AuroraBackground';
import CountUp from '@/components/landing/CountUp';
import FeatureCard from '@/components/landing/FeatureCard';
import Marquee from '@/components/landing/Marquee';
import ScrollProgress from '@/components/landing/ScrollProgress';
import ProductMock from '@/components/landing/ProductMock';
import BillingToggle from '@/components/landing/BillingToggle';
import TestimonialCarousel from '@/components/landing/TestimonialCarousel';

const features = [
  { icon: Boxes, title: 'Smart Inventory', desc: 'Real-time stock across warehouses, low-stock alerts, batch & expiry tracking, and instant reconciliation.' },
  { icon: Users, title: 'CRM + Excel Import', desc: 'Manage leads & customers and bulk-import your existing contacts from Excel in a single click.' },
  { icon: Fingerprint, title: 'HR & Biometric Attendance', desc: 'Biometric & device check-ins, shift management, leave tracking and a self-service portal for staff.' },
  { icon: Wallet, title: 'Payroll', desc: 'Auto-calculate salaries, overtime, bonuses & deductions. Generate payslips that fit Bangladeshi rules.' },
  { icon: Calculator, title: 'Accounting & Requisitions', desc: 'Expenses, approvals, purchase orders and requisitions with full audit trails and ledgers.' },
  { icon: ScanLine, title: 'Barcode Ship / Receive', desc: 'Scan to receive stock and ship orders. Cut human error with barcode & QR-driven logistics.' },
  { icon: Webhook, title: 'Automation & Webhooks', desc: 'Connect Facebook leads, WhatsApp and third-party apps. Trigger workflows automatically.' },
  { icon: Sparkles, title: 'AI Copilot', desc: 'Demand forecasting, anomaly detection and a chat copilot that answers questions across your data.' },
  { icon: Building2, title: 'Multi-Department', desc: 'Granular roles & permissions so every department sees exactly what it should — nothing more.' },
  { icon: BarChart3, title: 'Reports & Dashboards', desc: 'Beautiful KPI dashboards, scheduled reports and one-click exports for owners and managers.' },
];

const heroChips = ['Inventory', 'Payroll', 'CRM', 'Attendance', 'Accounting', 'AI Copilot', 'bKash'];

const steps = [
  { n: '01', title: 'Sign up free in minutes', desc: 'Create your Zypra ERP workspace, add your team and import data from Excel — no credit card needed.' },
  { n: '02', title: 'Connect your operations', desc: 'Set up inventory, attendance devices, payroll rules and link bKash, Facebook & WhatsApp.' },
  { n: '03', title: 'Run & grow on autopilot', desc: 'Watch live dashboards, automate routine work and let AI surface what needs your attention.' },
];

const testimonials = [
  { quote: 'Zypra ERP replaced four different tools for us. Our stock counts finally match reality and payroll takes minutes, not days.', name: 'Rafiqul Islam', role: 'Owner, Dhaka Retail Group' },
  { quote: 'The biometric attendance and bKash payouts are a game changer. My accountant actually enjoys month-end now.', name: 'Nusrat Jahan', role: 'GM, Chattogram Garments' },
  { quote: 'Importing our customers from Excel and getting AI demand forecasts in the same week felt like magic.', name: 'Tanvir Ahmed', role: 'Founder, Sylhet Wholesale' },
];

const tiers = [
  {
    name: 'Free',
    monthly: 0,
    tagline: 'For solo founders getting started',
    features: ['Up to 2 users', 'Inventory & basic CRM', '1 warehouse', 'Community support'],
    cta: 'Start Free',
    highlight: false,
  },
  {
    name: 'Pro',
    monthly: 2500,
    tagline: 'For growing SMEs that need it all',
    features: ['Up to 25 users', 'All modules incl. Payroll & HR', 'Biometric attendance', 'AI Copilot & automation', 'bKash payouts & priority support'],
    cta: 'Get Started',
    highlight: true,
  },
  {
    name: 'Business',
    monthly: 7500,
    tagline: 'For multi-branch enterprises',
    features: ['Unlimited users', 'Multi-department & branches', 'Advanced permissions & audit', 'Custom webhooks & integrations', 'Dedicated account manager'],
    cta: 'Get Started',
    highlight: false,
  },
];

const faqs = [
  { q: 'Is Zypra ERP built for Bangladeshi businesses?', a: 'Yes. Zypra ERP supports BDT (৳), bKash payouts, Bangla-friendly workflows and payroll rules designed for SMEs across Bangladesh.' },
  { q: 'Can I pay with bKash?', a: 'Absolutely. You can subscribe and make payouts using bKash, along with bank transfer and card options.' },
  { q: 'Do I need technical skills to set it up?', a: 'No. Most teams are up and running the same day. Import your data from Excel and our guided setup handles the rest.' },
  { q: 'Does it work with biometric attendance devices?', a: 'Yes. Zypra ERP connects to popular biometric devices and also supports mobile and web check-ins for remote staff.' },
  { q: 'Is my data secure?', a: 'Your data is encrypted in transit and at rest, with role-based permissions and full audit trails on every action.' },
];

const trustItems = [
  { icon: Boxes, label: 'Inventory' },
  { icon: Users, label: 'CRM' },
  { icon: Fingerprint, label: 'Biometric HR' },
  { icon: Wallet, label: 'Payroll' },
  { icon: Calculator, label: 'Accounting' },
  { icon: ScanLine, label: 'Barcode' },
  { icon: Webhook, label: 'Automation' },
  { icon: Sparkles, label: 'AI Copilot' },
  { icon: BarChart3, label: 'Reports' },
];

const fmt = (n) => n.toLocaleString('en-US');

export default function Landing() {
  const reduce = useReducedMotion();
  const [yearly, setYearly] = useState(false);

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : 22 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <ScrollProgress />

      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30">
              <Zap className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">Zypra ERP</span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-slate-600 transition hover:text-orange-600">Features</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 transition hover:text-orange-600">Pricing</a>
            <a href="#faq" className="text-sm font-medium text-slate-600 transition hover:text-orange-600">FAQ</a>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/Auth">Sign In</Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/30 hover:from-amber-600 hover:to-orange-600">
              <Link to="/Auth">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section id="top" className="relative overflow-hidden">
        <AuroraBackground />

        <div className="mx-auto max-w-7xl px-4 pt-20 pb-16 text-center sm:px-6 lg:px-8 lg:pt-28">
          <motion.div variants={container} initial="hidden" animate="show">
            <motion.div
              variants={item}
              className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700"
            >
              <span className="flex h-2 w-2 rounded-full bg-amber-500" />
              Made in Bangladesh, for Bangladeshi SMEs
            </motion.div>

            <motion.h1
              variants={item}
              className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            >
              Run your entire business from{' '}
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                one smart hive
              </span>
            </motion.h1>

            <motion.p variants={item} className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Inventory, CRM, HR & biometric attendance, payroll, accounting and automation —
              all in one suite. Pay with <span className="font-semibold text-pink-600">bKash</span>,
              built Bangla-friendly for teams of every size.
            </motion.p>

            {/* floating feature chips */}
            <motion.div variants={item} className="mt-7 flex flex-wrap items-center justify-center gap-2">
              {heroChips.map((c, i) => (
                <motion.span
                  key={c}
                  animate={reduce ? {} : { y: [0, -5, 0] }}
                  transition={reduce ? {} : { duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.25 }}
                  className="rounded-full border border-amber-200/70 bg-white/70 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm backdrop-blur"
                >
                  {c}
                </motion.span>
              ))}
            </motion.div>

            <motion.div variants={item} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="group h-12 px-8 text-base bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/40 transition hover:from-amber-600 hover:to-orange-600 hover:shadow-xl hover:shadow-orange-500/50">
                <Link to="/Auth">
                  Get Started Free <ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
                <Link to="/Auth">Sign In</Link>
              </Button>
            </motion.div>

            <motion.p variants={item} className="mt-4 text-sm text-slate-500">
              No credit card required · Free forever plan · bKash accepted
            </motion.p>
          </motion.div>

          {/* Hero visual / dashboard mock */}
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mx-auto mt-16 max-w-5xl"
          >
            <ProductMock />
          </motion.div>
        </div>
      </section>

      {/* METRIC STATS */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            { icon: Globe, render: () => <CountUp value={1200} suffix="+" />, label: 'Businesses onboarded' },
            { icon: TrendingUp, render: () => <CountUp value={4.8} decimals={1} suffix="M+" />, label: 'Orders processed' },
            { icon: Wallet, render: () => <CountUp value={920} prefix="৳ " suffix=" Cr+" />, label: 'Transacted on bKash' },
            { icon: ShieldCheck, render: () => <CountUp value={99.9} decimals={1} suffix="%" />, label: 'Uptime guarantee' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
              <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600 sm:mb-0">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-extrabold tracking-tight sm:text-3xl">{s.render()}</p>
                <p className="text-sm text-slate-500">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* TRUST MARQUEE */}
      <section className="border-b border-slate-200 bg-white py-8">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
          One login. Every module your business runs on
        </p>
        <Marquee items={trustItems} />
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-500">Everything you need</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            One platform. Every part of your business.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Stop juggling spreadsheets and disconnected apps. Zypra ERP brings your whole operation under one roof.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} delay={(i % 3) * 0.08} />
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

          <div className="relative mt-16">
            {/* animated connecting line (desktop) */}
            <div className="pointer-events-none absolute left-0 right-0 top-9 hidden md:block">
              <div className="mx-auto h-0.5 max-w-4xl overflow-hidden rounded-full bg-amber-100">
                <motion.div
                  initial={{ width: '0%' }}
                  whileInView={{ width: '100%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, ease: 'easeInOut' }}
                  className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"
                />
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {steps.map((s, i) => (
                <Reveal key={s.n} delay={i * 0.12}>
                  <div className="relative h-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-100">
                    <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-lg font-extrabold text-white shadow-lg shadow-orange-500/30">
                      {i + 1}
                    </span>
                    <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
                    <p className="mt-2 text-slate-600">{s.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
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

        <Reveal>
          <BillingToggle yearly={yearly} onChange={setYearly} />
        </Reveal>

        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
          {tiers.map((t, i) => {
            const monthlyEq = yearly ? Math.round(t.monthly * 0.8) : t.monthly;
            return (
              <Reveal key={t.name} delay={i * 0.08}>
                <motion.div
                  whileHover={reduce ? {} : { y: -6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
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
                    <span className="text-4xl font-extrabold">৳{fmt(monthlyEq)}</span>
                    <span className="mb-1 text-slate-500">/mo</span>
                  </div>
                  {yearly && t.monthly > 0 && (
                    <p className="mt-1 text-xs font-medium text-emerald-600">
                      Billed ৳{fmt(monthlyEq * 12)}/yr — save ৳{fmt(t.monthly * 12 - monthlyEq * 12)}
                    </p>
                  )}
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
                </motion.div>
              </Reveal>
            );
          })}
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">
          All plans include free updates. Pay monthly or yearly via <span className="font-semibold text-pink-600">bKash</span> — cancel anytime.
        </p>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-400">Loved by SMEs</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Trusted across Bangladesh</h2>
          </Reveal>

          <div className="mt-14">
            <TestimonialCarousel items={testimonials} />
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
            <div className="pointer-events-none absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <h2 className="relative mx-auto max-w-2xl text-3xl font-extrabold sm:text-4xl">
              Ready to run your business smarter?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg text-white/90">
              Join 1,200+ Bangladeshi businesses growing with Zypra ERP. Start free today — no card needed.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
                <span className="text-lg font-extrabold">Zypra ERP</span>
              </div>
              <p className="mt-4 max-w-xs text-sm text-slate-600">
                The all-in-one business suite built for Bangladeshi SMEs. Inventory, HR, payroll, accounting & more — in one hive.
              </p>

              {/* newsletter (visual) */}
              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-900">Get product updates</p>
                <div className="mt-3 flex max-w-sm items-center gap-2">
                  <input
                    type="email"
                    placeholder="you@business.com"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                  />
                  <Button type="button" className="h-10 shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 px-4 text-white hover:from-amber-600 hover:to-orange-600">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Integrations', 'AI Copilot'] },
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
            <p className="text-sm text-slate-500">© 2026 Zypra ERP. All rights reserved.</p>
            <p className="text-sm text-slate-500">Made with care in Bangladesh 🇧🇩 · Pay with bKash</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
