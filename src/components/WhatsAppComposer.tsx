import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Sparkles, MessageCircle, Loader2, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { normalizePhone } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

interface Suggestion {
  tone: string;
  message: string;
}

export interface WhatsAppTemplate {
  kind: string;
  label: string;
  message: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  phone: string | null;
  patientName: string;
  defaultMessage?: string;
  templates?: WhatsAppTemplate[];
  initialTemplateKind?: string;
  leadId?: string;
  appointmentId?: string;
  defaultIntent?: string;
  title?: string;
  /** Called when the user opens WhatsApp; receives the selected template kind (if any). */
  onSend?: (templateKind?: string) => void;
}

export function WhatsAppComposer({
  open,
  onOpenChange,
  phone,
  patientName,
  defaultMessage = '',
  templates,
  initialTemplateKind,
  leadId,
  appointmentId,
  defaultIntent = 'Continuar conversa e engajar',
  title,
  onSend,
}: Props) {
  const initialTpl =
    templates?.find((t) => t.kind === initialTemplateKind) ?? templates?.[0];
  const initialMsg = initialTpl?.message ?? defaultMessage;

  const [message, setMessage] = useState(initialMsg);
  const [selectedTpl, setSelectedTpl] = useState<string | undefined>(initialTpl?.kind);
  const [intent, setIntent] = useState(defaultIntent);
  const [lastReceived, setLastReceived] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (open) {
      const tpl = templates?.find((t) => t.kind === initialTemplateKind) ?? templates?.[0];
      setMessage(tpl?.message ?? defaultMessage);
      setSelectedTpl(tpl?.kind);
      setSuggestions([]);
      setIntent(defaultIntent);
      setLastReceived('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultMessage, defaultIntent, initialTemplateKind]);

  function pickTemplate(kind: string) {
    const t = templates?.find((x) => x.kind === kind);
    if (!t) return;
    setSelectedTpl(kind);
    setMessage(t.message);
  }

  const normalized = normalizePhone(phone);
  const waUrl = normalized
    ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
    : null;


  async function suggest() {
    if (!leadId && !appointmentId) {
      toast({ title: 'Sem contexto', description: 'Sugestões requerem lead ou agendamento.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setSuggestions([]);
    const { data, error } = await supabase.functions.invoke('whatsapp-suggest', {
      body: { leadId, appointmentId, intent, lastMessage: lastReceived || undefined },
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Erro ao gerar sugestões', description: error.message, variant: 'destructive' });
      return;
    }
    if ((data as any)?.error) {
      toast({ title: 'IA indisponível', description: (data as any).error, variant: 'destructive' });
      return;
    }
    setSuggestions((data as any)?.suggestions ?? []);
  }

  function useSuggestion(s: Suggestion) {
    setMessage(s.message);
    toast({ title: `Aplicado tom: ${s.tone}` });
  }

  async function copy() {
    await navigator.clipboard.writeText(message);
    toast({ title: 'Copiado' });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            {title ?? `WhatsApp — ${patientName}`}
          </DialogTitle>
          <DialogDescription>
            {normalized ? `+${normalized}` : 'Sem telefone cadastrado'} · Revise a mensagem antes de enviar
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Editor */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Mensagem</Label>
              <Textarea
                rows={10}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite a mensagem..."
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1">{message.length} caracteres</p>
            </div>

            {(leadId || appointmentId) && (
              <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
                <Label className="text-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" /> Sugestões com IA
                </Label>
                <Textarea
                  rows={2}
                  value={lastReceived}
                  onChange={(e) => setLastReceived(e.target.value)}
                  placeholder="Cole aqui a última mensagem do paciente (opcional)"
                  className="text-xs"
                />
                <input
                  className="w-full text-xs px-2 py-1 rounded border bg-background"
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  placeholder="Objetivo (ex: confirmar horário)"
                />
                <Button size="sm" onClick={suggest} disabled={loading} className="w-full bg-gradient-primary text-primary-foreground">
                  {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                  {loading ? 'Gerando...' : 'Gerar 3 sugestões'}
                </Button>
              </div>
            )}
          </div>

          {/* Preview do WhatsApp */}
          <div className="space-y-3">
            <Label className="text-xs">Prévia</Label>
            <div className="rounded-xl p-3 bg-[#e5ddd5] dark:bg-muted min-h-[240px] relative">
              <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-none bg-[#dcf8c6] dark:bg-primary/20 p-3 shadow-sm">
                <p className="text-sm whitespace-pre-wrap text-foreground">
                  {message || <span className="text-muted-foreground italic">Sua mensagem aparecerá aqui</span>}
                </p>
                <p className="text-[10px] text-right text-muted-foreground mt-1">
                  {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ✓✓
                </p>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Sugestões</Label>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => useSuggestion(s)}
                    className={cn(
                      'w-full text-left p-2 rounded-lg border hover:border-primary hover:bg-primary/5 transition',
                    )}
                  >
                    <Badge variant="secondary" className="text-[10px] mb-1">{s.tone}</Badge>
                    <p className="text-xs whitespace-pre-wrap line-clamp-4">{s.message}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={copy}>
            <Copy className="w-4 h-4 mr-2" /> Copiar
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {waUrl ? (
            <Button asChild className="bg-[#25D366] hover:bg-[#20b858] text-white">
              <a href={waUrl} target="_blank" rel="noreferrer" onClick={() => onOpenChange(false)}>
                <MessageCircle className="w-4 h-4 mr-2" /> Abrir WhatsApp
              </a>
            </Button>
          ) : (
            <Button disabled>Sem telefone</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
