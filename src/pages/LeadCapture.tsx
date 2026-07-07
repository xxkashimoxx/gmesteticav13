import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export default function LeadCapture() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    procedure_interest: '',
    notes: '',
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.name.trim().length < 2 || form.phone.trim().length < 8) {
      toast.error('Preencha nome e WhatsApp corretamente');
      return;
    }
    setLoading(true);
    const { error } = await supabase.functions.invoke('public-lead', {
      body: { ...form, source: 'Formulário site' },
    });
    setLoading(false);
    if (error) {
      toast.error('Não foi possível enviar. Tente novamente.');
      return;
    }
    setSent(true);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-secondary to-background flex items-center justify-center p-4">
      <PageMeta
        title="Agendar atendimento — GM Estética Avançada"
        description="Preencha o formulário para ser atendida pela Dra. Goreti na GM Estética Avançada — harmonização facial e cuidados estéticos."
      />
      <Card className="w-full max-w-lg shadow-elevated border-0">
        <CardHeader className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">GM Estética Avançada</CardTitle>
          <p className="text-sm text-muted-foreground">
            Preencha para receber atendimento da Dra. Goreti
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center py-10 space-y-3">
              <CheckCircle2 className="w-14 h-14 text-success mx-auto" />
              <h2 className="text-xl font-semibold">Recebido!</h2>
              <p className="text-sm text-muted-foreground">
                Nossa equipe entrará em contato pelo WhatsApp em instantes.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome completo *</Label>
                <Input id="name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">WhatsApp *</Label>
                <Input id="phone" placeholder="(11) 99999-9999" value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="procedure_interest">Procedimento de interesse</Label>
                <Input id="procedure_interest" placeholder="Ex: Preenchimento labial" value={form.procedure_interest} onChange={(e) => update('procedure_interest', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground">
                {loading ? 'Enviando...' : 'Quero ser atendida'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
