import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="public-page grid min-h-screen w-full place-items-center px-5">
      <section className="public-surface max-w-lg p-10 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-oju-dende" />
        <p className="editorial-kicker mt-6">Página não encontrada</p>
        <h1 className="mt-3 font-serif text-5xl">Este caminho não existe no acervo.</h1>
        <p className="mt-4 text-sm leading-6 text-oju-terra-suave">O endereço pode ter mudado ou o conteúdo ainda não foi publicado. Volte ao portal para continuar a leitura.</p>
        <Button onClick={() => setLocation("/")} className="mt-8">
          <Home className="h-4 w-4" />
          Voltar ao portal
        </Button>
      </section>
    </div>
  );
}
