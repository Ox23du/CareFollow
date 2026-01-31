import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Users, 
  Calendar, 
  FileText, 
  Bell, 
  ClipboardCheck,
  Plus,
  ArrowRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      title: 'Pacientes', 
      value: stats?.total_patients || 0, 
      icon: Users, 
      color: 'bg-teal-500',
      href: '/patients'
    },
    { 
      title: 'Atendimentos', 
      value: stats?.total_appointments || 0, 
      icon: Calendar, 
      color: 'bg-blue-500',
      href: '/appointments'
    },
    { 
      title: 'Orientações', 
      value: stats?.total_instructions || 0, 
      icon: FileText, 
      color: 'bg-emerald-500',
      href: '/instructions'
    },
    { 
      title: 'Follow-ups Pendentes', 
      value: stats?.pending_followups || 0, 
      icon: ClipboardCheck, 
      color: 'bg-amber-500',
      href: '/followups'
    },
    { 
      title: 'Lembretes Pendentes', 
      value: stats?.pending_reminders || 0, 
      icon: Bell, 
      color: 'bg-coral-500',
      href: '/reminders'
    },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-xl" />
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8" data-testid="staff-dashboard">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-1">Visão geral da clínica</p>
          </div>
          <div className="flex gap-2">
            <Link to="/patients">
              <Button variant="outline" className="gap-2" data-testid="add-patient-btn">
                <Plus className="w-4 h-4" /> Paciente
              </Button>
            </Link>
            <Link to="/appointments/new">
              <Button className="gap-2 bg-teal-600 hover:bg-teal-700" data-testid="add-appointment-btn">
                <Plus className="w-4 h-4" /> Atendimento
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((stat) => (
            <Link key={stat.title} to={stat.href}>
              <Card className="border-slate-100 shadow-card hover:shadow-card-hover transition-all cursor-pointer card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                      <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="border-slate-100 shadow-card lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/appointments/new" className="block">
                <Button variant="outline" className="w-full justify-between group">
                  Novo Atendimento
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/patients" className="block">
                <Button variant="outline" className="w-full justify-between group">
                  Cadastrar Paciente
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/instructions" className="block">
                <Button variant="outline" className="w-full justify-between group">
                  Gerar Orientações
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/reminders" className="block">
                <Button variant="outline" className="w-full justify-between group">
                  Criar Lembrete
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Appointments */}
          <Card className="border-slate-100 shadow-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                  Atendimentos Recentes
                </CardTitle>
                <CardDescription>Últimos 5 atendimentos realizados</CardDescription>
              </div>
              <Link to="/appointments">
                <Button variant="ghost" size="sm" className="gap-1">
                  Ver todos <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {stats?.recent_appointments?.length > 0 ? (
                <div className="space-y-4">
                  {stats.recent_appointments.map((apt) => (
                    <div 
                      key={apt.appointment_id} 
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{apt.procedure}</p>
                        <p className="text-sm text-slate-500">{apt.diagnosis}</p>
                      </div>
                      <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                        {new Date(apt.created_at).toLocaleDateString('pt-BR')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nenhum atendimento registrado</p>
                  <Link to="/appointments/new">
                    <Button variant="link" className="text-teal-600 mt-2">
                      Criar primeiro atendimento
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
