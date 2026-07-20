import { PageMeta } from '@/components/PageMeta';
import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Sparkles, Loader2 } from 'lucide-react';

const signInSchema = z.object({
  email: z.string().trim().email('E-mail inválido').max(255),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(72),
});
const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, 'Informe o nome').max(120),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({
      email: fd.get('email'),
      password: fd.get('password'),
    });
    if (!parsed.success) {
      toast({ title: 'Dados inválidos', description: parsed.error.issues[0].message, variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Falha no login', description: error.message, variant: 'destructive' });
      return;
    }
    navigate('/', { replace: true });
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      email: fd.get('email'),
      password: fd.get('password'),
      fullName: fd.get('fullName'),
    });
    if (!parsed.success) {
      toast({ title: 'Dados inválidos', description: parsed.error.issues[0].message, variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: parsed.data.fullName },
      },
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Falha no cadastro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Conta criada', description: 'Você já pode entrar.' });
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <PageMeta
        title="Entrar — GM Estética Avançada"
        description="Acesso restrito à equipe da clínica GM Estética Avançada e aos gestores de tráfego autorizados."
      />
      <Card className="w-full max-w-md shadow-elevated border-0">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-card">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">GM - GESTÃO GERAL</CardTitle>
          <CardDescription>Acesso restrito à clínica e à equipe de tráfego</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-3 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="si-email">E-mail</Label>
                  <Input id="si-email" name="email" type="email" autoComplete="email" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="si-pass">Senha</Label>
                  <Input id="si-pass" name="password" type="password" autoComplete="current-password" required />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={busy}>
                  {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Entrar
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="su-name">Nome completo</Label>
                  <Input id="su-name" name="fullName" type="text" autoComplete="name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-email">E-mail</Label>
                  <Input id="su-email" name="email" type="email" autoComplete="email" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-pass">Senha</Label>
                  <Input id="su-pass" name="password" type="password" autoComplete="new-password" required minLength={6} />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={busy}>
                  {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Criar conta
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  O primeiro cadastro vira <strong>administrador</strong> (Dra. Goreti). Os demais entram como <strong>gestor de tráfego</strong>.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
