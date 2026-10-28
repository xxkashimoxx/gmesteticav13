import { Bot, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AIAttendance() {
  return <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
    <div><h1 className="flex items-center gap-2 text-2xl font-bold"><Bot className="h-6 w-6" />IA do WhatsApp Business</h1>
      <p className="mt-2 text-sm text-muted-foreground">O atendimento atual é realizado pela IA nativa da Meta no WhatsApp Business.</p></div>
    <Card><CardHeader><CardTitle>Gerenciar o atendimento</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
      <p>Abra o WhatsApp Business no celular e acesse <strong>Ferramentas → IA</strong> para ajustar as informações da clínica e as respostas.</p>
      <p>Este sistema não controla nem treina a IA da Meta. O antigo laboratório de atendimento foi removido.</p>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Conectar as conversas ao sistema</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
      <p>A integração depende do aplicativo Meta, do acesso à conta WhatsApp Business e das assinaturas de webhook. O cadastro do número no WhatsApp Manager não confirma que as conversas estejam sincronizadas.</p>
      <Button asChild variant="outline"><Link to="/whatsapp"><MessageCircle className="mr-2 h-4 w-4" />Ver integração do WhatsApp</Link></Button>
    </CardContent></Card>
  </div>;
}
