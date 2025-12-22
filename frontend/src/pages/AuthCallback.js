import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { handleGoogleCallback } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processCallback = async () => {
      try {
        // Get session_id from URL hash
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', ''));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          toast.error('Sessão inválida');
          navigate('/login');
          return;
        }

        const user = await handleGoogleCallback(sessionId);
        toast.success('Login realizado com sucesso!');
        
        // Clear the hash
        window.history.replaceState(null, '', window.location.pathname);
        
        navigate(user.role === 'patient' ? '/portal' : '/dashboard', { 
          replace: true,
          state: { user }
        });
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Erro ao autenticar com Google');
        navigate('/login');
      }
    };

    processCallback();
  }, [handleGoogleCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
        <p className="text-slate-600">Autenticando...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
