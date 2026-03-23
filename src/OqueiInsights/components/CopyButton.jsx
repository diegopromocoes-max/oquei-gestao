import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { colors } from '../../components/ui';

export default function CopyButton({ text, label = 'Copiar' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '6px 12px',
        borderRadius: '8px',
        border: `1px solid ${copied ? `${colors.success}55` : 'var(--border)'}`,
        background: copied ? `${colors.success}12` : 'var(--bg-app)',
        color: copied ? colors.success : 'var(--text-muted)',
        fontWeight: '800',
        fontSize: '11px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copiado!' : label}
    </button>
  );
}
