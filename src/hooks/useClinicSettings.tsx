import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

export type ClinicSettings = Database['public']['Tables']['clinic_settings']['Row'];

export function useClinicSettings() {
  const { user, role } = useAuth();
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Any authenticated user (admin/staff) can read; if none exists yet, admin
    // can create an empty row later.
    const { data } = await supabase
      .from('clinic_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    setSettings(data ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const upsert = useCallback(
    async (patch: Partial<ClinicSettings>) => {
      if (!user || role !== 'admin') return { error: new Error('Sem permissão') };
      const base = settings ?? { owner_id: user.id };
      const payload = { ...base, ...patch, owner_id: user.id };
      const { data, error } = await supabase
        .from('clinic_settings')
        .upsert(payload, { onConflict: 'owner_id' })
        .select()
        .single();
      if (!error && data) setSettings(data);
      return { data, error };
    },
    [user, role, settings],
  );

  return { settings, loading, reload: load, upsert };
}
