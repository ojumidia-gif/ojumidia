import { ArrowRight, CheckCircle2, Instagram, Mail, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { PublicHeader } from "@/components/PublicHeader";
import { OJU_CONTACT_EMAIL, OJU_INSTAGRAM_HANDLE, OJU_INSTAGRAM_URL, OJU_WHATSAPP_LABEL, OJU_WHATSAPP_URL } from "@/lib/publicNav";

const WHATSAPP_URL = OJU_WHATSAPP_URL;
const INSTAGRAM_URL = OJU_INSTAGRAM_URL;
const CONTACT_EMAIL = OJU_CONTACT_EMAIL;
const subjects = ["Dúvida", "Sugestão", "Solicitação de cobertura", "Parceria", "Outro"] as const;

export default function Contact() {
  const [sent, setSent] = useState(false);
  const submitContact = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name"));
    const email = String(form.get("email"));
    const subject = String(form.get("subject"));
    const message = String(form.get("message"));
    const body = `Nome: ${name}\nE-mail para resposta: ${email}\nAssunto: ${subject}\n\nMensagem:\n${message}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`[Ojú Mídia] ${subject}`)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <div className="public-page">
      <PublicHeader />
      <main className="container pb-20 pt-16">
        <section className="grid gap-10 border-b border-oju-terra/10 pb-12 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
          <div>
            <p className="editorial-kicker">Contato</p>
            <h1 className="mt-5 max-w-3xl font-serif text-6xl leading-[.95]">Vamos conversar sobre o que precisa ser registrado.</h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-oju-terra-suave">Envie uma dúvida, sugestão, solicitação ou proposta de parceria. A mensagem é direcionada ao canal institucional da Ojú Mídia.</p>
            <div className="mt-10 flex flex-wrap gap-6">
              <Link href="/ser-parceiro" className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[.08em] text-oju-verde">Quero ser Parceiro Ojú <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/contrate-sua-cobertura" className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[.08em] text-oju-verde">Registrar uma solicitação de cobertura <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
          <form className="public-surface p-6 sm:p-7" onSubmit={submitContact}>
            <div className="flex items-start gap-3">
              <div className="rounded-sm bg-oju-verde p-2.5 text-oju-branco"><Send className="h-4 w-4" /></div>
              <div>
                <p className="editorial-kicker">Mensagem para a Ojú</p>
                <h2 className="mt-2 font-serif text-3xl">Escreva para nós.</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm">Seu nome<input required name="name" className="h-11 rounded-sm border border-oju-terra/20 bg-oju-paz-claro px-3 outline-none focus:border-oju-verde" placeholder="Como podemos chamar você" /></label>
              <label className="grid gap-2 text-sm">Seu e-mail<input required name="email" type="email" className="h-11 rounded-sm border border-oju-terra/20 bg-oju-paz-claro px-3 outline-none focus:border-oju-verde" placeholder="voce@email.com" /></label>
            </div>
            <label className="mt-4 grid gap-2 text-sm">Assunto<select name="subject" className="h-11 rounded-sm border border-oju-terra/20 bg-oju-paz-claro px-3 outline-none focus:border-oju-verde">{subjects.map(subject => <option key={subject}>{subject}</option>)}</select></label>
            <label className="mt-4 grid gap-2 text-sm">Mensagem<textarea required name="message" className="min-h-32 rounded-sm border border-oju-terra/20 bg-oju-paz-claro p-3 outline-none focus:border-oju-verde" placeholder="Conte para a Ojú o que você precisa ou deseja compartilhar." /></label>
            {sent ? <p className="mt-4 flex gap-2 text-sm leading-6 text-oju-verde"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />Seu aplicativo de e-mail foi aberto com a mensagem preenchida. Revise e pressione enviar para concluir.</p> : <p className="mt-4 text-xs leading-5 text-oju-terra-suave">Ao enviar, seu aplicativo de e-mail será aberto com a mensagem preenchida para <b className="text-oju-terra">{CONTACT_EMAIL}</b>. Vale a <Link href="/privacidade" className="text-oju-verde underline">Privacidade e LGPD</Link>.</p>}
            <button type="submit" data-testid="contact-email-form" className="public-cta mt-6 w-full"><Mail className="h-4 w-4" />Preparar e-mail para a Ojú</button>
          </form>
        </section>
        <section className="mt-10 grid gap-4 lg:grid-cols-3">
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="group public-surface p-7 transition hover:border-oju-dourado/50"><MessageCircle className="h-7 w-7 text-oju-verde" /><p className="mt-8 editorial-kicker">WhatsApp oficial</p><p className="mt-3 font-serif text-4xl">{OJU_WHATSAPP_LABEL}</p><span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-oju-terra-suave group-hover:text-oju-verde">Abrir conversa <ArrowRight className="h-4 w-4" /></span></a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="group public-surface p-7 transition hover:border-oju-dourado/50"><Mail className="h-7 w-7 text-oju-verde" /><p className="mt-8 editorial-kicker">E-mail institucional</p><p className="mt-3 break-all font-serif text-3xl">{CONTACT_EMAIL}</p><span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-oju-terra-suave group-hover:text-oju-verde">Enviar e-mail <ArrowRight className="h-4 w-4" /></span></a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="group public-surface p-7 transition hover:border-oju-dourado/50"><Instagram className="h-7 w-7 text-oju-verde" /><p className="mt-8 editorial-kicker">Instagram oficial</p><p className="mt-3 font-serif text-4xl">{OJU_INSTAGRAM_HANDLE}</p><span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-oju-terra-suave group-hover:text-oju-verde">Visitar perfil <ArrowRight className="h-4 w-4" /></span></a>
        </section>
      </main>
    </div>
  );
}
