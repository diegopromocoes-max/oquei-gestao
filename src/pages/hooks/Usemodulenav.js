// ============================================================
//  useModuleNav.js — Oquei Gestão
//  Sprint 1 — Tarefa 1.7: Persistência de navegação via URL
//
//  Hook que sincroniza o módulo ativo com a URL, permitindo:
//  - Recarregar a página e manter o módulo ativo
//  - Voltar/avançar no histórico do browser
//  - Compartilhar links para módulos específicos
//
//  USO:
//    const [activeView, setActiveView] = useModuleNav('dashboard');
//
//  URL resultante:
//    /coordenador/painel/hub_oquei
//    /supervisor/painel/faltas
// ============================================================

import { useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

/**
 * Hook de navegação sincronizado com URL.
 * @param {string} defaultView - módulo padrão se a URL não tiver parâmetro
 * @returns {[string, Function]} [activeView, setActiveView]
 */
export function useModuleNav(defaultView = 'dashboard') {
  const navigate  = useNavigate();
  const params    = useParams();
  const location  = useLocation();

  // Extrai o módulo da URL: /coordenador/painel/:moduleId
  const moduleFromUrl = params['*']?.replace(/^\//, '') || params.moduleId || '';
  const activeView    = moduleFromUrl || defaultView;

  // Sincroniza estado → URL
  const setActiveView = useCallback((moduleId) => {
    if (!moduleId || moduleId === activeView) return;

    // Determina a base da rota pelo pathname
    const base = location.pathname.split('/').slice(0, 2).join('/');
    navigate(`${base}/${moduleId}`, { replace: false });
  }, [navigate, location.pathname, activeView]);

  // Ao montar, se não tiver módulo na URL, navega para o padrão
  useEffect(() => {
    if (!moduleFromUrl && defaultView) {
      const base = location.pathname.split('/').slice(0, 2).join('/');
      navigate(`${base}/${defaultView}`, { replace: true });
    }
  }, [defaultView, location.pathname, moduleFromUrl, navigate]);

  return [activeView, setActiveView];
}
