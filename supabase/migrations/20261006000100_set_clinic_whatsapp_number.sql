update public.clinic_settings
set whatsapp_number = '5521986083241', updated_at = now()
where whatsapp_number is distinct from '5521986083241';
