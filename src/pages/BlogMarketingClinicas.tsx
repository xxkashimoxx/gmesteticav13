import { PageMeta } from '@/components/PageMeta';
import { Link } from 'react-router-dom';
import { Sparkles, Instagram, Search, MessageCircle, TrendingUp, Users, Target, Star } from 'lucide-react';

const tips = [
  {
    icon: Instagram,
    title: '1. Redes sociais com prova visual',
    body: 'Publique antes e depois (com autorização assinada), bastidores de procedimentos e depoimentos em vídeo. Instagram e TikTok são a vitrine da clínica — poste 4 a 5 vezes por semana e priorize Reels curtos (até 30s) para alcance orgânico.',
  },
  {
    icon: Search,
    title: '2. SEO local para "clínica de estética em [sua cidade]"',
    body: 'Reivindique e otimize seu perfil no Google Business Profile: fotos reais, horário atualizado, respostas a todas as avaliações e postagens semanais. Peça avaliação após cada atendimento — clínicas com 50+ reviews aparecem 3x mais no mapa.',
  },
  {
    icon: MessageCircle,
    title: '3. WhatsApp como canal de vendas',
    body: 'Mais de 80% dos leads de estética preferem WhatsApp. Configure resposta em até 5 minutos, envie confirmações e lembretes automáticos e use áudios personalizados da própria profissional para aumentar a taxa de fechamento.',
  },
  {
    icon: Target,
    title: '4. Tráfego pago com criativos específicos',
    body: 'Meta Ads e Google Ads funcionam quando o criativo mostra resultado real, não banco de imagens. Segmente por raio de 5-10 km e teste 3 criativos por semana. Custo por lead saudável no nicho: R$ 8 a R$ 25 dependendo do procedimento.',
  },
  {
    icon: Users,
    title: '5. Programa de indicação estruturado',
    body: 'Ofereça R$ 50 de crédito ou uma sessão de skincare gratuita para quem indica uma amiga que fecha procedimento. 30 a 40% das novas pacientes de clínicas maduras vêm de indicação — formalize esse fluxo.',
  },
  {
    icon: TrendingUp,
    title: '6. Funil de conversão com CRM',
    body: 'Classifique leads por temperatura (quente/morno/frio), acompanhe a última interação e nunca deixe um lead quente sem resposta por mais de 2 horas. Um CRM dedicado aumenta a conversão de lead em consulta em 25 a 40%.',
  },
  {
    icon: Star,
    title: '7. Conteúdo educativo para autoridade',
    body: 'Grave vídeos curtos explicando "quanto tempo dura o preenchimento labial", "toxina botulínica dói?" e outras dúvidas frequentes. Google e Instagram premiam quem responde perguntas reais — essa é a base de aquisição orgânica de longo prazo.',
  },
  {
    icon: Sparkles,
    title: '8. Pacotes e recorrência',
    body: 'Empacote protocolos (ex.: 3 sessões de limpeza de pele + 1 peel químico) com desconto de 15 a 20%. Recorrência transforma paciente em cliente vitalício e estabiliza o faturamento mensal da clínica.',
  },
];

export default function BlogMarketingClinicas() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-secondary/40 to-background">
      <PageMeta
        title="Marketing para clínica de estética: 8 estratégias que funcionam"
        description="Guia prático de marketing para clínicas de estética: redes sociais, SEO local, WhatsApp, tráfego pago e CRM para aumentar a conversão de leads em pacientes."
      />

      <article className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <header className="space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" /> Guia de marketing
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight">
            Marketing para clínica de estética: 8 estratégias comprovadas para atrair e reter pacientes
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Atrair pacientes para uma clínica de estética exige mais do que boas fotos de antes e depois.
            Reunimos as práticas que as clínicas de maior crescimento no Brasil aplicam todos os dias — de
            SEO local a fluxo no WhatsApp — para você aumentar a conversão sem depender exclusivamente de anúncios.
          </p>
        </header>

        <section className="space-y-6">
          {tips.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-card border rounded-xl p-5 md:p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-lg md:text-xl font-semibold">{title}</h2>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-12 space-y-4">
          <h2 className="text-2xl font-bold">Como medir se o marketing está dando resultado</h2>
          <p className="text-muted-foreground leading-relaxed">
            As três métricas que importam em uma clínica de estética são: <strong>custo por lead (CPL)</strong>,
            <strong> taxa de conversão lead → consulta agendada</strong> e <strong>ticket médio por paciente</strong>.
            Um painel simples que junte esses três indicadores por semana já basta para decidir onde investir
            no mês seguinte. Ferramentas de gestão específicas para o setor centralizam agenda, prontuário,
            WhatsApp e vendas em um só lugar, o que torna a leitura desses números imediata.
          </p>
        </section>

        <aside className="mt-12 rounded-2xl border bg-gradient-primary text-primary-foreground p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-bold">Pronta para colocar tudo isso em prática?</h2>
          <p className="mt-2 text-primary-foreground/90 text-sm md:text-base">
            A GM Estética Avançada usa um sistema próprio de gestão que integra agenda, prontuário, leads e
            WhatsApp com sugestões de resposta baseadas em IA. Se você é dona de clínica e quer ver como
            funciona, comece pelo formulário de contato.
          </p>
          <Link
            to="/captacao"
            className="inline-block mt-4 px-5 py-2.5 rounded-lg bg-background text-foreground font-medium hover:opacity-90 transition"
          >
            Falar com a equipe
          </Link>
        </aside>

        <footer className="mt-12 pt-6 border-t text-xs text-muted-foreground">
          Publicado por GM Estética Avançada · Atualizado em julho de 2026
        </footer>
      </article>
    </main>
  );
}
