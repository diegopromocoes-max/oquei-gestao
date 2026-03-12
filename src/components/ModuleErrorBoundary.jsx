// ============================================================
//  ModuleErrorBoundary.jsx — Oquei Gestão
//  Sprint 1 — Tarefa 1.4: Error Boundary por módulo
//
//  ✅ Captura erros de qualquer módulo filho sem derrubar o app
//  ✅ UI de fallback padronizada com design system
//  ✅ Botão de retry que limpa o estado de erro
//  ✅ Exibe stack trace em desenvolvimento
//  ✅ window.showToast automático ao detectar erro
// ============================================================

import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { colors } from './ui';

// ─────────────────────────────────────────────────────────────
// ERROR BOUNDARY (Class Component — único caso obrigatório)
// ─────────────────────────────────────────────────────────────
export default class ModuleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log para debug
    console.error('[ModuleErrorBoundary] Erro capturado:', error);
    console.error('[ModuleErrorBoundary] Info do componente:', errorInfo);

    // Toast global (não-bloqueante)
    try {
      window.showToast?.('Erro ao carregar módulo. Tente novamente.', 'error');
    } catch (_) { /* showToast pode não estar disponível ainda */ }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const isDev = import.meta.env?.DEV ?? process.env.NODE_ENV === 'development';

    if (!hasError) {
      return this.props.children;
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '40px 24px',
        gap: '16px',
        animation: 'ui-fadeIn 0.3s ease-out',
      }}>

        {/* Ícone */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: `${colors.danger}18`,
          border: `1px solid ${colors.danger}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <AlertCircle size={26} color={colors.danger} />
        </div>

        {/* Título */}
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{
            fontSize: '16px',
            fontWeight: '900',
            color: 'var(--text-main)',
            margin: '0 0 8px',
          }}>
            Erro ao carregar módulo
          </p>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            Ocorreu um problema ao renderizar este componente.
            {' '}Clique em <strong style={{ color: 'var(--text-main)' }}>Tentar Novamente</strong> para recarregar.
          </p>
        </div>

        {/* Mensagem de erro (dev only) */}
        {isDev && error && (
          <div style={{
            width: '100%',
            maxWidth: '600px',
            background: `${colors.danger}10`,
            border: `1px solid ${colors.danger}30`,
            borderRadius: '12px',
            padding: '14px 16px',
          }}>
            <p style={{
              fontSize: '11px',
              fontWeight: '900',
              color: colors.danger,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 8px',
            }}>
              DEV — Stack Trace
            </p>
            <pre style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: "'Courier New', monospace",
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
              maxHeight: '160px',
              overflowY: 'auto',
            }}>
              {error.toString()}
              {errorInfo?.componentStack}
            </pre>
          </div>
        )}

        {/* Ações */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button
            onClick={this.handleRetry}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: colors.primary,
              color: '#fff',
              fontSize: '13px',
              fontWeight: '800',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            <RefreshCw size={15} />
            Tentar Novamente
          </button>

          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-main)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <Home size={15} />
            Recarregar App
          </button>
        </div>

      </div>
    );
  }
}

// ─────────────────────────────────────────────────────────────
// APP ERROR BOUNDARY — versão mais leve para o nível do App.jsx
// ─────────────────────────────────────────────────────────────
export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[AppErrorBoundary] Erro crítico:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#020617',
        gap: '20px',
        padding: '40px',
        fontFamily: "'Manrope', sans-serif",
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '18px',
          background: `${colors.danger}18`,
          border: `1px solid ${colors.danger}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertCircle size={30} color={colors.danger} />
        </div>

        <div style={{ textAlign: 'center', maxWidth: '440px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#f1f5f9', margin: '0 0 10px' }}>
            Algo deu errado
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, margin: '0 0 24px' }}>
            O sistema encontrou um erro inesperado. Recarregue a página para continuar.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 28px', borderRadius: '12px', border: 'none',
              background: colors.primary, color: '#fff',
              fontSize: '14px', fontWeight: '800', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }
}