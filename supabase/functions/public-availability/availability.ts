// deno-lint-ignore-file no-explicit-any
// Calcula os dias com horário livre a partir da MESMA agenda do app:
// public.appointments (ocupação) + public.agenda_blocks (folgas) +
// horários de public.clinic_settings. Nunca devolve dados de pacientes nem o motivo dos bloqueios.

const TZ = "America/Sao_Paulo";
// O Brasil não tem horário de verão desde 2019; se voltar, ajuste este offset.
const OFFSET = "-03:00";
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAYS_PT = [
  "domingo", "segunda-feira", "terça-feira", "quarta-feira",
  "quinta-feira", "sexta-feira", "sábado",
];
// Agendamentos nesses status NÃO ocupam a agenda.
const FREE_STATUSES = "(cancelled,no_show)";

const HORIZON_DAYS = 30;      // até quantos dias à frente olhar
const MIN_LEAD_MINUTES = 180; // não oferecer horários que começam em menos de 3h
const DEFAULT_MAX_DAYS = 14;  // quantos dias livres devolver

export type FreeDay = { date: string; weekday: string; label: string; times: string[] };
export type Availability = { today: string; days: FreeDay[] };

function ymdInClinicTz(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d); // YYYY-MM-DD
}

function weekdayIndex(ymd: string) {
  // 12:00 no Brasil = 15:00 UTC, mesma data civil: getUTCDay é seguro.
  return new Date(`${ymd}T12:00:00${OFFSET}`).getUTCDay();
}

function parseHm(value: unknown): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(value ?? ""));
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

const pad = (n: number) => String(n).padStart(2, "0");
const hm = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

type Block = { start: number; end: number }; // minutos do dia; dia inteiro = 0..1440

/** Retorna null se não for possível ler a agenda com segurança (nunca assume "tudo livre"). */
export async function loadAvailability(
  db: any,
  opts: { now?: Date; maxDays?: number } = {},
): Promise<Availability | null> {
  const now = opts.now ?? new Date();
  const maxDays = opts.maxDays ?? DEFAULT_MAX_DAYS;

  const { data: settings, error: settingsError } = await db.from("clinic_settings")
    .select("working_hours,slot_duration_min,slot_buffer_min").limit(1).maybeSingle();
  if (settingsError || !settings?.working_hours ||
    !DAY_KEYS.some((key) => settings.working_hours[key]?.enabled === true)) return null;

  const duration = Math.max(15, Number(settings.slot_duration_min) || 60);
  const buffer = Math.max(0, Number(settings.slot_buffer_min) || 0);
  const span = (duration + buffer) * 60_000;

  const todayYmd = ymdInClinicTz(now);
  const base = new Date(`${todayYmd}T12:00:00${OFFSET}`);
  const rangeStart = new Date(`${todayYmd}T00:00:00${OFFSET}`);
  const rangeEnd = new Date(base.getTime() + (HORIZON_DAYS + 1) * 86_400_000);
  const lastYmd = ymdInClinicTz(new Date(base.getTime() + HORIZON_DAYS * 86_400_000));

  const [apptResult, blockResult] = await Promise.all([
    db.from("appointments").select("scheduled_at")
      .gte("scheduled_at", new Date(rangeStart.getTime() - span).toISOString())
      .lt("scheduled_at", rangeEnd.toISOString())
      .not("status", "in", FREE_STATUSES),
    db.from("agenda_blocks").select("block_date,start_time,end_time")
      .gte("block_date", todayYmd).lte("block_date", lastYmd),
  ]);
  if (apptResult.error || blockResult.error) return null;

  const busy: number[] = (apptResult.data ?? [])
    .map((a: any) => new Date(a.scheduled_at).getTime())
    .filter((t: number) => Number.isFinite(t));

  const blocksByDay = new Map<string, Block[]>();
  for (const b of blockResult.data ?? []) {
    const start = b.start_time == null ? 0 : parseHm(b.start_time);
    const end = b.end_time == null ? 1440 : parseHm(b.end_time);
    if (start === null || end === null || end <= start) return null; // dado estranho: não arrisca
    const key = String(b.block_date);
    blocksByDay.set(key, [...(blocksByDay.get(key) ?? []), { start, end }]);
  }

  const earliest = now.getTime() + MIN_LEAD_MINUTES * 60_000;
  const days: FreeDay[] = [];

  for (let i = 0; i <= HORIZON_DAYS && days.length < maxDays; i++) {
    const ymd = ymdInClinicTz(new Date(base.getTime() + i * 86_400_000));
    const wd = weekdayIndex(ymd);
    const cfg = settings.working_hours?.[DAY_KEYS[wd]];
    if (!cfg?.enabled) continue;
    const start = parseHm(cfg.start), end = parseHm(cfg.end);
    if (start === null || end === null || end <= start) continue;
    const blocks = blocksByDay.get(ymd) ?? [];

    const times: string[] = [];
    for (let t = start; t + duration <= end; t += duration + buffer) {
      if (blocks.some((b) => t < b.end && b.start < t + duration)) continue;
      const slotStart = new Date(`${ymd}T${hm(t)}:00${OFFSET}`).getTime();
      if (slotStart < earliest) continue;
      const slotEnd = slotStart + span;
      if (busy.some((b) => slotStart < b + span && b < slotEnd)) continue;
      times.push(hm(t));
    }
    if (times.length) {
      const [, m, d] = ymd.split("-");
      days.push({ date: ymd, weekday: WEEKDAYS_PT[wd], label: `${WEEKDAYS_PT[wd]}, ${d}/${m}`, times });
    }
  }

  return { today: todayYmd, days };
}
