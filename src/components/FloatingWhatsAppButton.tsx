import { useEffect, useState } from 'react';
import { MessageCircle, Globe, Users, Phone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  loadClinicWhatsApp,
  clinicWaMeUrl,
  WHATSAPP_WEB_URL,
} from '@/lib/clinicWhatsApp';

export function FloatingWhatsAppButton() {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState(loadClinicWhatsApp());

  useEffect(() => {
    const refresh = () => setCfg(loadClinicWhatsApp());
    window.addEventListener('gm:whatsapp-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('gm:whatsapp-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const directUrl = clinicWaMeUrl();

  return (
    <div className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="w-64 rounded-xl border bg-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
            <p className="text-sm font-semibold text-foreground">WhatsApp da clínica</p>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-2 flex flex-col gap-1">
            <a
              href={WHATSAPP_WEB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-sm text-foreground"
            >
              <Globe className="w-4 h-4 text-primary" />
              Abrir WhatsApp Web
            </a>
            {directUrl ? (
              <a
                href={directUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-sm text-foreground"
              >
                <Phone className="w-4 h-4 text-primary" />
                Conversar com a clínica
              </a>
            ) : (
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-sm text-muted-foreground"
              >
                <Phone className="w-4 h-4" />
                Configurar número da clínica
              </Link>
            )}
            {cfg.groupUrl ? (
              <a
                href={cfg.groupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-sm text-foreground"
              >
                <Users className="w-4 h-4 text-primary" />
                Grupo Dra. + Tráfego
              </a>
            ) : (
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-sm text-muted-foreground"
              >
                <Users className="w-4 h-4" />
                Configurar link do grupo
              </Link>
            )}
          </div>
        </div>
      )}
      <Button
        data-tour-id="whatsapp-shortcut"
        onClick={() => setOpen((v) => !v)}
        size="icon"
        className="w-14 h-14 rounded-full shadow-xl bg-[#25D366] hover:bg-[#1ebe57] text-white"
        aria-label="Abrir menu do WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    </div>
  );
}
