import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Stethoscope } from 'lucide-react';

const NewAppointment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: searchParams.get('patient') || '',
    procedure: '',
    diagnosis: '',
    notes: '',
    appointment_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    try {
      const response = await api.get('/patients');
      setPatients(response.data);
    } catch (error) {
      toast.error('Erro ao carregar pacientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patient_id) {
      toast.error('Selecione um paciente');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/appointments', formData);
      toast.success('Atendimento registrado com sucesso!');
      navigate('/appointments');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar atendimento');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6" data-testid="new-appointment-page">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-900">Novo Atendimento</h1>
            <p className="text-slate-600">Registre um novo atendimento</p>
          </div>
        </div>

        <Card className="border-slate-100 shadow-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" /> Dados do Atendimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Paciente *</Label>
                <Select value={formData.patient_id} onValueChange={(v) => setFormData({...formData, patient_id: v})}>
                  <SelectTrigger data-testid="patient-select">
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.patient_id} value={p.patient_id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data do Atendimento</Label>
                <Input type="date" value={formData.appointment_date} onChange={(e) => setFormData({...formData, appointment_date: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label>Procedimento *</Label>
                <Input value={formData.procedure} onChange={(e) => setFormData({...formData, procedure: e.target.value})} placeholder="Ex: Consulta de rotina, Exame de sangue" required data-testid="procedure-input" />
              </div>

              <div className="space-y-2">
                <Label>Diagnóstico *</Label>
                <Textarea value={formData.diagnosis} onChange={(e) => setFormData({...formData, diagnosis: e.target.value})} placeholder="Descreva o diagnóstico ou resultado do atendimento" rows={4} required data-testid="diagnosis-input" />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Observações adicionais" rows={3} />
              </div>

              <div className="flex gap-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)}>Cancelar</Button>
                <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={submitting} data-testid="submit-appointment-btn">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar Atendimento'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default NewAppointment;
