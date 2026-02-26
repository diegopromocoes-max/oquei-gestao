import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setError("E-mail ou senha incorretos.");
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <form onSubmit={handleLogin} style={{ background: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '15px', width: '320px' }}>
        <h2 style={{ textAlign: 'center', color: '#333' }}>Oquei Telecom</h2>
        <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ddd' }} />
        <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ddd' }} />
        <button type="submit" style={{ padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>ENTRAR</button>
        {error && <p style={{ color: 'red', fontSize: '14px', textAlign: 'center' }}>{error}</p>}
      </form>
    </div>
  );
}