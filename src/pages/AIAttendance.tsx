import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Check, MessageCircle, RotateCcw, Send, Sparkles, ThumbsDown, UserRound, X } from 'lucide-react';

type Role = 'client' | 'assistant';
type Message = { id: string; role: Role; text: string; createdAt: number };
type Training = { id: string; question: string; answer: string; createdAt: number };

const TRAINING_KEY = 'gm-ai-training-v1';
const CHAT_KEY = 'gm-ai-test-chat-v1';

const defaults: Training[] = [
  { id: 'd1', question: 'como funciona o agendamento', answer: 'Posso te ajudar com o agendamento. Me diga qual procedimento você tem interesse e o melhor período para atendimento.', createdAt: 1 },
  { id: 'd2', question: 'quero marcar uma avaliação', answer: 'Claro. Para organizar sua avaliação, me diga seu nome e qual procedimento ou região você gostaria de avaliar.', createdAt: 2 },
  { id: 'd3', question: 'quanto custa', answer: 'Os valores variam conforme o procedimento e a avaliação individual. Me diga qual procedimento você procura para eu te orientar melhor.', createdAt: 3 },
  { id: 'd4', question: 'endolaser', answer: 'O Endolaser é um procedimento realizado após avaliação profissional para definir indicação e planejamento individual. Posso te explicar melhor ou iniciar seu pedido de avaliação com a Dra. Goreti.', createdAt: 4 },
];

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s: string) => new Set(normalize(s).split(' ').filter((x) => x.length > 2));

function similarity(a: string, b: string) {
  const aa = tokens(a); const bb = tokens(b);
  if (!aa.size || !bb.size) return 0;
  let common = 0; aa.forEach((x) => { if (bb.has(x)) common++; });
  return common / Math.max(aa.size, bb.size);
}

function answerFor(question: string, training: Training[]) {
  const ranked = training.map((t) => ({ ...t, score: similarity(question, t.question) })).sort((a, b) => b.score - a.score);
  if (ranked[0]?.score >= 0.34) return ranked[0].answer;
  return 'Entendi. Ainda estou em treinamento para responder essa situação do jeito da GM Estética. Você pode corrigir minha resposta abaixo e eu vou usar essa orientação nas próximas conversas semelhantes.';
}

export default function AIAttendance() {
  const [training, setTraining] = useState<Training[]>(() => {
    try { return JSON.parse(localStorage.getItem(TRAINING_KEY) || 'null') || defaults; } catch { return defaults; }
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    try { return JSON.parse(localStorage.getItem(CHAT_KEY) || '[]'); } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [correction, setCorrection] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => localStorage.setItem(TRAINING_KEY, JSON.stringify(training)), [training]);
  useEffect(() => { localStorage.setItem(CHAT_KEY, JSON.stringify(messages)); endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const learned = Math.max(0, training.length - defaults.length);
  const lastClientBefore = (index: number) => [...messages.slice(0, index)].reverse().find((m) => m.role === 'client');

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim(); if (!text) return;
    const now = Date.now();
    const client: Message = { id: `c-${now}`, role: 'client', text, createdAt: now };
    const reply: Message = { id: `a-${now}`, role: 'assistant', text: answerFor(text, training), createdAt: now + 1 };
    setMessages((m) => [...m, client, reply]); setInput('');
  };

  const saveCorrection = (assistantId: string, index: number) => {
    const q = lastClientBefore(index); const text = correction.trim();
    if (!q || !text) return;
    setTraining((t) => [{ id: `t-${Date.now()}`, question: q.text, answer: text, createdAt: Date.now() }, ...t]);
    setMessages((m) => m.map((msg) => msg.id === assistantId ? { ...msg, text } : msg));
    setEditingId(null); setCorrection('');
  };

  const resetChat = () => { setMessages([]); setEditingId(null); setCorrection(''); };

  const status = useMemo(() => learned === 0 ? 'Base inicial' : `${learned} correç${learned === 1 ? 'ão' : 'ões'} aprendida${learned === 1 ? '' : 's'}`, [learned]);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /><h1 className="text-2xl font-bold">IA Atendimento</h1></div>
          <p className="text-sm text-muted-foreground mt-1">Laboratório interno. Simule clientes, corrija respostas e forme a base do atendimento.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"><span className="w-2 h-2 rounded-full bg-amber-500" /> Modo de teste</span>
          <button onClick={resetChat} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"><RotateCcw className="w-4 h-4" /> Limpar conversa</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-4 min-h-[68vh]">
        <section className="rounded-xl border bg-card overflow-hidden flex flex-col min-h-[620px]">
          <header className="px-4 py-3 border-b flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="w-5 h-5 text-primary" /></div>
            <div><p className="font-semibold text-sm">Assistente GM</p><p className="text-xs text-muted-foreground">Você está falando como cliente</p></div>
          </header>
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-muted/20">
            {messages.length === 0 && <div className="h-full flex items-center justify-center text-center"><div><MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" /><p className="font-medium">Comece um atendimento de teste</p><p className="text-sm text-muted-foreground mt-1">Ex.: “Oi, queria saber mais sobre endolaser.”</p></div></div>}
            {messages.map((m, i) => (
              <div key={m.id} className={`flex ${m.role === 'client' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[86%]">
                  <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${m.role === 'client' ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-card border rounded-bl-md'}`}>{m.text}</div>
                  {m.role === 'assistant' && <div className="mt-1.5 flex gap-1.5">
                    <button title="Resposta boa" className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><Check className="w-3.5 h-3.5" /></button>
                    <button title="Corrigir e ensinar" onClick={() => { setEditingId(m.id); setCorrection(m.text); }} className="inline-flex items-center gap-1 p-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground"><ThumbsDown className="w-3.5 h-3.5" /> Corrigir</button>
                  </div>}
                  {editingId === m.id && <div className="mt-2 rounded-xl border bg-card p-3 space-y-2">
                    <div className="flex justify-between"><p className="text-xs font-semibold">Como a IA deveria responder?</p><button onClick={() => setEditingId(null)}><X className="w-4 h-4" /></button></div>
                    <textarea value={correction} onChange={(e) => setCorrection(e.target.value)} rows={4} className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    <button onClick={() => saveCorrection(m.id, i)} className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-medium">Salvar e ensinar</button>
                  </div>}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="p-3 border-t bg-card flex gap-2">
            <div className="flex-1 relative"><UserRound className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escreva como se fosse um cliente..." className="w-full rounded-xl border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
            <button type="submit" className="rounded-xl bg-primary text-primary-foreground px-4 hover:opacity-90"><Send className="w-4 h-4" /></button>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-4"><p className="text-sm font-semibold">Treinamento</p><p className="text-3xl font-bold mt-3">{training.length}</p><p className="text-xs text-muted-foreground">exemplos na base</p><div className="mt-3 rounded-lg bg-muted p-3 text-xs"><strong>{status}</strong><br />Cada correção passa a ser usada em perguntas semelhantes.</div></div>
          <div className="rounded-xl border bg-card p-4"><p className="text-sm font-semibold">Como testar</p><ol className="mt-3 space-y-3 text-xs text-muted-foreground"><li><strong className="text-foreground">1.</strong> Fale como um cliente real.</li><li><strong className="text-foreground">2.</strong> Avalie a resposta da assistente.</li><li><strong className="text-foreground">3.</strong> Clique em <b>Corrigir</b> quando não gostar.</li><li><strong className="text-foreground">4.</strong> Escreva a resposta ideal da clínica.</li></ol></div>
          <div className="rounded-xl border bg-card p-4"><p className="text-sm font-semibold">WhatsApp</p><div className="mt-3 flex items-center justify-between"><span className="text-xs text-muted-foreground">Resposta automática</span><span className="text-xs font-semibold text-amber-600">DESLIGADA</span></div><p className="text-xs text-muted-foreground mt-3">Nenhuma mensagem é enviada para clientes nesta fase.</p></div>
        </aside>
      </div>
    </div>
  );
}
