import { Button } from "@/components/ui/button";
import { BadgeDollarSign, FileSignature, MapPinned, Palette, Settings2, ShieldCheck, UserCog, UserRoundCheck, Users, WalletCards } from "lucide-react";
import { Link } from "wouter";
import { AdminPage } from "./_shared";

const cards = [
  { href: "/admin/conteudo-portal", icon: Palette, title: "Conteúdo do portal", text: "Textos, serviços, Método Ojú e ordem das páginas públicas.", action: "Editar portal" },
  { href: "/admin/equipes", icon: Users, title: "Equipes e créditos", text: "Créditos reutilizáveis nas coberturas.", action: "Gerenciar equipes" },
  { href: "/admin/taxonomias", icon: MapPinned, title: "Territórios e taxonomias", text: "Local, evento, tema e relações documentais.", action: "Organizar territórios" },
  { href: "/admin/colaboradores", icon: UserCog, title: "Colaboradores", text: "Convites e termo de responsabilidade via gov.br.", action: "Gerir acessos" },
  { href: "/admin/politicas-comerciais", icon: ShieldCheck, title: "Políticas e receitas", text: "Percentuais da Ojú, avisos de repasse e receitas documentais.", action: "Abrir políticas" },
  { href: "/admin/contratos", icon: FileSignature, title: "Contratos", text: "Documentos comerciais já existentes.", action: "Abrir contratos" },
  { href: "/admin/anuncios", icon: BadgeDollarSign, title: "Monetização", text: "Anúncios e cartões de serviço.", action: "Abrir anúncios" },
  { href: "/admin/ganhos", icon: WalletCards, title: "Ganhos", text: "Repasses e valores sem percentual fixo no código.", action: "Ver ganhos" },
];

export default function SettingsAdmin() {
  return (
    <AdminPage eyebrow="Configurações" title="Parâmetros da operação editorial." action={null}>
      <section className="admin-card p-6">
        <div className="flex gap-3">
          <div className="rounded-xl bg-[#f6d978] p-3"><Settings2 className="h-5 w-5" /></div>
          <div>
            <p className="font-serif text-2xl">Configurações administrativas</p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#655e52]">Acesse os parâmetros da operação sem misturá-los ao fluxo de publicação.</p>
          </div>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map(card => (
            <article key={card.href} className="rounded-xl border border-[#242017]/10 bg-white p-5">
              <card.icon className="h-5 w-5 text-[#806817]" />
              <p className="mt-4 font-medium">{card.title}</p>
              <p className="mt-2 text-sm leading-6 text-[#655e52]">{card.text}</p>
              <Button asChild className="mt-5" size="sm" variant="outline"><Link href={card.href}>{card.action}</Link></Button>
            </article>
          ))}
          <article className="rounded-xl border border-[#242017]/10 bg-white p-5">
            <UserRoundCheck className="h-5 w-5 text-[#806817]" />
            <p className="mt-4 font-medium">Identidade e contato</p>
            <p className="mt-2 text-sm leading-6 text-[#655e52]">Acesso administrativo usa contas Google autorizadas individualmente. O e-mail comercial não concede privilégio.</p>
          </article>
        </div>
      </section>
    </AdminPage>
  );
}
