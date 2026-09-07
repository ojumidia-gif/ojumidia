import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BadgeDollarSign, BookOpenText, FileSignature, MapPinned, Palette, Settings2, ShieldCheck, UserCog, UserRoundCheck, Users, WalletCards } from "lucide-react";
import { Link } from "wouter";
import { AdminPage } from "./_shared";

const cards = [
  { href: "/admin/conteudo-portal", icon: Palette, title: "Conteúdo do portal", text: "Textos, serviços, Método Ojú e ordem das páginas públicas.", action: "Editar portal", principalOnly: true },
  { href: "/admin/equipes", icon: Users, title: "Equipes e créditos", text: "Créditos reutilizáveis nas coberturas.", action: "Gerenciar equipes" },
  { href: "/admin/taxonomias", icon: MapPinned, title: "Cidades e taxonomias", text: "Cidade de atuação, evento, tema e relações documentais.", action: "Organizar cidades" },
  { href: "/admin/frentes", icon: BookOpenText, title: "Frentes editoriais", text: "Atalho por tipo: história, cobertura, documentário, projeto e fotografia.", action: "Abrir frentes", principalOnly: true },
  { href: "/admin/candidaturas", icon: UserRoundCheck, title: "Candidaturas públicas", text: "Pedidos de Ser parceiro. Aprovar não cria login.", action: "Ver pedidos", principalOnly: true },
  { href: "/admin/colaboradores", icon: UserCog, title: "Colaboradores", text: "Convites, pulso de produção e termo via gov.br.", action: "Gerir acessos", principalOnly: true },
  { href: "/admin/denuncias", icon: ShieldCheck, title: "Denúncias e evidências", text: "Casos, quarentena, preservação e pacote técnico. Políticas de retenção exigem validação jurídica.", action: "Abrir denúncias", principalOnly: true },
  { href: "/admin/auditoria", icon: ShieldCheck, title: "Auditoria", text: "Logins, permissões, publicação e políticas.", action: "Abrir auditoria", principalOnly: true },
  { href: "/admin/politicas-comerciais", icon: ShieldCheck, title: "Políticas e receitas", text: "Percentuais da Ojú, avisos de repasse e receitas documentais.", action: "Abrir políticas", principalOnly: true },
  { href: "/admin/contratos", icon: FileSignature, title: "Contratos", text: "Documentos comerciais já existentes.", action: "Abrir contratos" },
  { href: "/admin/anuncios", icon: BadgeDollarSign, title: "Monetização", text: "Anúncios e cartões de serviço.", action: "Abrir anúncios", principalOnly: true },
  { href: "/admin/ganhos", icon: WalletCards, title: "Ganhos", text: "Repasses e valores sem percentual fixo no código.", action: "Ver ganhos", principalOnly: true },
];

export default function SettingsAdmin() {
  const { user } = useAuth();
  const principal = user?.role === "administrador principal";
  const visibleCards = cards.filter(card => principal || !card.principalOnly);
  return (
    <AdminPage eyebrow="Configurações" title="Parâmetros da operação editorial." action={null}>
      <section className="admin-card p-6">
        <div className="flex gap-3">
          <div className="rounded-xl bg-[#f6d978] p-3"><Settings2 className="h-5 w-5" /></div>
          <div>
            <p className="font-serif text-2xl">Configurações administrativas</p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-oju-terra-suave">Acesse os parâmetros da operação sem misturá-los ao fluxo de publicação.</p>
          </div>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visibleCards.map(card => (
            <article key={card.href} className="rounded-xl border border-oju-terra/10 bg-white p-5">
              <card.icon className="h-5 w-5 text-[#806817]" />
              <p className="mt-4 font-medium">{card.title}</p>
              <p className="mt-2 text-sm leading-6 text-oju-terra-suave">{card.text}</p>
              <Button asChild className="mt-5" size="sm" variant="outline"><Link href={card.href}>{card.action}</Link></Button>
            </article>
          ))}
          <article className="rounded-xl border border-oju-terra/10 bg-white p-5">
            <UserRoundCheck className="h-5 w-5 text-[#806817]" />
            <p className="mt-4 font-medium">Identidade e contato</p>
            <p className="mt-2 text-sm leading-6 text-oju-terra-suave">Acesso administrativo usa contas Google autorizadas individualmente. O e-mail comercial não concede privilégio.</p>
          </article>
        </div>
      </section>
    </AdminPage>
  );
}
