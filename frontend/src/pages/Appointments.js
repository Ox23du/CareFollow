import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../contexts/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Calendar, Plus, User, FileText, Stethoscope } from 'lucide-react';

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAppointments(); }, []);

  const fetchAppointments = async () => {
    try {
      const response = await api.get('/appointments');
      setAppointments(response.data);
    } catch (error) {
      toast.error('Erro ao carregar atendimentos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="appointments-page">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-900">Atendimentos</h1>
            <p className="text-slate-600 mt-1">{appointments.length} atendimentos registrados</p>
          </div>
          <Link to="/appointments/new">
            <Button className="gap-2 bg-teal-600 hover:bg-teal-700" data-testid="new-appointment-btn">
              <Plus className="w-4 h-4" /> Novo Atendimento
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}
          </div>
        ) : appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((apt) => (
              <Card key={apt.appointment_id} className="border-slate-100 shadow-card hover:shadow-card-hover transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{apt.procedure}</h3>
                        <p className="text-sm text-slate-500 mt-1">{apt.diagnosis}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            <User className="w-3.5 h-3.5" />
                            {apt.patient_name || 'Paciente'}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(apt.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/instructions?appointment=${apt.appointment_id}`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <FileText className="w-4 h-4" /> Orientações
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-slate-100">
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">Nenhum atendimento registrado</p>
              <Link to="/appointments/new">
                <Button variant="link" className="text-teal-600 mt-2">Criar primeiro atendimento</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Appointments;
