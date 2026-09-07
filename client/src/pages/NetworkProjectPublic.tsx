import { Redirect, useRoute } from "wouter";

export default function NetworkProjectPublic() {
  const [, params] = useRoute("/rede/projetos/:slug");
  if (!params?.slug) return <Redirect to="/projetos" />;
  return <Redirect to={`/historias/${params.slug}`} />;
}
