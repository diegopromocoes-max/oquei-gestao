import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Zap, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError("As credenciais inseridas estão incorretas. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      background: 'var(--bg-app)', 
      fontFamily: "'Manrope', 'Inter', sans-serif" 
    }}>
      
      <form onSubmit={handleLogin} style={{ 
        background: 'var(--bg-card)', 
        padding: '50px 40px', 
        borderRadius: '24px', 
        boxShadow: '0 20px 40px rgba(0,0,0,0.08)', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px', 
        width: '100%', 
        maxWidth: '360px',
        border: '1px solid var(--border)',
        animation: 'fadeIn 0.6s ease-out'
      }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--text-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)' }}>
            <Zap size={28} color="white" fill="white" />
          </div>
          <h2 style={{ textAlign: 'center', color: 'var(--text-main)', margin: '0 0 5px 0', fontSize: '24px', fontWeight: '900', letterSpacing: '-0.02em' }}>
            Hub Oquei
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Acesso restrito à equipa interna.</p>
        </div>

        {error && (
          <div style={{ background: 'var(--bg-danger-light)', border: '1px solid var(--border-danger)', padding: '12px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start', color: '#ef4444', fontSize: '12px', fontWeight: '600' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', paddingLeft: '4px' }}>E-mail Corporativo</label>
          <input 
            type="email" 
            placeholder="nome@oquei.com.br" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', background: 'var(--bg-app)', color: 'var(--text-main)', transition: 'border 0.2s', fontWeight: '500' }} 
            onFocus={e => e.target.style.borderColor = 'var(--text-brand)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', paddingLeft: '4px' }}>Senha</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', background: 'var(--bg-app)', color: 'var(--text-main)', transition: 'border 0.2s', fontWeight: '500' }} 
            onFocus={e => e.target.style.borderColor = 'var(--text-brand)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '16px', background: 'var(--text-brand)', color: 'white', border: 'none', borderRadius: '14px', cursor: 'pointer', fontWeight: '800', fontSize: '15px', marginTop: '10px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)', transition: 'transform 0.1s', opacity: loading ? 0.7 : 1
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {loading ? 'A autenticar...' : 'Entrar no Hub'}
        </button>

      </form>
    </div>
  );
}