import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { toast } from 'sonner';
import { Heart, LogOut, FileText, Bell, Calendar, Volume2, User, Clock, Loader2 } from 'lucide-react';

// Helper function to clean AI-generated text
const cleanAIText = (text) => {
  if (!text) return '';
  return text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^[-*•]\s*/gm, '• ')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^---+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const PatientPortal = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPortalData(); }, []);

  const fetchPortalData = async () => {
    try {
      const response = await api.get('/patient/portal');
      setData(response.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'P';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50" data-testid="patient-portal">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-slate-200/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-bold text-xl text-slate-900">CareFollow</span>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6 animate-fade-in">
        {/* Welcome */}
        <Card className="border-slate-100 shadow-card bg-gradient-to-br from-teal-600 to-teal-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-white/20">
                <AvatarImage src={user?.picture} />
                <AvatarFallback className="bg-white/20 text-white text-xl">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-heading text-2xl font-bold">Olá, {user?.name?.split(' ')[0]}!</h1>
                <p className="text-teal-100 mt-1">Bem-vindo ao seu portal de saúde</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-slate-100 shadow-card">
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 mx-auto text-teal-600 mb-2" />
              <p className="text-2xl font-bold text-slate-900">{data?.appointments?.length || 0}</p>
              <p className="text-sm text-slate-500">Atendimentos</p>
            </CardContent>
          </Card>
          <Card className="border-slate-100 shadow-card">
            <CardContent className="p-4 text-center">
              <FileText className="w-6 h-6 mx-auto text-teal-600 mb-2" />
              <p className="text-2xl font-bold text-slate-900">{data?.instructions?.length || 0}</p>
              <p className="text-sm text-slate-500">Orientações</p>
            </CardContent>
          </Card>
          <Card className="border-slate-100 shadow-card">
            <CardContent className="p-4 text-center">
              <Bell className="w-6 h-6 mx-auto text-teal-600 mb-2" />
              <p className="text-2xl font-bold text-slate-900">{data?.reminders?.length || 0}</p>
              <p className="text-sm text-slate-500">Lembretes</p>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="border-slate-100 shadow-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" /> Suas Orientações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.instructions?.length > 0 ? (
              <div className="space-y-4">
                {data.instructions.map((ins) => (
                  <div key={ins.instruction_id} className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-teal-100 text-teal-700">
                        {new Date(ins.created_at).toLocaleDateString('pt-BR')}
                      </Badge>
                      {ins.audio_url && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          <Volume2 className="w-3 h-3 mr-1" /> Áudio
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{cleanAIText(ins.text_content)}</p>
                    {ins.audio_url && (
                      <audio controls className="w-full mt-4" src={ins.audio_url}>
                        Seu navegador não suporta áudio.
                      </audio>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">Nenhuma orientação disponível</p>
            )}
          </CardContent>
        </Card>

        {/* Reminders */}
        <Card className="border-slate-100 shadow-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Bell className="w-5 h-5 text-teal-600" /> Seus Lembretes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.reminders?.length > 0 ? (
              <div className="space-y-3">
                {data.reminders.map((rem) => (
                  <div key={rem.reminder_id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${rem.sent ? 'bg-green-100' : 'bg-amber-100'}`}>
                      <Bell className={`w-5 h-5 ${rem.sent ? 'text-green-600' : 'text-amber-600'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{rem.message}</p>
                      <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(rem.scheduled_for).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <Badge className={rem.sent ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                      {rem.sent ? 'Enviado' : 'Agendado'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">Nenhum lembrete agendado</p>
            )}
          </CardContent>
        </Card>

        {/* Follow-ups */}
        <Card className="border-slate-100 shadow-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" /> Próximos Retornos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.followups?.filter(f => !f.completed).length > 0 ? (
              <div className="space-y-3">
                {data.followups.filter(f => !f.completed).map((fup) => (
                  <div key={fup.followup_id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{fup.reason}</p>
                      <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(fup.follow_up_date).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">Nenhum retorno agendado</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PatientPortal;
