import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles, Send, Loader2, Lightbulb, MessageSquareText, AlertTriangle, Bot, User as UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';

const SUGGESTIONS = [
  "What's my profit this month?",
  'Which products are low on stock?',
  'How are my sales today?',
  "What's my lead conversion rate?",
  'What should I focus on this week?',
];

const sev = {
  info: 'bg-sky-100 text-sky-800',
  warning: 'bg-amber-100 text-amber-800',
  critical: 'bg-rose-100 text-rose-800',
};

export default function AICopilot() {
  const [tab, setTab] = useState('chat');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Zypra Copilot 🤖. Ask me anything about your business — sales, stock, leads, finance." },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  const { data: status } = useQuery({ queryKey: ['ai-status'], queryFn: () => api.get('/ai/status').then((r) => r.data), retry: false });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  const ask = async (q) => {
    const question = (q ?? input).trim();
    if (!question || busy) return;
    const history = messages.filter((m) => m.role !== 'system').slice(-6).map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: 'user', content: question }]);
    setInput('');
    setBusy(true);
    try {
      const { data } = await api.post('/ai/ask', { question, history });
      setMessages((m) => [...m, { role: 'assistant', content: data.answer }]);
    } catch (e) {
      const msg = e?.response?.data?.error || 'AI request failed';
      setMessages((m) => [...m, { role: 'assistant', content: '⚠️ ' + msg }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-600 to-orange-600 flex items-center justify-center shadow-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Zypra Copilot</h1>
          <p className="text-sm text-muted-foreground">AI assistant for your business data {status?.model ? `· ${status.model}` : ''}</p>
        </div>
      </div>

      {status && status.configured === false && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>AI isn't configured yet. Add a free <b>Groq</b> API key (<code>AI_API_KEY</code>) on the server — get one free at console.groq.com — or point <code>AI_BASE_URL</code> to a local Ollama. The UI works; responses need a key.</span>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="chat"><Bot className="w-4 h-4 mr-1.5" /> Chat</TabsTrigger>
          <TabsTrigger value="insights"><Lightbulb className="w-4 h-4 mr-1.5" /> Insights</TabsTrigger>
          <TabsTrigger value="compose"><MessageSquareText className="w-4 h-4 mr-1.5" /> Compose</TabsTrigger>
        </TabsList>

        {/* CHAT */}
        <TabsContent value="chat" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <div className="h-[52vh] overflow-y-auto p-4 space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-slate-200' : 'bg-gradient-to-br from-orange-600 to-orange-600'}`}>
                      {m.role === 'user' ? <UserIcon className="w-4 h-4 text-slate-600" /> : <Bot className="w-4 h-4 text-white" />}
                    </div>
                    <div className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-orange-600 text-white' : 'bg-muted'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-orange-600 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
                    <div className="rounded-2xl px-4 py-2.5 bg-muted"><Loader2 className="w-4 h-4 animate-spin" /></div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div className="border-t p-3">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => ask(s)} disabled={busy}
                      className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted">
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && ask()}
                    placeholder="Ask about sales, stock, leads, finance…"
                    disabled={busy}
                  />
                  <Button onClick={() => ask()} disabled={busy || !input.trim()}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INSIGHTS */}
        <TabsContent value="insights" className="mt-3">
          <InsightsPanel />
        </TabsContent>

        {/* COMPOSE */}
        <TabsContent value="compose" className="mt-3">
          <ComposePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InsightsPanel() {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/ai/insights');
      setInsights(data.insights || []);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">AI Business Insights</CardTitle>
        <Button size="sm" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lightbulb className="w-4 h-4 mr-2" />}
          Generate
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {!insights && !loading && <p className="text-sm text-muted-foreground">Click Generate for AI-driven risks &amp; opportunities from your live data.</p>}
        {insights?.length === 0 && <p className="text-sm text-muted-foreground">No insights returned.</p>}
        {insights?.map((it, i) => (
          <div key={i} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{it.title}</span>
              <Badge className={sev[it.severity] || sev.info} variant="secondary">{it.severity}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{it.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ComposePanel() {
  const [purpose, setPurpose] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [details, setDetails] = useState('');
  const [out, setOut] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!purpose.trim()) { toast.error('Describe the purpose'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/ai/compose', { purpose, channel, details });
      setOut(data.message);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to compose');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">AI Message Composer</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Channel</label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Purpose</label>
            <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Order delivery confirmation" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Details (optional)</label>
          <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={2} placeholder="Customer name, order no, discount…" />
        </div>
        <Button onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Generate Message
        </Button>
        {out && (
          <div className="rounded-lg bg-muted p-3">
            <Textarea value={out} onChange={(e) => setOut(e.target.value)} rows={6} className="bg-transparent border-0 focus-visible:ring-0" />
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(out); toast.success('Copied'); }}>Copy</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
