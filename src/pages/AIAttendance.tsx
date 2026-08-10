import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Lock, RotateCcw, Send, Sparkles, ThumbsDown, UserRound, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Role = 'client' | 'assistant';
type Message = { id: string; role: Role; text: string; createdAt: number };

export default function AIAttendance() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [correction, setCorrection] = useState('');
  const [loading, setLoading] = useState(false);
  const [learned, setLearned] = useState(0);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { void loadCount(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  async function loadCount() {
    const { count } = await supabase.from('ai_training_examples' as any).select('*', { count: 'exact', head: true });
    setLearned(count || 0);
  }

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const history = [...messages];
    const now = Date.now();
    setMessages(m => [...m, { id: `c-${now}`, role: 'client', text, createdAt: now }]);
    setInput(''); setError(''); setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gm-ai-agent', { body: { message: text, history } });
      if (error) throw error;
      if (!data?.answer) throw new Error(data?.error || 'A IA não retornou resposta.');
      setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'assistant', text: data.answer, createdAt: Date.now() }]);
    } catch (e: any) { setError(e?.message || 'Falha ao conversar com o agente.'); }
    finally { setLoading(false); }
  };

  const lastClientBefore = (index: number) => [...messages.slice(0, index)].reverse().find(m => m.role === 'client');

  async function saveCorrection(id: string, index: number) {
    const question = lastClientBefore(index)?.text;
    const answer = correction.trim();
    if (!question || !answer) return;
    const { error } = await supabase.from('ai_training_examples' as any).insert({ question, answer, source: 'human_correction', approved: true });
    if (error) { setError(error.message); return; }
    setMessages(m => m.map(x => x.id === id ? { ...x, text: answer } : x));
    setEditingId(null); setCorrection(''); await loadCount();
  }

  return <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div><div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary"/><h1 className="text-2xl font-bold">IA Atendimento</h1></div><p className="text-sm text-muted-foreground mt-1">Agente real em laboratório. Converse como cliente e ensine o padrão GM.</p></div>
      <div className="flex gap-2"><span className="rounded-full border px-3 py-2 text-xs font-medium">● Modo de teste</span><button onClick={()=>{setMessages([]);setError('')}} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><RotateCcw className="w-4 h-4"/> Nova conversa</button></div>
    </div>
    {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
    <div className="grid lg:grid-cols-[1fr_300px] gap-4 min-h-[68vh]">
      <section className="rounded-xl border bg-card overflow-hidden flex flex-col min-h-[620px]">
        <header className="px-4 py-3 border-b flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="w-5 h-5 text-primary"/></div><div><p className="font-semibold text-sm">Assistente GM</p><p className="text-xs text-muted-foreground">OpenAI + memória GM</p></div></header>
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-muted/20">
          {!messages.length && <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground">Escreva como se fosse um cliente real no WhatsApp.</div>}
          {messages.map((m,i)=><div key={m.id} className={`flex ${m.role==='client'?'justify-end':'justify-start'}`}><div className="max-w-[86%]"><div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${m.role==='client'?'bg-primary text-primary-foreground rounded-br-md':'bg-card border rounded-bl-md'}`}>{m.text}</div>{m.role==='assistant'&&<button onClick={()=>{setEditingId(m.id);setCorrection(m.text)}} className="mt-1.5 inline-flex items-center gap-1 p-1.5 text-xs text-muted-foreground"><ThumbsDown className="w-3.5 h-3.5"/> Corrigir e ensinar</button>}{editingId===m.id&&<div className="mt-2 rounded-xl border bg-card p-3 space-y-2"><div className="flex justify-between"><b className="text-xs">Resposta ideal da GM</b><button onClick={()=>setEditingId(null)}><X className="w-4 h-4"/></button></div><textarea value={correction} onChange={e=>setCorrection(e.target.value)} rows={4} className="w-full rounded-lg border bg-background p-2 text-sm"/><button onClick={()=>void saveCorrection(m.id,i)} className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs">Salvar e ensinar</button></div>}</div></div>)}
          {loading&&<div className="flex justify-start"><div className="rounded-2xl border bg-card px-4 py-3 text-sm flex gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Respondendo...</div></div>}<div ref={endRef}/>
        </div>
        <form onSubmit={send} className="p-3 border-t flex gap-2"><div className="relative flex-1"><UserRound className="absolute left-3 top-3 w-4 h-4 text-muted-foreground"/><input disabled={loading} value={input} onChange={e=>setInput(e.target.value)} placeholder="Escreva como cliente..." className="w-full rounded-xl border bg-background pl-9 pr-3 py-2.5 text-sm"/></div><button disabled={loading} className="rounded-xl bg-primary text-primary-foreground px-4 disabled:opacity-50"><Send className="w-4 h-4"/></button></form>
      </section>
      <aside className="space-y-4"><div className="rounded-xl border bg-card p-4"><p className="text-sm font-semibold">Memória persistente</p><p className="text-3xl font-bold mt-3">{learned}</p><p className="text-xs text-muted-foreground">correções ensinadas</p><p className="mt-3 rounded-lg bg-muted p-3 text-xs">Cada correção salva entra na memória das próximas respostas.</p></div><div className="rounded-xl border bg-card p-4"><p className="text-sm font-semibold">Treinamento</p><p className="mt-3 text-xs text-muted-foreground">Converse normalmente. Quando a resposta não estiver no padrão da clínica, corrija e salve.</p></div><div className="rounded-xl border bg-card p-4 opacity-80"><div className="flex gap-2"><Lock className="w-4 h-4"/><b className="text-sm">WhatsApp</b></div><div className="mt-3 flex justify-between"><span className="text-xs">Resposta automática</span><b className="text-xs text-amber-600">DESLIGADA</b></div><button disabled className="mt-3 w-full rounded-lg border p-2 text-xs text-muted-foreground">Ativação bloqueada durante treinamento</button></div></aside>
    </div>
  </div>;
}
