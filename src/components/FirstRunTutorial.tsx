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
  FormInput,
  MessageCircle,
  MousePointerClick,
  Plug,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Sun,
  Syringe,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const COMPLETED_KEY = 'gm:tutorial:v2:completed';
const STEP_KEY = 'gm:tutorial:v2:step';
const START_EVENT = 'gm:start-tutorial';

const PAGE_SELECTOR = 'main > div:first-child';

type TutorialStep = {
  title: string;
  subtitle: string;
  description: string;
  bullets?: string[];
  target?: string;
  selector?: string;
  path?: string;
  pageName?: string;
  icon: LucideIcon;
  exercise?: boolean;
};

const STEPS: TutorialStep[] = [
  {
    title: 'Bem-vinda ao Painel GM',
    subtitle: 'Você vai aprender olhando o sistema de verdade',
    description:
      'Este tutorial não é só uma sequência de textos. A cada etapa o painel vai abrir a página correspondente e destacar a parte que está sendo explicada. Vá no seu ritmo.',
    bullets: [
      'As páginas serão abertas automaticamente para você enxergar onde cada função fica.',
      'Use “Voltar” se quiser rever alguma parte e “Mostrar novamente” para destacar o ponto outra vez.',
      'Se fechar no meio, o sistema guarda onde você parou.',
      'Depois de concluir, este tutorial não abre sozinho novamente neste aparelho.',
    ],
    icon: Sparkles,
  },
  {
    title: 'Hoje',
    subtitle: 'Sua primeira tela para começar o dia',
    description:
      'A página Hoje serve para saber rapidamente o que está marcado e o que precisa da sua atenção naquele dia. Pense nela como a tela operacional do dia da clínica.',
    bullets: [
      'No topo você pode mudar o dia, voltar para hoje ou abrir a agenda completa.',
      'Os números mostram quantos atendimentos existem, quantos foram confirmados, concluídos e quanto está previsto/recebido.',
      'Logo abaixo fica a linha do tempo dos atendimentos.',
    ],
    path: '/hoje',
    pageName: 'Hoje',
    selector: PAGE_SELECTOR,
    icon: Sun,
  },
  {
    title: 'Resumo do dia',
    subtitle: 'Esses cartões são para bater o olho',
    description:
      'Aqui você não precisa preencher nada. Os cartões são um resumo automático do dia escolhido e ajudam a perceber rapidamente se há algo fora do esperado.',
    bullets: [
      'Agendamentos: quantidade marcada para o dia.',
      'Confirmados: quantos já confirmaram presença.',
      'Concluídos: atendimentos já finalizados.',
      'Recebido / Previsto: visão financeira daquele dia.',
    ],
    path: '/hoje',
    pageName: 'Hoje',
    selector: 'main > div:first-child > :nth-child(2)',
    icon: BarChart3,
  },
  {
    title: 'Linha do tempo do dia',
    subtitle: 'Aqui você acompanha cada atendimento',
    description:
      'A linha do tempo organiza os atendimentos na ordem dos horários. É onde você acompanha o andamento: agendado, confirmado, chegou, em atendimento, concluído ou pago.',
    bullets: [
      'Use os botões do atendimento para avançar o status conforme o dia acontece.',
      'Os atalhos de WhatsApp servem para confirmação, lembrete ou contato com a paciente.',
      'Se não houver atendimento no dia, a própria tela avisa.',
    ],
    path: '/hoje',
    pageName: 'Hoje',
    selector: 'main > div:first-child > :nth-child(3)',
    icon: Calendar,
  },
  {
    title: 'Dashboard',
    subtitle: 'A visão geral da clínica',
    description:
      'O Dashboard é para consulta. Ele junta os principais números da clínica para você entender rapidamente como estão agenda, leads e previsão de receita.',
    bullets: [
      'Você não precisa cadastrar nada aqui.',
      'Use esta página para acompanhar desempenho e perceber o que merece atenção.',
      'Os dados vêm automaticamente das outras áreas do painel.',
    ],
    path: '/',
    pageName: 'Dashboard',
    selector: PAGE_SELECTOR,
    icon: BarChart3,
  },
  {
    title: 'Indicadores do Dashboard',
    subtitle: 'O que cada número quer dizer',
    description:
      'Esses indicadores transformam os cadastros e agendamentos em um resumo fácil de acompanhar.',
    bullets: [
      'Conversões na semana: pessoas que avançaram até fechar procedimento.',
      'Taxa de agendamento: proporção de leads que chegaram ao agendamento.',
      'Receita prevista: valores de agenda futura somados ao potencial dos leads.',
      'Agendamentos hoje: quantidade de atendimentos marcados para o dia.',
    ],
    path: '/',
    pageName: 'Dashboard',
    selector: 'main > div:first-child > :nth-child(2)',
    icon: BarChart3,
  },
  {
    title: 'Próximos agendamentos',
    subtitle: 'Uma prévia sem abrir a agenda',
    description:
      'No final do Dashboard você encontra os próximos atendimentos marcados. Serve como consulta rápida quando você não precisa abrir o calendário completo.',
    bullets: [
      'Mostra paciente, procedimento, data e horário.',
      'Quando houver valor cadastrado, ele também aparece aqui.',
    ],
    path: '/',
    pageName: 'Dashboard',
    selector: 'main > div:first-child > :last-child',
    icon: Calendar,
  },
  {
    title: 'IA Atendimento',
    subtitle: 'O laboratório da assistente da clínica',
    description:
      'Esta página existe para você testar a IA como se fosse uma cliente real. Durante o treinamento, você pode corrigir respostas até ela aprender o padrão de atendimento da clínica.',
    bullets: [
      'Escreva perguntas como uma cliente escreveria no WhatsApp.',
      'A IA responde usando as instruções e a memória já ensinada.',
      'A resposta automática no WhatsApp continua desligada enquanto estiver em treinamento.',
    ],
    path: '/ai-attendance',
    pageName: 'IA Atendimento',
    selector: PAGE_SELECTOR,
    icon: Bot,
  },
  {
    title: 'Corrigir e ensinar a IA',
    subtitle: 'Este é o botão mais importante do treinamento',
    description:
      'Se uma resposta estiver genérica, errada ou diferente da forma como você atenderia, use “Corrigir e ensinar”. Escreva a resposta ideal e salve.',
    bullets: [
      'A correção entra na memória persistente da GM.',
      'Perguntas iguais ou muito parecidas passam a priorizar o que foi ensinado.',
      'Você pode repetir esse processo quantas vezes precisar durante o treinamento.',
    ],
    path: '/ai-attendance',
    pageName: 'IA Atendimento',
    selector: 'main section',
    icon: Bot,
  },
  {
    title: 'Leads',
    subtitle: 'Pessoas interessadas que ainda estão sendo trabalhadas',
    description:
      'Lead é alguém que pediu informação, veio de anúncio, indicação ou outro canal e ainda pode virar avaliação, paciente ou venda. Essa página evita que oportunidades se percam.',
    bullets: [
      'Novo Lead: cadastra um novo contato interessado.',
      'Temperatura: quente, morno ou frio indica o nível de interesse.',
      'Etapa: mostra em que ponto da conversa/venda aquela pessoa está.',
      'Ticket estimado: valor potencial daquele atendimento.',
    ],
    path: '/leads',
    pageName: 'Leads',
    selector: PAGE_SELECTOR,
    icon: Flame,
  },
  {
    title: 'Cadastrar um novo contato',
    subtitle: 'É daqui que nasce um cadastro de atendimento',
    description:
      'O botão “Novo Lead” abre o formulário de cadastro. Para a rotina da clínica, ele também é o caminho mais simples para iniciar o cadastro de uma pessoa que poderá virar paciente.',
    bullets: [
      'Nome é obrigatório; telefone e e-mail ajudam no contato.',
      'Origem informa de onde a pessoa veio: anúncio, indicação, Instagram etc.',
      'Procedimento de interesse ajuda a equipe a saber o que ela procura.',
      'Notas servem para registrar observações úteis da conversa.',
    ],
    path: '/leads',
    pageName: 'Leads',
    selector: 'main > div:first-child > :first-child',
    icon: FormInput,
  },
  {
    title: 'Indicadores dos Leads',
    subtitle: 'O resumo comercial da captação',
    description:
      'Os cartões desta página resumem como está a entrada e o avanço dos contatos.',
    bullets: [
      'Total de Leads: quantidade de contatos cadastrados.',
      'Conversões na semana: quem fechou procedimento.',
      'Taxa de Agendamento: quantos avançaram até marcar avaliação.',
      'Pipeline Estimado: soma do potencial financeiro dos leads.',
    ],
    path: '/leads',
    pageName: 'Leads',
    selector: 'main > div:first-child > :nth-child(2)',
    icon: BarChart3,
  },
  {
    title: 'Funil e temperatura',
    subtitle: 'Duas maneiras de enxergar os contatos',
    description:
      'A página permite ver os leads por etapa do funil ou por temperatura. Você pode usar a visão que for mais fácil para entender quem precisa de atenção.',
    bullets: [
      'Funil por etapa: Novo → Em contato → Qualificado → Agendou → Converteu ou Perdido.',
      'Por temperatura: separa Quentes, Mornos e Frios.',
      'Nos cartões existem atalhos para WhatsApp, histórico, edição e agendamento.',
    ],
    path: '/leads',
    pageName: 'Leads',
    selector: 'main [role="tablist"]',
    icon: Flame,
  },
  {
    title: 'Procedimentos',
    subtitle: 'O catálogo oficial da clínica',
    description:
      'Aqui ficam os procedimentos que o restante do sistema usa. É importante manter essa lista correta porque agenda, valores e outras áreas podem consultar essas informações.',
    bullets: [
      'Nome: como o procedimento aparece no sistema.',
      'Duração: ajuda na organização de horários.',
      'Categoria: facilita organização e leitura.',
      'Valor padrão: referência usada em outras telas; pode ser ajustado conforme a realidade da clínica.',
      'Descrição: resumo simples do procedimento.',
    ],
    path: '/procedures',
    pageName: 'Procedimentos',
    selector: PAGE_SELECTOR,
    icon: Syringe,
  },
  {
    title: 'Pacientes',
    subtitle: 'Onde você procura quem já está na base',
    description:
      'Esta página reúne os contatos e mostra quem já possui histórico de atendimento. Use quando precisar localizar alguém, abrir a ficha ou consultar informações anteriores.',
    bullets: [
      'A busca encontra por nome, e-mail ou telefone.',
      'Os filtros ajudam a separar pacientes, leads e VIPs.',
      'Cada cartão mostra contato, quantidade de atendimentos e próximo agendamento quando existir.',
      '“Ver ficha” abre o histórico detalhado daquela pessoa.',
    ],
    path: '/patients',
    pageName: 'Pacientes',
    selector: PAGE_SELECTOR,
    icon: Users,
  },
  {
    title: 'Cadastrar via Leads',
    subtitle: 'Por que o cadastro começa em Leads',
    description:
      'No painel, uma pessoa normalmente entra primeiro como contato/lead. Depois, conforme ela agenda e é atendida, o sistema passa a tratá-la como paciente com histórico.',
    bullets: [
      'O botão “Cadastrar via Leads” leva você para o cadastro inicial.',
      'Isso evita duplicar a mesma pessoa em áreas diferentes.',
      'No exercício final você vai praticar exatamente esse fluxo.',
    ],
    path: '/patients',
    pageName: 'Pacientes',
    selector: 'main > div:first-child > :first-child',
    icon: Users,
  },
  {
    title: 'Busca de pacientes',
    subtitle: 'A forma mais rápida de encontrar uma ficha',
    description:
      'Quando a base crescer, não role a tela procurando pessoa por pessoa. Use a busca e digite parte do nome, telefone ou e-mail.',
    bullets: [
      'Você não precisa digitar o nome completo.',
      'Depois de encontrar, toque no cartão ou em “Ver ficha”.',
    ],
    path: '/patients',
    pageName: 'Pacientes',
    selector: 'main input[placeholder*="Buscar por nome"]',
    icon: Search,
  },
  {
    title: 'Agenda',
    subtitle: 'O calendário completo da clínica',
    description:
      'A Agenda é onde você cria, consulta e altera os horários. É a tela principal quando a tarefa envolve data, hora ou disponibilidade.',
    bullets: [
      '“Novo Agendamento” abre o formulário para marcar um atendimento.',
      'A navegação semanal permite voltar, ir para hoje ou avançar uma semana.',
      'Cada dia mostra os atendimentos daquele período.',
      'Agendamentos existentes podem ser editados quando necessário.',
    ],
    path: '/schedule',
    pageName: 'Agenda',
    selector: PAGE_SELECTOR,
    icon: Calendar,
  },
  {
    title: 'Novo Agendamento',
    subtitle: 'Quando a paciente escolheu data e horário',
    description:
      'Use este botão para registrar o compromisso na agenda. Preencha os dados da paciente, procedimento, data/hora e demais informações solicitadas.',
    bullets: [
      'Confira o telefone antes de salvar para os lembretes de WhatsApp funcionarem corretamente.',
      'Escolha o procedimento correto para manter o histórico organizado.',
      'Revise data e horário antes de confirmar.',
    ],
    path: '/schedule',
    pageName: 'Agenda',
    selector: 'main > div:first-child > :first-child',
    icon: Calendar,
  },
  {
    title: 'Financeiro',
    subtitle: 'A leitura dos valores registrados na clínica',
    description:
      'Use o Financeiro para acompanhar faturamento, recebimentos e resultados que foram registrados pelo sistema.',
    bullets: [
      'Consulte os totais antes de analisar detalhes.',
      'Use filtros/períodos disponíveis para comparar momentos diferentes.',
      'Valores dependem do que foi corretamente registrado nos atendimentos e movimentações.',
      'Evite alterar lançamentos sem conferir a origem do valor.',
    ],
    path: '/finance',
    pageName: 'Financeiro',
    selector: PAGE_SELECTOR,
    icon: CreditCard,
  },
  {
    title: 'Integrações',
    subtitle: 'Conexões com serviços externos',
    description:
      'Integrações é uma área mais eventual. Ela reúne conexões do painel com ferramentas como WhatsApp e serviços de marketing.',
    bullets: [
      'Você não precisa entrar aqui para o uso normal do dia a dia.',
      'Só altere uma conexão quando houver uma necessidade específica.',
      'Se alguma integração estiver funcionando, evite trocar chaves ou configurações sem necessidade.',
    ],
    path: '/integrations',
    pageName: 'Integrações',
    selector: PAGE_SELECTOR,
    icon: Plug,
  },
  {
    title: 'Configurações',
    subtitle: 'Ajustes gerais da clínica e do painel',
    description:
      'Configurações guarda informações que não mudam o tempo todo: dados gerais da clínica e preferências operacionais.',
    bullets: [
      'Use para ajustar dados gerais quando realmente houver mudança.',
      'Confira com atenção número de WhatsApp, horários e informações permanentes.',
      'Se não souber para que serve uma opção técnica, deixe como está e confirme antes de alterar.',
    ],
    path: '/settings',
    pageName: 'Configurações',
    selector: PAGE_SELECTOR,
    icon: Settings,
  },
  {
    title: 'Atalho do WhatsApp',
    subtitle: 'O botão verde que acompanha você no painel',
    description:
      'Esse botão abre atalhos de WhatsApp da clínica. Ele não significa que a IA está respondendo automaticamente.',
    bullets: [
      'Pode abrir o WhatsApp Web.',
      'Pode abrir conversa com o número configurado da clínica.',
      'Pode abrir o grupo cadastrado no painel.',
      'É somente um atalho; a automação da IA continua separada.',
    ],
    target: 'whatsapp-shortcut',
    icon: MessageCircle,
  },
  {
    title: 'Exercício prático',
    subtitle: 'Agora você vai mexer no formulário real',
    description:
      'Para terminar, vamos praticar um cadastro. O sistema abrirá a página Leads e o formulário “Novo Lead”. Você vai preencher como se estivesse cadastrando uma nova paciente, mas o exercício será encerrado sem salvar um contato fictício na base.',
    bullets: [
      'Digite um nome de treino, por exemplo “Paciente Treino”.',
      'Veja onde ficam telefone, e-mail, origem e procedimento de interesse.',
      'Observe os campos Temperatura, Etapa e Notas.',
      'Quando terminar de preencher, use o pequeno quadro de exercício para concluir. Ele fechará o formulário sem gravar o teste.',
    ],
    path: '/leads',
    pageName: 'Leads',
    selector: PAGE_SELECTOR,
    icon: MousePointerClick,
    exercise: true,
  },
  {
    title: 'Tutorial concluído',
    subtitle: 'Você já conhece o caminho das tarefas principais',
    description:
      'Não precisa decorar tudo. O importante é lembrar qual área cuida de cada assunto. Quando tiver dúvida, o tutorial pode ser aberto novamente pelo botão de ajuda do painel.',
    bullets: [
      'Hoje: rotina do dia.',
      'Dashboard: visão geral.',
      'Leads: novos contatos e oportunidades.',
      'Pacientes: busca e histórico.',
      'Agenda: datas e horários.',
      'IA Atendimento: treinamento da assistente.',
      'Financeiro: valores e resultados.',
    ],
    icon: CheckCircle2,
  },
];

const EXERCISE_INDEX = STEPS.findIndex((step) => step.exercise);
const FINAL_INDEX = STEPS.length - 1;

function findVisibleElement(step: TutorialStep) {
  if (step.target) {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour-id="${step.target}"]`));
    const target = nodes.find((node) => node.getClientRects().length > 0);
    if (target) return target;
  }

  if (step.selector) {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(step.selector));
    return nodes.find((node) => node.getClientRects().length > 0) ?? null;
  }

  return null;
}

function clickVisibleButton(text: string) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
  const button = buttons.find(
    (item) => item.getClientRects().length > 0 && item.textContent?.toLowerCase().includes(text.toLowerCase()),
  );
  button?.click();
  return Boolean(button);
}

export function FirstRunTutorial() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [targetVisible, setTargetVisible] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const [practice, setPractice] = useState(false);

  const current = STEPS[step];
  const Icon = current.icon;
  const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step]);

  const start = useCallback(() => {
    setPractice(false);
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
    if (!open || !current.path || location.pathname === current.path) return;
    navigate(current.path);
  }, [current.path, location.pathname, navigate, open, step]);

  useEffect(() => {
    if (!open) return;

    let highlighted: HTMLElement | null = null;
    const timer = window.setTimeout(() => {
      const target = findVisibleElement(current);
      setTargetVisible(Boolean(target));
      if (!target) return;

      highlighted = target;
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      target.classList.add(
        'relative',
        'z-[95]',
        'ring-4',
        'ring-primary',
        'ring-offset-4',
        'ring-offset-background',
        'rounded-xl',
      );
    }, current.path && current.path !== location.pathname ? 500 : 180);

    return () => {
      window.clearTimeout(timer);
      if (highlighted) {
        highlighted.classList.remove(
          'relative',
          'z-[95]',
          'ring-4',
          'ring-primary',
          'ring-offset-4',
          'ring-offset-background',
          'rounded-xl',
        );
      }
    };
  }, [current, focusTick, location.pathname, open, step]);

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
    if (current.exercise) {
      beginPractice();
      return;
    }
    if (step === FINAL_INDEX) {
      finish();
      return;
    }
    setStep((value) => Math.min(value + 1, FINAL_INDEX));
  }

  function previous() {
    setStep((value) => Math.max(value - 1, 0));
  }

  function showAgain() {
    if (current.path && location.pathname !== current.path) navigate(current.path);
    setFocusTick((value) => value + 1);
  }

  function openPracticeForm(attempt = 0) {
    if (clickVisibleButton('Novo Lead')) return;
    if (attempt < 14) window.setTimeout(() => openPracticeForm(attempt + 1), 250);
  }

  function beginPractice() {
    localStorage.setItem(STEP_KEY, String(EXERCISE_INDEX));
    setOpen(false);
    setPractice(true);
    navigate('/leads');
    window.setTimeout(() => openPracticeForm(), 350);
  }

  function closePracticeDialog() {
    const dialog = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find(
      (item) => item.getClientRects().length > 0,
    );
    if (!dialog) return;
    const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button'));
    const cancel = buttons.find((button) => button.textContent?.toLowerCase().includes('cancelar'));
    cancel?.click();
  }

  function completePractice() {
    closePracticeDialog();
    setPractice(false);
    setStep(FINAL_INDEX);
    localStorage.setItem(STEP_KEY, String(FINAL_INDEX));
    window.setTimeout(() => setOpen(true), 150);
  }

  function leavePractice() {
    closePracticeDialog();
    setPractice(false);
    setStep(EXERCISE_INDEX);
    window.setTimeout(() => setOpen(true), 150);
  }

  return (
    <>
      {practice && (
        <section className="fixed z-[120] left-3 right-3 bottom-24 md:left-auto md:right-5 md:bottom-5 md:w-[380px] rounded-2xl border bg-card shadow-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-primary">Exercício prático</p>
              <h2 className="font-bold text-base mt-0.5">Preencha o formulário real</h2>
            </div>
            <button type="button" onClick={leavePractice} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted" aria-label="Sair do exercício">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs leading-5 text-muted-foreground space-y-1">
            <p><b className="text-foreground">1.</b> Digite um nome de treino.</p>
            <p><b className="text-foreground">2.</b> Veja telefone, e-mail, origem e procedimento de interesse.</p>
            <p><b className="text-foreground">3.</b> Observe Temperatura, Etapa, Ticket e Notas.</p>
            <p><b className="text-foreground">4.</b> Não precisa clicar em “Criar”. Quando terminar, clique abaixo.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openPracticeForm()} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-1" /> Reabrir formulário
            </Button>
            <Button type="button" size="sm" onClick={completePractice} className="flex-1">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Concluí a prática
            </Button>
          </div>
        </section>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-[1px]" aria-hidden="true" />

          <section
            role="dialog"
            aria-modal="true"
            aria-label="Tutorial do Painel GM"
            className="fixed z-[100] inset-x-3 bottom-24 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[460px] max-h-[80vh] overflow-y-auto rounded-2xl border bg-card shadow-2xl"
          >
            <div className="sticky top-0 z-10 bg-card border-b px-5 pt-4 pb-3 rounded-t-2xl">
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
              {current.pageName && (
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  Página aberta: {current.pageName}
                </div>
              )}

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

              {(current.target || current.selector) && !targetVisible ? (
                <div className="flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
                  <CircleHelp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>A página foi aberta, mas este ponto pode estar fora da área visível. Use “Mostrar novamente” para tentar destacar a parte explicada.</span>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {(current.target || current.selector || current.path) && (
                  <Button type="button" variant="secondary" size="sm" onClick={showAgain}>
                    <MousePointerClick className="w-4 h-4 mr-1" /> Mostrar novamente
                  </Button>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={closeForNow}>
                  Fazer depois
                </Button>
              </div>

              <div className="flex items-center justify-between gap-2 border-t pt-4">
                <Button type="button" variant="outline" size="sm" onClick={previous} disabled={step === 0}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
                <Button type="button" size="sm" onClick={next}>
                  {current.exercise ? 'Iniciar exercício' : step === FINAL_INDEX ? 'Concluir tutorial' : 'Entendi, próximo'}
                  {step !== FINAL_INDEX && <ChevronRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

export function startGMTutorial() {
  window.dispatchEvent(new Event(START_EVENT));
}
