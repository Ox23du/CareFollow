import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Heart, Mail, Lock, Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const user = await login(email, password);
      toast.success('Login realizado com sucesso!');
      navigate(user.role === 'patient' ? '/portal' : '/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center mb-4 shadow-lg">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">CareFollow</h1>
          <p className="text-slate-600 mt-1">Sistema de Pós-Atendimento</p>
        </div>

        <Card className="border-slate-100 shadow-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-heading text-center">Entrar</CardTitle>
            <CardDescription className="text-center">
              Acesse como profissional da clínica ou paciente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-slate-50"
                    required
                    data-testid="login-email-input"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 bg-slate-50"
                    required
                    data-testid="login-password-input"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-teal-600 hover:bg-teal-700"
                disabled={loading}
                data-testid="login-submit-btn"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-600 mt-6">
              Não tem uma conta?{' '}
              <Link to="/register" className="text-teal-600 hover:underline font-medium">
                Registre-se
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Info boxes */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-100 text-center">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-2">
              <Heart className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-sm font-medium text-slate-900">Profissional</p>
            <p className="text-xs text-slate-500">Gerencie pacientes</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-100 text-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-slate-900">Paciente</p>
            <p className="text-xs text-slate-500">Veja orientações</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
