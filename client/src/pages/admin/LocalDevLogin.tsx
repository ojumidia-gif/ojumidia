import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function LocalDevLogin() {
  const [, setLocation] = useLocation();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const authenticate = async () => {
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/local-dev/login", { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(data?.message || "Não foi possível abrir o ambiente local.");
      }
      setLocation("/admin");
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível abrir o ambiente local.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetch("/api/local-dev/status", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ enabled: boolean }>;
      })
      .then(data => {
        setEnabled(data.enabled);
        if (data.enabled) void authenticate();
      })
      .catch(() => setEnabled(false));
  }, []);

  if (enabled === null || submitting) return <main className="grid min-h-screen place-items-center bg-[#242017] text-[#f7f5ef]"><p className="text-sm text-[#ded8ca]">Abrindo o ambiente administrativo local…</p></main>;
  if (!enabled) return <main className="grid min-h-screen place-items-center bg-[#242017] px-5 text-[#f7f5ef]"><section className="max-w-md text-center"><ShieldCheck className="mx-auto h-9 w-9 text-[#f6b71b]" /><h1 className="mt-6 font-serif text-4xl">Acesso local indisponível</h1><p className="mt-4 leading-7 text-[#ded8ca]">Este recurso funciona somente quando o desenvolvimento local está habilitado com as variáveis necessárias.</p></section></main>;

  return <main className="grid min-h-screen place-items-center bg-[#242017] px-5 text-[#f7f5ef]"><section className="w-full max-w-md border border-[#f6b71b]/30 bg-[#2d281e] p-7 text-center sm:p-9"><ShieldCheck className="mx-auto h-9 w-9 text-[#f6b71b]" /><p className="mt-6 text-[10px] font-bold uppercase tracking-[.18em] text-[#f6b71b]">Somente desenvolvimento local</p><h1 className="mt-3 font-serif text-4xl">Acesso não concluído</h1><p className="mt-4 text-sm leading-6 text-[#ded8ca]">{error || "O ambiente não respondeu como esperado."}</p><Button type="button" onClick={() => void authenticate()} className="mt-7 w-full bg-[#f6b71b] text-[#242017] hover:bg-[#f3c449]">Tentar abrir novamente</Button></section></main>;
}
