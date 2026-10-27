import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { CalendarDays, Loader2, MessageCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadClinicWhatsApp } from '@/lib/clinicWhatsApp';

type FreeDay = { date: string; weekday: string; label: string; times: string[] };
type Status = 'loading' | 'ready' | 'error';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export default function Disponibilidade() {
  const [days, setDays] = useState<FreeDay[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const whatsappNumber = loadClinicWhatsApp().number;

  const load = useCallback(async () => {
    setStatus('loading');
    const { data, error } = await supabase.functions.invoke('public-availability');
    if (error || !Array.isArray(data?.days)) {
      setStatus('error');
      return;
    }
    setDays(data.days as FreeDay[]);
    setStatus('ready');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const whatsappUrl = (text: string) =>
    `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-secondary to-background flex items-start justify-center p-4 md:p-8">
      <Helmet>
        <title>Dias disponíveis — GM Estética Avançada</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Card className="w-full max-w-lg shadow-elevated border-0">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Dias disponíveis</CardTitle>
          <p className="text-sm text-muted-foreground">
            GM Estética Avançada · escolha um dia e fale com a gente pelo WhatsApp.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {status === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Consultando a agenda…
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Não conseguimos consultar a agenda agora. Chame a equipe no WhatsApp e confirmamos um dia para você.
              </p>
              <Button asChild className="w-full">
                <a href={whatsappUrl('Olá! Gostaria de agendar um atendimento.')} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Falar com a equipe
                </a>
              </Button>
            </div>
          )}

          {status === 'ready' && days.length === 0 && (
            <div className="space-y-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Não há dias livres no momento. Chame a equipe no WhatsApp para verificarmos encaixes.
              </p>
              <Button asChild className="w-full">
                <a href={whatsappUrl('Olá! Gostaria de verificar encaixes na agenda.')} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Falar com a equipe
                </a>
              </Button>
            </div>
          )}

          {status === 'ready' &&
            days.map((day) => {
              const morning = day.times.some((t) => t < '12:00');
              const afternoon = day.times.some((t) => t >= '12:00');
              const label = capitalize(day.label);
              return (
                <div
                  key={day.date}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {[morning && 'Manhã', afternoon && 'Tarde'].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <Button asChild size="sm" className="shrink-0">
                    <a
                      href={whatsappUrl(`Olá! Gostaria de agendar um atendimento na ${day.label}.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Quero este dia
                    </a>
                  </Button>
                </div>
              );
            })}

          {status !== 'loading' && (
            <div className="pt-2 space-y-2 text-center">
              <p className="text-xs text-muted-foreground">
                O horário final é confirmado pela nossa equipe no WhatsApp. A agenda muda ao longo do dia, então
                um dia pode ficar indisponível até a confirmação.
              </p>
              <Button variant="ghost" size="sm" onClick={() => void load()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
