import {
  Activity,
  BarChart2,
  BarChart3,
  BookMarked,
  BookOpen,
  Calendar,
  CalendarClock,
  Clock,
  Crosshair,
  FileCheck,
  FileSpreadsheet,
  Flame,
  FlaskConical,
  Gift,
  Globe,
  HeartHandshake,
  LayoutDashboard,
  LayoutGrid,
  Link as LinkIcon,
  MapPin,
  Megaphone,
  MessageSquare,
  MonitorPlay,
  PlusCircle,
  Radar,
  Router,
  Settings,
  ShoppingBag,
  Store,
  Target,
  Telescope,
  Trophy,
  Tv,
  TrendingUp,
  UploadCloud,
  UserPlus,
  UserX,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';

import { colors } from '../components/ui';
import { ROLE_KEYS, ROLE_LABELS } from './roleUtils';

export const PANEL_KEYS = {
  COORDINATOR: 'coordinator',
  SUPERVISOR: 'supervisor',
  GROWTH: 'growth',
  ATTENDANT: 'attendant',
};

export const PANEL_LABELS = {
  [PANEL_KEYS.COORDINATOR]: 'Painel Coordenador',
  [PANEL_KEYS.SUPERVISOR]: 'Painel Supervisor',
  [PANEL_KEYS.GROWTH]: 'Painel Growth',
  [PANEL_KEYS.ATTENDANT]: 'Painel Atendente',
};

export const MANAGED_ROLE_KEYS = [
  ROLE_KEYS.COORDINATOR,
  ROLE_KEYS.SUPERVISOR,
  ROLE_KEYS.GROWTH,
  ROLE_KEYS.ATTENDANT,
];

export const MANAGED_ROLE_OPTIONS = MANAGED_ROLE_KEYS.map((roleKey) => ({
  value: roleKey,
  label: ROLE_LABELS[roleKey],
}));

const roleMap = (...enabledRoles) =>
  enabledRoles.reduce((acc, role) => {
    acc[role] = true;
    return acc;
  }, {});

const buildModule = (panel, id, label, section, icon, color, role) => ({
  panel,
  id,
  label,
  section,
  icon,
  color,
  defaultEnabledByRole: roleMap(role),
});

export const MODULE_CATALOG = [
  buildModule(PANEL_KEYS.COORDINATOR, 'dashboard', 'Visão Master', 'Principal', Globe, colors.warning, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'comunicados', 'Comunicados', 'Principal', Megaphone, colors.primary, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'wallboard', 'Modo TV', 'Principal', Tv, colors.info, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'hub_oquei', 'HubOquei Radar', 'Inteligência', Zap, colors.info, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'churn', 'Laboratório Churn', 'Inteligência', Activity, colors.purple, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'oquei_insights', 'Oquei Pesquisas', 'Inteligência', Telescope, colors.danger, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'admin_supervisores', 'Supervisores', 'Gestão', UserPlus, colors.purple, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'atendentes', 'Time de Vendas', 'Gestão', Users, colors.primary, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'estrutura', 'Estrutura Lojas', 'Gestão', MapPin, colors.primary, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'produtos', 'Produtos/SVA', 'Gestão', ShoppingBag, colors.warning, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'lojas_view', 'Portfolio Lojas', 'Gestão', Store, colors.success, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'faltas', 'Faltas Globais', 'Gestão', UserX, colors.danger, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'rh_requests', 'Pedidos RH', 'Gestão', FileCheck, colors.warning, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'gestao_metas', 'Gestão de Metas', 'Gestão', Target, colors.success, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'planos_crescimento', 'Hub de Crescimento', 'Gestão', TrendingUp, colors.success, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'desempenho', 'Desempenho', 'Gestão', Activity, colors.info, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'apuracao_resultados', 'Apuração de Resultados', 'Gestão', UploadCloud, colors.primary, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'vendas', 'Painel Vendas', 'Sistemas', TrendingUp, colors.success, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'war_room', 'Sala de Guerra', 'Sistemas', Flame, colors.danger, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'banco_horas', 'Banco de Horas', 'Sistemas', Clock, colors.warning, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'desencaixe', 'Caixa Local', 'Sistemas', Wallet, colors.success, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'japa', 'Ações do Japa', 'Marketing', Gift, colors.rose, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'patrocinio', 'Patrocínio', 'Marketing', HeartHandshake, colors.amber, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'solicitar_campanha', 'Solicitar Campanha', 'Marketing', Megaphone, colors.warning, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'conteudos_digitais', 'Conteúdos Digitais', 'Marketing', MonitorPlay, colors.info, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'reunioes', 'Agenda', 'Agenda', CalendarClock, colors.primary, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'roteadores', 'Catálogo Roteadores', 'Ferramentas', Router, colors.info, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'devolucoes', 'Devoluções', 'Ferramentas', FileCheck, colors.success, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'configuracoes', 'Configurações', 'Ferramentas', Settings, colors.primary, ROLE_KEYS.COORDINATOR),
  buildModule(PANEL_KEYS.COORDINATOR, 'links', 'Links Úteis', 'Ferramentas', LayoutGrid, colors.neutral, ROLE_KEYS.COORDINATOR),

  buildModule(PANEL_KEYS.SUPERVISOR, 'dashboard', 'Visão Geral', 'Principal', Globe, colors.warning, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'comunicados', 'Comunicados', 'Principal', Megaphone, colors.primary, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'wallboard', 'Modo TV', 'Principal', Tv, colors.info, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'hub_oquei', 'HubOquei Radar', 'Inteligência', Zap, colors.info, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'churn', 'Laboratório Churn', 'Inteligência', Activity, colors.purple, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'oquei_insights', 'Oquei Pesquisas', 'Inteligência', Telescope, colors.danger, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'admin_supervisores', 'Supervisores', 'Gestão', UserPlus, colors.purple, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'atendentes', 'Time de Vendas', 'Gestão', Users, colors.primary, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'estrutura', 'Estrutura Lojas', 'Gestão', MapPin, colors.primary, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'produtos', 'Produtos/SVA', 'Gestão', ShoppingBag, colors.warning, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'lojas_view', 'Portfolio Lojas', 'Gestão', Store, colors.success, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'faltas', 'Faltas Globais', 'Gestão', UserX, colors.danger, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'rh_requests', 'Pedidos RH', 'Gestão', FileCheck, colors.warning, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'gestao_metas', 'Gestão de Metas', 'Gestão', Target, colors.success, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'planos_crescimento', 'Hub de Crescimento', 'Gestão', TrendingUp, colors.success, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'desempenho', 'Desempenho', 'Gestão', Activity, colors.info, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'apuracao_resultados', 'Apuração de Resultados', 'Gestão', UploadCloud, colors.primary, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'vendas', 'Painel Vendas', 'Sistemas', TrendingUp, colors.success, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'crm_ativo', 'CRM Ativo', 'Sistemas', Crosshair, colors.primary, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'war_room', 'Sala de Guerra', 'Sistemas', Flame, colors.danger, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'banco_horas', 'Banco de Horas', 'Sistemas', Clock, colors.warning, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'desencaixe', 'Caixa Local', 'Sistemas', Wallet, colors.success, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'japa', 'Ações do Japa', 'Marketing', Gift, colors.rose, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'patrocinio', 'Patrocínio', 'Marketing', HeartHandshake, colors.amber, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'solicitar_campanha', 'Solicitar Campanha', 'Marketing', Megaphone, colors.warning, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'conteudos_digitais', 'Conteúdos Digitais', 'Marketing', MonitorPlay, colors.info, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'reunioes', 'Agenda', 'Agenda', CalendarClock, colors.primary, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'roteadores', 'Catálogo Roteadores', 'Ferramentas', Router, colors.info, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'devolucoes', 'Devoluções', 'Ferramentas', FileCheck, colors.success, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'configuracoes', 'Configurações', 'Ferramentas', Settings, colors.primary, ROLE_KEYS.SUPERVISOR),
  buildModule(PANEL_KEYS.SUPERVISOR, 'links', 'Links Úteis', 'Ferramentas', LayoutGrid, colors.neutral, ROLE_KEYS.SUPERVISOR),

  buildModule(PANEL_KEYS.GROWTH, 'visao_geral', 'Visão Geral', 'Principal', LayoutDashboard, colors.warning, ROLE_KEYS.GROWTH),
  buildModule(PANEL_KEYS.GROWTH, 'hub', 'Hub de Crescimento', 'Principal', Zap, colors.primary, ROLE_KEYS.GROWTH),
  buildModule(PANEL_KEYS.GROWTH, 'comunicados', 'Comunicados', 'Principal', MessageSquare, colors.primary, ROLE_KEYS.GROWTH),
  buildModule(PANEL_KEYS.GROWTH, 'agenda', 'Minha Agenda', 'Principal', Calendar, colors.info, ROLE_KEYS.GROWTH),
  buildModule(PANEL_KEYS.GROWTH, 'acoes_japa', 'Ações do Japa', 'Marketing', Zap, colors.warning, ROLE_KEYS.GROWTH),
  buildModule(PANEL_KEYS.GROWTH, 'patrocinio', 'Solicitar Patrocínio', 'Marketing', HeartHandshake, colors.amber, ROLE_KEYS.GROWTH),
  buildModule(PANEL_KEYS.GROWTH, 'eventos', 'Eventos', 'Marketing', Trophy, colors.success, ROLE_KEYS.GROWTH),
  buildModule(PANEL_KEYS.GROWTH, 'campanha', 'Solicitar Campanha', 'Marketing', Megaphone, colors.warning, ROLE_KEYS.GROWTH),
  buildModule(PANEL_KEYS.GROWTH, 'roteadores', 'Catálogo de Roteadores', 'Ferramentas', Router, colors.info, ROLE_KEYS.GROWTH),
  buildModule(PANEL_KEYS.GROWTH, 'links', 'Links Úteis', 'Ferramentas', Globe, colors.neutral, ROLE_KEYS.GROWTH),
  buildModule(PANEL_KEYS.GROWTH, 'planilhas', 'Planilhas Essenciais', 'Ferramentas', FileSpreadsheet, colors.primary, ROLE_KEYS.GROWTH),
  buildModule(PANEL_KEYS.GROWTH, 'gestao_metas', 'Gestão de Metas', 'Inteligência', Target, colors.success, ROLE_KEYS.GROWTH),
  buildModule(PANEL_KEYS.GROWTH, 'apuracao_resultados', 'Apuração de Resultados', 'Inteligência', BarChart2, colors.primary, ROLE_KEYS.GROWTH),
  buildModule(PANEL_KEYS.GROWTH, 'hub_oquei', 'Hub Oquei / Radar', 'Inteligência', Radar, colors.info, ROLE_KEYS.GROWTH),
  buildModule(PANEL_KEYS.GROWTH, 'laboratorio_churn', 'Laboratório Churn', 'Inteligência', FlaskConical, colors.purple, ROLE_KEYS.GROWTH),
  buildModule(PANEL_KEYS.GROWTH, 'oquei_insights', 'Oquei Pesquisas', 'Inteligência', Telescope, colors.danger, ROLE_KEYS.GROWTH),
  buildModule(PANEL_KEYS.GROWTH, 'configuracoes', 'Configurações', 'Ferramentas', Settings, colors.primary, ROLE_KEYS.GROWTH),

  buildModule(PANEL_KEYS.ATTENDANT, 'inicio', 'Início', 'Geral', Globe, colors.success, ROLE_KEYS.ATTENDANT),
  buildModule(PANEL_KEYS.ATTENDANT, 'graficos', 'Meus Gráficos', 'Geral', BarChart3, colors.rose, ROLE_KEYS.ATTENDANT),
  buildModule(PANEL_KEYS.ATTENDANT, 'nova_venda', 'Registrar Lead', 'Comercial', PlusCircle, colors.primary, ROLE_KEYS.ATTENDANT),
  buildModule(PANEL_KEYS.ATTENDANT, 'clientes', 'Meu Funil', 'Comercial', Users, colors.success, ROLE_KEYS.ATTENDANT),
  buildModule(PANEL_KEYS.ATTENDANT, 'relatorio_leads', 'Relatório Mensal', 'Comercial', FileSpreadsheet, colors.purple, ROLE_KEYS.ATTENDANT),
  buildModule(PANEL_KEYS.ATTENDANT, 'mapa_leads', 'Meu mapa de Leads', 'Comercial', MapPin, colors.primary, ROLE_KEYS.ATTENDANT),
  buildModule(PANEL_KEYS.ATTENDANT, 'rh', 'Solicitações RH', 'Ferramentas', FileCheck, colors.warning, ROLE_KEYS.ATTENDANT),
  buildModule(PANEL_KEYS.ATTENDANT, 'colinhas', 'Colinhas', 'Ferramentas', BookMarked, colors.purple, ROLE_KEYS.ATTENDANT),
  buildModule(PANEL_KEYS.ATTENDANT, 'desencaixe', 'Caixa da Loja', 'Ferramentas', Wallet, colors.success, ROLE_KEYS.ATTENDANT),
  buildModule(PANEL_KEYS.ATTENDANT, 'roteadores', 'Catálogo Roteadores', 'Ferramentas', Router, colors.info, ROLE_KEYS.ATTENDANT),
  buildModule(PANEL_KEYS.ATTENDANT, 'devolucoes', 'Devoluções', 'Ferramentas', FileCheck, colors.success, ROLE_KEYS.ATTENDANT),
  buildModule(PANEL_KEYS.ATTENDANT, 'manual', 'Manual', 'Ferramentas', BookOpen, colors.info, ROLE_KEYS.ATTENDANT),
  buildModule(PANEL_KEYS.ATTENDANT, 'japa', 'Ações do Japa', 'Consulta & Escala', Zap, colors.warning, ROLE_KEYS.ATTENDANT),
  buildModule(PANEL_KEYS.ATTENDANT, 'escala', 'Escala da Rede', 'Consulta & Escala', Calendar, colors.primary, ROLE_KEYS.ATTENDANT),
  buildModule(PANEL_KEYS.ATTENDANT, 'links', 'Links Úteis', 'Consulta & Escala', LinkIcon, colors.neutral, ROLE_KEYS.ATTENDANT),
  buildModule(PANEL_KEYS.ATTENDANT, 'configuracoes', 'Configurações', 'Ferramentas', Settings, colors.primary, ROLE_KEYS.ATTENDANT),
];

export function getModulesForPanel(panel) {
  return MODULE_CATALOG.filter((module) => module.panel === panel);
}

export function getModuleDefinition(panel, id) {
  return MODULE_CATALOG.find((module) => module.panel === panel && module.id === id) || null;
}
