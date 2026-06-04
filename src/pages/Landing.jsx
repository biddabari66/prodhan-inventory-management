import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  TrendingUp, 
  Users, 
  Package, 
  ShieldCheck, 
  Smartphone,
  ChevronRight,
  CheckCircle2,
  BarChart3
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xl">B</div>
            <span className="text-xl font-bold tracking-tight">BEE ERP</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/Auth')}
              className="text-sm font-medium hover:text-white transition-colors hidden sm:block"
            >
              Log in
            </button>
            <button 
              onClick={() => navigate('/Auth')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)] hover:shadow-[0_0_25px_-5px_rgba(37,99,235,0.7)]"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        {/* Abstract Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Built for Modern Bangladeshi Businesses
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
              Manage your entire <br className="hidden lg:block" />
              business in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">One Place.</span>
            </h1>
            
            <p className="text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              BEE ERP is the ultimate all-in-one platform for inventory, CRM, HR, and accounting. Scale your operations with dynamic departments and automated workflows.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => navigate('/Auth')}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_-5px_rgba(37,99,235,0.6)]"
              >
                Start your Free Trial <ChevronRight className="w-5 h-5" />
              </button>
              <button className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all border border-slate-700">
                Book a Demo
              </button>
            </div>
            
            <div className="mt-10 flex items-center justify-center gap-6 text-sm text-slate-500 font-medium">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 14-day free trial</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Dashboard Preview (Faux Image) */}
      <section className="px-6 relative z-10 pb-32">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-2xl p-2 sm:p-4 overflow-hidden"
          >
            <div className="w-full aspect-video bg-slate-950 rounded-xl border border-white/5 relative overflow-hidden flex items-center justify-center">
               <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
               <div className="text-center space-y-4">
                 <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                   <BarChart3 className="w-8 h-8 text-blue-400" />
                 </div>
                 <p className="text-slate-400 font-medium">Interactive SaaS Dashboard Visualization</p>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-900/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">Everything you need to scale</h2>
            <p className="text-slate-400 text-lg">Replace multiple disconnected tools with one unified ERP system designed specifically for the local market.</p>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feat, i) => (
              <motion.div key={i} variants={fadeIn} className="p-8 rounded-2xl bg-slate-900 border border-white/5 hover:border-blue-500/30 transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feat.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Local Payment Integration */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-pink-600/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex-1 space-y-8"
          >
            <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
              Seamless Local <br/>
              <span className="text-pink-500">Payments & Subscriptions</span>
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed max-w-xl">
              Forget complicated international gateways. BEE ERP supports native bKash integrations for both your customer checkouts and your SaaS subscription renewals.
            </p>
            <ul className="space-y-4">
              {['Automated bKash reconciliation', 'Local mobile banking support', 'Transparent monthly invoicing'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-300 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-pink-500" /> {item}
                </li>
              ))}
            </ul>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex-1 w-full"
          >
            <div className="relative rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/5 p-1">
              <div className="bg-slate-900 rounded-xl p-8 border border-pink-500/20">
                <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/10">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Current Plan</p>
                    <p className="text-2xl font-bold">Pro Workspace</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400 mb-1">Monthly</p>
                    <p className="text-2xl font-bold">৳5,000</p>
                  </div>
                </div>
                
                <button className="w-full bg-[#E2136E] hover:bg-[#c91161] text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all">
                  <Smartphone className="w-5 h-5" /> Pay with bKash
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-blue-600 to-purple-700 p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">Ready to transform your business?</h2>
            <p className="text-blue-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
              Join hundreds of growing companies in Bangladesh using BEE ERP to manage their operations efficiently.
            </p>
            <button 
              onClick={() => navigate('/Auth')}
              className="bg-white text-blue-700 hover:bg-slate-50 px-10 py-4 rounded-full text-lg font-bold transition-all shadow-xl"
            >
              Get Started for Free
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6 text-center text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-xs">B</div>
            <span className="font-bold text-slate-300">BEE ERP</span>
          </div>
          <p>© {new Date().getFullYear()} BEE ERP. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-300">Privacy</a>
            <a href="#" className="hover:text-slate-300">Terms</a>
            <a href="#" className="hover:text-slate-300">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const features = [
  {
    icon: Building2,
    title: 'Dynamic Departments',
    desc: 'Create and manage custom departments like Sales, IT, or HR tailored exactly to your organizational structure.'
  },
  {
    icon: Users,
    title: 'Smart CRM',
    desc: 'Track leads from Facebook directly into your pipeline. Follow up, convert to orders, and monitor sales performance.'
  },
  {
    icon: Package,
    title: 'Inventory & Procurement',
    desc: 'Real-time stock tracking, multi-variant products, low stock alerts, and automated purchase orders.'
  },
  {
    icon: TrendingUp,
    title: 'Finance & Accounting',
    desc: 'Keep track of daily expenses, manage income sources, and view automated profit & loss statements.'
  },
  {
    icon: ShieldCheck,
    title: 'Role-based Access',
    desc: 'Granular permissions ensure employees only see what they need to. Protect your sensitive financial data.'
  },
  {
    icon: BarChart3,
    title: 'Advanced Reporting',
    desc: 'Generate comprehensive Excel and PDF reports for attendance, payroll, sales, and inventory at a click.'
  }
];

export default Landing;
