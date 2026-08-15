import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Flame,
  MessageCircle,
  Plug,
  Settings,
  Sparkles,
  Sun,
  Syringe,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const COMPLETED_KEY = 'gm:tutorial:v1:completed';
const STEP_KEY = 'gm:tutorial:v1:step';
const START_EVENT = 'gm:start-tutorial';

type TutorialStep = {
  title: string;
  subtitle: string;
  description: string;
  bullets?: string[];
  target?: string;
  icon: LucideIcon;
};

const STEPS: TutorialStep[] = [
  {
    title: 'Bem-vinda ao Painel GM',
    subtitle: 'Um passeio rápido, sem linguagem complicada',
    description:
      'Este tutorial vai mostrar, uma tela por vez, para que serve cada menu do sistema. Você não precisa decorar nada agora: a ideia é apenas saber onde procurar cada coisa.',
    bullets: [
      'Use Próximo e Voltar no seu ritmo.',
      'Se fechar antes do fim, o sistema guarda onde você parou.',
      'Depois de concluir, o tutorial não abre sozinho novamente.',
    ],
    icon: Sparkles,
  },
  {
    title: 'Hoje',
    subtitle: 'O ponto de partida do dia',
    description:
      'Abra esta tela para ver o que precisa da sua atenção hoje. Ela foi pensada para você bater o olho e entender como está o dia da clínica.',
    bullets: [
      'Veja atendimentos e compromissos do dia.',
      'Use para acompanhar confirmações e pendências mais imediatas.',
    ],
    target: 'hoje',
    icon: Sun,
  },
  {
    title: 'Dashboard',
    subtitle: 'O resumo geral da clínica',
    description:
      'O Dashboard junta as informações mais importantes em uma única tela. Ele serve para acompanhar a situação da clínica sem precisar abrir cada área separadamente.',
    bullets: [
      'Use para ter uma visão rápida de movimento, leads, agenda e resultados.',
      'Normalmente você consulta esta tela; não precisa cadastrar informações nela.',
    ],
    target: 'dashboard',
    icon: BarChart3,
  },
  {
    title: 'IA Atendimento',
    subtitle: 'Onde você ensina a assistente da clínica',
    description:
      'Nesta área você conversa com a IA como se fosse uma cliente real. Quando uma resposta não estiver do jeito que você quer, pode corrigir e ensinar a resposta ideal.',
    bullets: [
      'Clique em “Corrigir e ensinar” quando a resposta não estiver boa.',
      'As correções salvas entram na memória da assistente para respostas futuras.',
      'Durante o treinamento, a resposta automática do WhatsApp permanece desligada.',
    ],
    target: 'ai-attendance',
    icon: Bot,
  },
  {
    title: 'Leads',
    subtitle: 'Pessoas interessadas que ainda precisam ser trabalhadas',
    description:
      'Lead é alguém que demonstrou interesse na clínica, pediu informação ou veio de uma campanha, mas ainda não necessariamente virou paciente ou agendamento.',
    bullets: [
      'Use para acompanhar quem pediu contato ou demonstrou interesse.',
      'Ajuda a não esquecer pessoas que podem virar consultas ou procedimentos.',
    ],
    target: 'leads',
    icon: Flame,
  },
  {
    title: 'Procedimentos',
    subtitle: 'O catálogo do que a clínica oferece',
    description:
      'Aqui ficam cadastrados os procedimentos da clínica. Pense nesta área como a lista oficial que o restante do sistema pode consultar.',
    bullets: [
      'Cadastre ou ajuste nome, duração, categoria, descrição e valor de referência.',
      'Mantenha os dados atualizados para a agenda e outras áreas usarem informações corretas.',
    ],
    target: 'procedures',
    icon: Syringe,
  },
  {
    title: 'Pacientes',
    subtitle: 'Cadastro e histórico de quem já é atendido',
    description:
      'Nesta área você procura e acompanha pacientes. É onde ficam as informações relacionadas ao histórico de atendimento de cada pessoa.',
    bullets: [
      'Use para localizar um paciente e consultar seus dados.',
      'O histórico ajuda a entender atendimentos e procedimentos já registrados.',
    ],
    target: 'patients',
    icon: Users,
  },
  {
    title: 'Agenda',
    subtitle: 'Onde os horários da clínica são organizados',
    description:
      'A Agenda é a área para controlar os horários. É nela que você consulta quando a clínica está ocupada ou livre e organiza os atendimentos.',
    bullets: [
      'Use para marcar e consultar atendimentos.',
      'Também é a referência para remarcações e organização dos horários.',
    ],
    target: 'schedule',
    icon: Calendar,
  },
  {
    title: 'Financeiro',
    subtitle: 'Acompanhamento dos valores da clínica',
    description:
      'Esta área organiza as informações financeiras que foram registradas no sistema. O objetivo é facilitar a leitura do que entrou e o acompanhamento dos resultados.',
    bullets: [
      'Use para conferir faturamento e movimentações registradas.',
      'Os relatórios ajudam a comparar períodos e acompanhar o desempenho financeiro.',
    ],
    target: 'finance',
    icon: CreditCard,
  },
  {
    title: 'Integrações',
    subtitle: 'Conexões do painel com outros serviços',
    description:
      'Integrações é a área usada para conectar o painel a serviços externos, como canais de atendimento e ferramentas de marketing.',
    bullets: [
      'Você não precisa mexer aqui no uso normal do dia a dia.',
      'Altere uma integração somente quando houver necessidade de conectar ou ajustar algum serviço.',
    ],
    target: 'integrations',
    icon: Plug,
  },
  {
    title: 'Configurações',
    subtitle: 'Ajustes gerais e permanentes do sistema',
    description:
      'Configurações reúne dados e preferências que não costumam mudar toda hora. É a área certa para alterar informações gerais da clínica e ajustes do painel.',
    bullets: [
      'Use quando precisar mudar algum dado geral ou preferência da clínica.',
      'Se estiver em dúvida sobre uma opção, é melhor não alterar até confirmar para que ela serve.',
    ],
    target: 'settings',
    icon: Settings,
  },
  {
    title: 'Atalho do WhatsApp',
    subtitle: 'Acesso rápido às opções de WhatsApp da clínica',
    description:
      'O botão verde que fica no canto da tela é um atalho. Ele pode abrir o WhatsApp Web, o contato configurado da clínica e o grupo cadastrado no sistema.',
    bullets: [
      'Ele é apenas um atalho de acesso e não significa que a IA está respondendo automaticamente.',
      'As opções exibidas dependem do número e dos links configurados no painel.',
    ],
    target: 'whatsapp-shortcut',
    icon: MessageCircle,
  },
  {
    title: 'Pronto. Você já sabe onde procurar.',
    subtitle: 'O restante você aprende usando',
    description:
      'A ideia não é decorar o painel inteiro. Quando precisar fazer alguma coisa, lembre apenas de qual área cuida daquele assunto. O sistema foi separado justamente para isso.',
    bullets: [
      'Agenda: horários.',
      'Pacientes: histórico de quem já é atendido.',
      'Leads: pessoas interessadas.',
      'IA Atendimento: treinamento da assistente.',
      'Configurações: ajustes gerais.',
    ],
    icon: CheckCircle2,
  },
];

function findVisibleTarget(id?: string) {
  if (!id) return null;
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour-id="${id}"]`));
  return nodes.find((node) => node.getClientRects().length > 0) ?? null;
}

export function FirstRunTutorial() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [targetVisible, setTargetVisible] = useState(false);

  const current = STEPS[step];
  const Icon = current.icon;
  const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step]);

  const start = useCallback(() => {
    setStep(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    const completed = localStorage.getItem(COMPLETED_KEY) === '1';
    if (!completed) {
      const saved = Number(localStorage.getItem(STEP_KEY) ?? '0');
      const safeStep = Number.isFinite(saved) && saved >= 0 && saved < STEPS.length ? saved : 0;
      const timer = window.setTimeout(() => {
        setStep(safeStep);
        setOpen(true);
      }, 700);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handler = () => start();
    window.addEventListener(START_EVENT, handler);
    return () => window.removeEventListener(START_EVENT, handler);
  }, [start]);

  useEffect(() => {
    if (!open) return;

    const target = findVisibleTarget(current.target);
    setTargetVisible(Boolean(target));

    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('relative', 'z-[95]', 'ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');

    return () => {
      target.classList.remove('relative', 'z-[95]', 'ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
    };
  }, [current.target, open, step]);

  useEffect(() => {
    if (open) localStorage.setItem(STEP_KEY, String(step));
  }, [open, step]);

  function closeForNow() {
    localStorage.setItem(STEP_KEY, String(step));
    setOpen(false);
  }

  function finish() {
    localStorage.setItem(COMPLETED_KEY, '1');
    localStorage.removeItem(STEP_KEY);
    setOpen(false);
  }

  function next() {
    if (step === STEPS.length - 1) return finish();
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  }

  function previous() {
    setStep((value) => Math.max(value - 1, 0));
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-[1px]" aria-hidden="true" />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Tutorial do Painel GM"
        className="fixed z-[100] inset-x-3 bottom-24 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[440px] max-h-[78vh] overflow-y-auto rounded-2xl border bg-card shadow-2xl"
      >
        <div className="sticky top-0 bg-card border-b px-5 pt-4 pb-3 rounded-t-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Tutorial · passo {step + 1} de {STEPS.length}
                </p>
                <h2 className="font-bold text-lg leading-tight mt-0.5">{current.title}</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={closeForNow}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Fechar e continuar depois"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="font-semibold text-sm text-foreground">{current.subtitle}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{current.description}</p>
          </div>

          {current.bullets?.length ? (
            <div className="rounded-xl bg-muted/60 p-3.5 space-y-2.5">
              {current.bullets.map((item) => (
                <div key={item} className="flex gap-2.5 text-sm leading-5">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : null}

          {current.target && !targetVisible ? (
            <div className="flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
              <CircleHelp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>No celular, alguns itens ficam dentro do menu ☰. O nome mostrado acima é exatamente o que você deve procurar.</span>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={closeForNow}>
              Fazer depois
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={previous} disabled={step === 0}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <Button type="button" size="sm" onClick={next}>
                {step === STEPS.length - 1 ? 'Concluir tutorial' : 'Próximo'}
                {step !== STEPS.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function startGMTutorial() {
  window.dispatchEvent(new Event(START_EVENT));
}
