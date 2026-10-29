import type { WhatsAppTemplate } from '@/components/WhatsAppComposer';

export function leadWhatsAppTemplates(name: string): WhatsAppTemplate[] {
  const first = name.trim().split(/\s+/)[0] || 'você';
  return [
    {
      kind: 'welcome', label: 'Primeiro contato',
      message: `Oi, ${first}! Aqui é a Dra. Goreti, da GM Estética Avançada. Me conta o que você gostaria de tratar? Assim consigo te orientar sobre o próximo passo.`,
    },
    {
      kind: 'evaluation', label: 'Como é a avaliação',
      message: `Oi, ${first}! Na avaliação eu escuto sua queixa, analiso o caso e explico as opções que fazem sentido para você. Depois conversamos sobre o plano e os valores. Quer que eu veja os horários disponíveis?`,
    },
    {
      kind: 'price', label: 'Pergunta sobre valor',
      message: `Oi, ${first}! O valor depende do procedimento indicado e do plano individual. Eu te explico tudo antes de você decidir. Se a sua dúvida é sobre o valor da avaliação, eu confirmo essa informação antes de reservar seu horário.`,
    },
    {
      kind: 'followup', label: 'Retomar conversa',
      message: `Oi, ${first}! Passando para saber se ficou alguma dúvida sobre o que conversamos. Se você quiser, posso te mostrar os horários de avaliação disponíveis.`,
    },
  ];
}
