'use client';

import { useState } from 'react';
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert(error.message);
    } else if (isSignUp) {
      alert("Account created! Check your email to confirm.");
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };
<div style={{ 
      backgroundImage: "url('/bg-trading-1.jpg')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      fontFamily: 'sans-serif' 
    }}></div>
  return (
    <div style={{ 
      backgroundImage: "url('/bg-trading-1.jpg')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      height: '100vh', 
      width: '100vw',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      fontFamily: 'sans-serif' 
    }}>
      {/* Dark Overlay to make the login box pop */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1 }}></div>

      <div style={{ 
        background: 'rgba(17, 17, 17, 0.9)', 
        padding: '40px', 
        borderRadius: '16px', 
        border: '1px solid #333', 
        width: '380px',
        backdropFilter: 'blur(10px)', // Glass-morphism effect
        zIndex: 2,
        boxShadow: '0 0 40px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ color: '#fff', marginBottom: '8px', textAlign: 'center', fontWeight: 900, letterSpacing: '2px' }}>
          COMMAND CENTER
        </h2>
        <p style={{ color: '#666', fontSize: '12px', textAlign: 'center', marginBottom: '32px' }}>
          v1.0 TERMINAL ACCESS
        </p>
        
        <form onSubmit={handleAuth}>
          <input 
            type="email" 
            placeholder="IDENTITY (EMAIL)"
            required
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '14px', marginBottom: '16px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '4px', outline: 'none' }} 
          />
          <input 
            type="password" 
            placeholder="ACCESS CODE"
            required
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '14px', marginBottom: '24px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '4px', outline: 'none' }} 
          />
          
          <button 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '16px', 
              background: '#3b82f6', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '6px', 
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'AUTHENTICATING...' : 'INITIATE SESSION'}
          </button>
        </form>

        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          style={{ width: '100%', background: 'transparent', color: '#4b5563', border: 'none', marginTop: '20px', fontSize: '12px', cursor: 'pointer' }}
        >
          {isSignUp ? "Already have access? Log In" : "Need new credentials? Sign Up"}
        </button>
      </div>
    </div>
  );
}