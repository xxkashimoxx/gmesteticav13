import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  Calendar as CalendarIcon,
  User,
  FileText,
  Camera,
  DollarSign,
  Save,
  Plus,
  Upload,
  Loader2,
  Trash2,
  ClipboardList,
  ImageIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { brl } from '@/lib/format';
import { normalizePhone } from '@/lib/whatsapp';

type Lead = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  tags: string[] | null;
  stage: string;
  notes: string | null;
  created_at: string;
};

type Appointment = {
  id: string;
  scheduled_at: string;
  procedure_name: string | null;
  status: string;
  value: number | null;
  paid_at: string | null;
};

type Anamnesis = {
  id: string;
  version: number;
  data: Record<string, unknown>;
  created_at: string;
};

type ClinicalNote = {
  id: string;
  appointment_id: string;
  note: string;
  professional: string | null;
  products_used: unknown;
  created_at: string;
};

type Photo = {
  id: string;
  storage_path: string;
  kind: 'before' | 'after' | 'progress';
  session_label: string | null;
  taken_at: string;
};

type AnamnesisForm = {
  allergies: string;
  medications: string;
  pregnant: boolean;
  breastfeeding: boolean;
  acid_use: string;
  previous_procedures: string;
  contraindications: string;
  notes: string;
};

const EMPTY_ANAMNESIS: AnamnesisForm = {
  allergies: '',
  medications: '',
  pregnant: false,
  breastfeeding: false,
  acid_use: '',
  previous_procedures: '',
  contraindications: '',
  notes: '',
};

const AVAILABLE_TAGS = ['vip', 'alérgico', 'gestante', 'lactante', 'primeira vez'];

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [lead, setLead] = useState<Lead | null>(null);
  const [apts, setApts] = useState<Appointment[]>([]);
  const [anamnesisList, setAnamnesisList] = useState<Anamnesis[]>([]);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<AnamnesisForm>(EMPTY_ANAMNESIS);
  const [savingAnamnesis, setSavingAnamnesis] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nextPhotoKind, setNextPhotoKind] = useState<'before' | 'after' | 'progress'>('before');
  const [nextPhotoLabel, setNextPhotoLabel] = useState('');

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    const [leadRes, aptRes, anaRes, notesRes, phRes] = await Promise.all([
      supabase.from('leads').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('appointments')
        .select('id, scheduled_at, procedure_name, status, value, paid_at')
        .eq('lead_id', id)
        .order('scheduled_at', { ascending: false }),
      supabase
        .from('patient_anamnesis')
        .select('id, version, data, created_at')
        .eq('lead_id', id)
        .order('version', { ascending: false }),
      supabase
        .from('clinical_notes')
        .select('id, appointment_id, note, professional, products_used, created_at')
        .eq('lead_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('patient_photos')
        .select('id, storage_path, kind, session_label, taken_at')
        .eq('lead_id', id)
        .order('taken_at', { ascending: false }),
    ]);

    setLead((leadRes.data as unknown as Lead) ?? null);
    setApts((aptRes.data ?? []) as Appointment[]);
    const anaList = (anaRes.data ?? []) as unknown as Anamnesis[];
    setAnamnesisList(anaList);
    if (anaList[0]) setForm({ ...EMPTY_ANAMNESIS, ...(anaList[0].data as Partial<AnamnesisForm>) });
    setNotes((notesRes.data ?? []) as ClinicalNote[]);
    const ph = (phRes.data ?? []) as Photo[];
    setPhotos(ph);

    // sign photo URLs
    if (ph.length) {
      const paths = ph.map((p) => p.storage_path);
      const { data: signed } = await supabase.storage
        .from('patient-photos')
        .createSignedUrls(paths, 3600);
      const map: Record<string, string> = {};
      signed?.forEach((s, i) => {
        if (s.signedUrl) map[paths[i]] = s.signedUrl;
      });
      setPhotoUrls(map);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const financials = useMemo(() => {
    const total = apts.reduce((s, a) => s + (a.value ?? 0), 0);
    const paid = apts.filter((a) => a.status === 'paid').reduce((s, a) => s + (a.value ?? 0), 0);
    return { total, paid, pending: total - paid };
  }, [apts]);

  const nextAppointment = useMemo(
    () => apts.find((a) => new Date(a.scheduled_at) >= new Date()),
    [apts],
  );

  async function saveAnamnesis() {
    if (!id) return;
    setSavingAnamnesis(true);
    const nextVersion = (anamnesisList[0]?.version ?? 0) + 1;
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from('patient_anamnesis').insert({
      lead_id: id,
      version: nextVersion,
      data: form as unknown as never,
      created_by: authData.user?.id ?? null,
    });
    setSavingAnamnesis(false);
    if (error) return toast.error('Falha ao salvar anamnese', { description: error.message });
    toast.success(`Anamnese v${nextVersion} salva`);
    loadAll();
  }

  async function toggleTag(tag: string) {
    if (!lead || !id) return;
    const current = new Set(lead.tags ?? []);
    if (current.has(tag)) current.delete(tag);
    else current.add(tag);
    const next = Array.from(current);
    const { error } = await supabase.from('leads').update({ tags: next }).eq('id', id);
    if (error) return toast.error('Falha ao atualizar tags', { description: error.message });
    setLead({ ...lead, tags: next });
  }

  async function uploadPhoto(file: File) {
    if (!id) return;
    setUploading(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${id}/${Date.now()}-${nextPhotoKind}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('patient-photos')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) {
      setUploading(false);
      return toast.error('Falha no upload', { description: upErr.message });
    }
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from('patient_photos').insert({
      lead_id: id,
      storage_path: path,
      kind: nextPhotoKind,
      session_label: nextPhotoLabel || null,
      created_by: authData.user?.id ?? null,
    });
    setUploading(false);
    if (error) return toast.error('Falha ao registrar foto', { description: error.message });
    toast.success('Foto adicionada');
    setNextPhotoLabel('');
    loadAll();
  }

  async function deletePhoto(photo: Photo) {
    if (!confirm('Remover esta foto?')) return;
    await supabase.storage.from('patient-photos').remove([photo.storage_path]);
    const { error } = await supabase.from('patient_photos').delete().eq('id', photo.id);
    if (error) return toast.error('Falha ao remover');
    toast.success('Foto removida');
    loadAll();
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        Carregando ficha…
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-muted-foreground">Paciente não encontrado.</p>
        <Button onClick={() => navigate('/patients')}>Voltar</Button>
      </div>
    );
  }

  const waPhone = normalizePhone(lead.phone);
  const initials = lead.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/patients')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
      </div>

      {/* Header card */}
      <Card className="shadow-card border-0 bg-gradient-primary text-primary-foreground">
        <CardContent className="p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-foreground/15 ring-2 ring-secondary/60 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold">{initials || '?'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{lead.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm opacity-90">
              {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {lead.phone}</span>}
              {lead.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3.5 h-3.5" /> {lead.email}</span>}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {lead.tags?.map((t) => (
                <Badge key={t} className="bg-primary-foreground/20 text-primary-foreground border-0 text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {waPhone && (
              <Button variant="secondary" asChild>
                <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener">
                  <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
                </a>
              </Button>
            )}
            <Button variant="secondary" asChild>
              <Link to="/schedule">
                <CalendarIcon className="w-4 h-4 mr-1" /> Agendar
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="summary"><User className="w-4 h-4 mr-1" /> Resumo</TabsTrigger>
          <TabsTrigger value="anamnesis"><ClipboardList className="w-4 h-4 mr-1" /> Anamnese</TabsTrigger>
          <TabsTrigger value="history"><FileText className="w-4 h-4 mr-1" /> Histórico</TabsTrigger>
          <TabsTrigger value="photos"><Camera className="w-4 h-4 mr-1" /> Fotos</TabsTrigger>
          <TabsTrigger value="finance"><DollarSign className="w-4 h-4 mr-1" /> Financeiro</TabsTrigger>
        </TabsList>

        {/* Summary */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="shadow-card border-0 bg-gradient-card">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Atendimentos</p>
                <p className="text-2xl font-bold text-foreground">{apts.length}</p>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0 bg-gradient-card">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Total gasto</p>
                <p className="text-lg font-bold text-foreground">{brl(financials.total)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0 bg-gradient-card">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Pago</p>
                <p className="text-lg font-bold text-success">{brl(financials.paid)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0 bg-gradient-card">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Pendente</p>
                <p className={`text-lg font-bold ${financials.pending > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {brl(financials.pending)}
                </p>
              </CardContent>
            </Card>
          </div>

          {nextAppointment && (
            <Card className="shadow-card border-0 bg-primary/5 border-l-4 border-l-primary">
              <CardContent className="p-4 flex items-center gap-3">
                <CalendarIcon className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Próximo atendimento</p>
                  <p className="font-semibold">
                    {new Date(nextAppointment.scheduled_at).toLocaleString('pt-BR', {
                      dateStyle: 'full',
                      timeStyle: 'short',
                    })}
                    {nextAppointment.procedure_name && ` · ${nextAppointment.procedure_name}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-card border-0 bg-gradient-card">
            <CardHeader><CardTitle className="text-base">Tags</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {AVAILABLE_TAGS.map((t) => {
                const active = lead.tags?.includes(t);
                return (
                  <Button
                    key={t}
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    onClick={() => toggleTag(t)}
                  >
                    {t}
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          {lead.notes && (
            <Card className="shadow-card border-0 bg-gradient-card">
              <CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{lead.notes}</CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Anamnesis */}
        <TabsContent value="anamnesis" className="space-y-4">
          <Card className="shadow-card border-0 bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Anamnese estética</CardTitle>
              {anamnesisList[0] && (
                <Badge variant="outline">
                  v{anamnesisList[0].version} · {new Date(anamnesisList[0].created_at).toLocaleDateString('pt-BR')}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Alergias conhecidas</Label>
                <Textarea rows={2} value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Medicamentos em uso</Label>
                <Textarea rows={2} value={form.medications} onChange={(e) => setForm({ ...form, medications: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                  <Switch checked={form.pregnant} onCheckedChange={(v) => setForm({ ...form, pregnant: v })} />
                  <Label className="cursor-pointer">Gestante</Label>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                  <Switch checked={form.breastfeeding} onCheckedChange={(v) => setForm({ ...form, breastfeeding: v })} />
                  <Label className="cursor-pointer">Lactante</Label>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Uso de ácidos / retinoides</Label>
                <Input value={form.acid_use} onChange={(e) => setForm({ ...form, acid_use: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Procedimentos estéticos anteriores</Label>
                <Textarea rows={2} value={form.previous_procedures} onChange={(e) => setForm({ ...form, previous_procedures: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Contraindicações / cuidados</Label>
                <Textarea rows={2} value={form.contraindications} onChange={(e) => setForm({ ...form, contraindications: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Observações gerais</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button onClick={saveAnamnesis} disabled={savingAnamnesis} className="bg-gradient-primary text-primary-foreground">
                {savingAnamnesis ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Salvar nova versão
              </Button>

              {anamnesisList.length > 1 && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Histórico de versões ({anamnesisList.length})</summary>
                  <ul className="mt-2 space-y-1">
                    {anamnesisList.map((a) => (
                      <li key={a.id}>
                        v{a.version} · {new Date(a.created_at).toLocaleString('pt-BR')}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-3">
          {apts.length === 0 && (
            <Card className="shadow-card border-0 bg-gradient-card">
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhum atendimento registrado.
              </CardContent>
            </Card>
          )}
          {apts.map((a) => {
            const note = notes.find((n) => n.appointment_id === a.id);
            return (
              <Card key={a.id} className="shadow-card border-0 bg-gradient-card">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {a.procedure_name ?? 'Atendimento'} —{' '}
                        {new Date(a.scheduled_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                      <Badge className="mt-1 text-[10px]" variant="outline">{a.status}</Badge>
                    </div>
                    {a.value != null && <p className="font-semibold">{brl(a.value)}</p>}
                  </div>
                  <NoteEditor appointment={a} existing={note ?? null} leadId={lead.id} onSaved={loadAll} />
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Photos */}
        <TabsContent value="photos" className="space-y-4">
          <Card className="shadow-card border-0 bg-gradient-card">
            <CardHeader><CardTitle className="text-base">Adicionar foto</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={nextPhotoKind} onValueChange={(v) => setNextPhotoKind(v as 'before' | 'after' | 'progress')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="before">Antes</SelectItem>
                      <SelectItem value="after">Depois</SelectItem>
                      <SelectItem value="progress">Evolução</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5 md:col-span-2">
                  <Label className="text-xs">Sessão / observação</Label>
                  <Input value={nextPhotoLabel} onChange={(e) => setNextPhotoLabel(e.target.value)} placeholder="ex: 2ª sessão de peeling" />
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadPhoto(f);
                  e.target.value = '';
                }}
              />
              <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="bg-gradient-primary text-primary-foreground">
                {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                Enviar foto
              </Button>
            </CardContent>
          </Card>

          {photos.length === 0 ? (
            <Card className="shadow-card border-0 bg-gradient-card">
              <CardContent className="p-8 text-center text-muted-foreground">
                <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                Nenhuma foto ainda.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map((p) => {
                const url = photoUrls[p.storage_path];
                return (
                  <Card key={p.id} className="shadow-card border-0 overflow-hidden group relative">
                    <div className="aspect-square bg-muted relative">
                      {url ? (
                        <img src={url} alt={p.session_label ?? p.kind} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      <Badge className="absolute top-2 left-2 text-[10px]">
                        {p.kind === 'before' ? 'Antes' : p.kind === 'after' ? 'Depois' : 'Evolução'}
                      </Badge>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deletePhoto(p)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <CardContent className="p-2 text-xs">
                      <p className="text-muted-foreground">{new Date(p.taken_at).toLocaleDateString('pt-BR')}</p>
                      {p.session_label && <p className="font-medium truncate">{p.session_label}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Finance */}
        <TabsContent value="finance" className="space-y-3">
          {apts.map((a) => (
            <Card key={a.id} className="shadow-card border-0 bg-gradient-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{a.procedure_name ?? 'Atendimento'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.scheduled_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{brl(a.value ?? 0)}</p>
                  {a.status === 'paid' ? (
                    <Badge className="bg-success text-success-foreground">Pago</Badge>
                  ) : (
                    <Badge variant="destructive">Pendente</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {apts.length === 0 && (
            <Card className="shadow-card border-0 bg-gradient-card">
              <CardContent className="p-8 text-center text-muted-foreground">Sem lançamentos.</CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NoteEditor({
  appointment,
  existing,
  leadId,
  onSaved,
}: {
  appointment: Appointment;
  existing: ClinicalNote | null;
  leadId: string;
  onSaved: () => void;
}) {
  const [note, setNote] = useState(existing?.note ?? '');
  const [professional, setProfessional] = useState(existing?.professional ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { data: authData } = await supabase.auth.getUser();
    if (existing) {
      await supabase.from('clinical_notes').update({ note, professional }).eq('id', existing.id);
    } else {
      await supabase.from('clinical_notes').insert({
        appointment_id: appointment.id,
        lead_id: leadId,
        note,
        professional,
        created_by: authData.user?.id ?? null,
      });
    }
    setSaving(false);
    toast.success('Nota clínica salva');
    onSaved();
  }

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <div className="grid gap-1.5">
        <Label className="text-xs">Nota clínica</Label>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Produto usado, marca, lote, resposta do paciente…" />
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex-1 grid gap-1.5">
          <Label className="text-xs">Profissional</Label>
          <Input value={professional} onChange={(e) => setProfessional(e.target.value)} />
        </div>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}
