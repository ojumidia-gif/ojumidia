import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Story from "./pages/Story";
import Taxonomy from "./pages/Taxonomy";
import AdminDashboard from "./pages/admin/AdminDashboard";
import PublicationsAdmin from "./pages/admin/PublicationsAdmin";
import TaxonomiesAdmin from "./pages/admin/TaxonomiesAdmin";
import MediaAdmin from "./pages/admin/MediaAdmin";
import HighlightsAdmin from "./pages/admin/HighlightsAdmin";
import TeamsAdmin from "./pages/admin/TeamsAdmin";
import PublicationPreview from "./pages/admin/PublicationPreview";
import HomePreview from "./pages/admin/HomePreview";
import PublicationEdit from "./pages/admin/PublicationEdit";
import RequestCoverage from "./pages/RequestCoverage";
import AboutOju from "./pages/AboutOju";
import RequestsAdmin from "./pages/admin/RequestsAdmin";
import RevenueAdmin from "./pages/admin/RevenueAdmin";
import AdsAdmin from "./pages/admin/AdsAdmin";
import AdvertisementEdit from "./pages/admin/AdvertisementEdit";
import DocumentaryPhotography from "./pages/DocumentaryPhotography";
import ContractsAdmin from "./pages/admin/ContractsAdmin";
import SettingsAdmin from "./pages/admin/SettingsAdmin";
import MiniclipsAdmin from "./pages/admin/MiniclipsAdmin";
import EditorialFrontsAdmin from "./pages/admin/EditorialFrontsAdmin";
import StoriesPreview from "./pages/StoriesPreview";
import TerritoriesPreview from "./pages/TerritoriesPreview";
import PhotographersPublic from "./pages/PhotographersPublic";
import PhotographerProfile from "./pages/PhotographerProfile";
import ArchivePreview from "./pages/ArchivePreview";
import CoveragesPublic from "./pages/CoveragesPublic";
import DocumentariesPublic from "./pages/DocumentariesPublic";
import ProjectsPublic from "./pages/ProjectsPublic";
import Contact from "./pages/Contact";
import SupportMemory from "./pages/SupportMemory";
import LicenseMedia from "./pages/LicenseMedia";
import CommunityDirectory from "./pages/CommunityDirectory";
import CareConsent from "./pages/CareConsent";
import OralMemorySearch from "./pages/OralMemorySearch";
import InstitutionExplorer from "./pages/InstitutionExplorer";
import CareTracking from "./pages/CareTracking";
import CommunityAdmin from "./pages/admin/CommunityAdmin";
import PhotographersAdmin from "./pages/admin/PhotographersAdmin";
import CommunityAssignmentsAdmin from "./pages/admin/CommunityAssignmentsAdmin";
import InstitutionRegistrationAdmin from "./pages/admin/InstitutionRegistrationAdmin";
import OralMemoryUploadAdmin from "./pages/admin/OralMemoryUploadAdmin";
import CareNotificationsAdmin from "./pages/admin/CareNotificationsAdmin";
import MemoryReviewAdmin from "./pages/admin/MemoryReviewAdmin";
import LocalDevLogin from "./pages/admin/LocalDevLogin";
import InstitutionVisibilityAdmin from "./pages/admin/InstitutionVisibilityAdmin";
import CollaboratorsAdmin from "./pages/admin/CollaboratorsAdmin";
import GovernanceReportsAdmin from "./pages/admin/GovernanceReportsAdmin";
import EarningsAdmin from "./pages/admin/EarningsAdmin";
import CommercialPoliciesAdmin from "./pages/admin/CommercialPoliciesAdmin";
import PayoutNotificationsAdmin from "./pages/admin/PayoutNotificationsAdmin";
import PortalContentAdmin from "./pages/admin/PortalContentAdmin";
import PartnersAdmin from "./pages/admin/PartnersAdmin";
import EditorialTrashAdmin from "./pages/admin/EditorialTrashAdmin";
import MediaTrashAdmin from "./pages/admin/MediaTrashAdmin";
import RetentionAdmin from "./pages/admin/RetentionAdmin";
import OperationsCenterAdmin from "./pages/admin/OperationsCenterAdmin";
import AdminGuides from "./pages/admin/AdminGuides";
import CanalOjuAdmin from "./pages/admin/CanalOjuAdmin";
import AuditAdmin from "./pages/admin/AuditAdmin";
import DocumentaryMemories from "./pages/DocumentaryMemories";
import Services from "./pages/Services";
import CommunityHub from "./pages/CommunityHub";
import PlanRegistration from "./pages/PlanRegistration";
import MiniclipWatch from "./pages/MiniclipWatch";
import LegalDocument from "./pages/LegalDocument";
import BePartner from "./pages/BePartner";
import JoinRequestsAdmin from "./pages/admin/JoinRequestsAdmin";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/miniclipe/:id"} component={MiniclipWatch} />
      <Route path={"/busca"} component={Search} />
      <Route path={"/historias"} component={StoriesPreview} />
      <Route path={"/memorias-documentais"} component={DocumentaryMemories} />
      <Route path={"/servicos"} component={Services} />
      <Route path={"/comunidade"} component={CommunityHub} />
      <Route path={"/sobre"} component={AboutOju} />
      <Route path={"/coberturas"} component={CoveragesPublic} />
      <Route path={"/documentarios"} component={DocumentariesPublic} />
      <Route path={"/projetos"} component={ProjectsPublic} />
      <Route path={"/territorios"} component={TerritoriesPreview} />
      <Route path={"/fotografos"} component={PhotographersPublic} />
      <Route path={"/fotografos/:slug"} component={PhotographerProfile} />
      <Route path={"/acervo"} component={ArchivePreview} />
      <Route path={"/historias/:slug"} component={Story} />
      <Route path={"/territorios/:slug"} component={Taxonomy} />
      <Route path={"/fotografia-documental"} component={DocumentaryPhotography} />
      <Route path={"/contrate-sua-cobertura"} component={RequestCoverage} />
      <Route path={"/planejar-um-registro"} component={PlanRegistration} />
      <Route path={"/contato"} component={Contact} />
      <Route path={"/apoie-uma-memoria"} component={SupportMemory} />
      <Route path={"/licenciar-midia"} component={LicenseMedia} />
      <Route path={"/instituicoes"} component={InstitutionExplorer} />
      <Route path={"/agenda"} component={() => <CommunityDirectory view="agenda" />} />
      <Route path={"/memorias"} component={OralMemorySearch} />
      <Route path={"/cuidado-e-consentimento"} component={CareConsent} />
      <Route path={"/acompanhar-acolhimento"} component={CareTracking} />
      <Route path={"/conheca-a-oju"} component={AboutOju} />
      <Route path={"/termos-de-uso"} component={() => <LegalDocument kind="terms" />} />
      <Route path={"/privacidade"} component={() => <LegalDocument kind="privacy" />} />
      <Route path={"/ser-parceiro"} component={BePartner} />
      <Route path={"/admin/acesso-local"} component={LocalDevLogin} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/admin/guia"} component={AdminGuides} />
      <Route path={"/admin/canal"} component={CanalOjuAdmin} />
      <Route path={"/admin/publicacoes"} component={PublicationsAdmin} />
      <Route path={"/admin/frentes"} component={EditorialFrontsAdmin} />
      <Route path={"/admin/taxonomias"} component={TaxonomiesAdmin} />
      <Route path={"/admin/territorios"} component={TaxonomiesAdmin} />
      <Route path={"/admin/fotografos"} component={PhotographersAdmin} />
      <Route path={"/admin/midias"} component={MediaAdmin} />
      <Route path={"/admin/destaques"} component={HighlightsAdmin} />
      <Route path={"/admin/miniclipes"} component={MiniclipsAdmin} />
      <Route path={"/admin/equipes"} component={TeamsAdmin} />
      <Route path={"/admin/preview/:id"} component={PublicationPreview} />
      <Route path={"/admin/home-preview/:id"} component={HomePreview} />
      <Route path={"/admin/editar/:id"} component={PublicationEdit} />
      <Route path={"/admin/solicitacoes"} component={RequestsAdmin} />
      <Route path={"/admin/receitas"} component={RevenueAdmin} />
      <Route path={"/admin/comunidade"} component={CommunityAdmin} />
      <Route path={"/admin/nova-instituicao"} component={InstitutionRegistrationAdmin} />
      <Route path={"/admin/visibilidade-institucional"} component={InstitutionVisibilityAdmin} />
      <Route path={"/admin/colaboradores"} component={CollaboratorsAdmin} />
      <Route path={"/admin/denuncias"} component={GovernanceReportsAdmin} />
      <Route path={"/admin/candidaturas"} component={JoinRequestsAdmin} />
      <Route path={"/admin/nova-memoria-oral"} component={OralMemoryUploadAdmin} />
      <Route path={"/admin/notificacoes-acolhimento"} component={CareNotificationsAdmin} />
      <Route path={"/admin/revisar-memorias"} component={MemoryReviewAdmin} />
      <Route path={"/admin/distribuicoes-comunidade"} component={CommunityAssignmentsAdmin} />
      <Route path={"/admin/contratos"} component={ContractsAdmin} />
      <Route path={"/admin/configuracoes"} component={SettingsAdmin} />
      <Route path={"/admin/conteudo-portal"} component={PortalContentAdmin} />
      <Route path={"/admin/anuncios"} component={AdsAdmin} />
      <Route path={"/admin/anuncios/:id"} component={AdvertisementEdit} />
      <Route path={"/admin/ganhos"} component={EarningsAdmin} />
      <Route path={"/admin/politicas-comerciais"} component={CommercialPoliciesAdmin} />
      <Route path={"/admin/avisos-repasse"} component={PayoutNotificationsAdmin} />
      <Route path={"/admin/parceiros"} component={PartnersAdmin} />
      <Route path={"/admin/lixeira-editorial"} component={EditorialTrashAdmin} />
      <Route path={"/admin/lixeira-midias"} component={MediaTrashAdmin} />
      <Route path={"/admin/retencao"} component={RetentionAdmin} />
      <Route path={"/admin/pendencias"} component={OperationsCenterAdmin} />
      <Route path={"/admin/auditoria"} component={AuditAdmin} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster position="top-right" richColors closeButton visibleToasts={4} />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
