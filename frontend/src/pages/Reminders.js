import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Bell, Plus, Loader2, Clock, Mail, MessageSquare, Phone, Calendar } from 'lucide-react';

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '', message: '', reminder_type: 'email', scheduled_for: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [remRes, patRes] = await Promise.all([
        api.get('/reminders'),
        api.get('/patients')
      ]);
      setReminders(remRes.data);
      setPatients(patRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/reminders', formData);
      toast.success('Lembrete criado com sucesso!');
      setDialogOpen(false);
      setFormData({ patient_id: '', message: '', reminder_type: 'email', scheduled_for: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar lembrete');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'sms': return <Phone className="w-4 h-4" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'email': return 'Email';
      case 'sms': return 'SMS';
      case 'whatsapp': return 'WhatsApp';
      default: return type;
    }
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="reminders-page">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-900">Lembretes</h1>
            <p className="text-slate-600 mt-1">{reminders.length} lembretes configurados</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-teal-600 hover:bg-teal-700" data-testid="new-reminder-btn">
                <Plus className="w-4 h-4" /> Novo Lembrete
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading">Criar Lembrete</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Paciente *</Label>
                  <Select value={formData.patient_id} onValueChange={(v) => setFormData({...formData, patient_id: v})}>
                    <SelectTrigger data-testid="reminder-patient-select">
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
                  <Label>Tipo de Lembrete</Label>
                  <Select value={formData.reminder_type} onValueChange={(v) => setFormData({...formData, reminder_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data e Hora do Envio *</Label>
                  <Input type="datetime-local" value={formData.scheduled_for} onChange={(e) => setFormData({...formData, scheduled_for: e.target.value})} required data-testid="reminder-datetime" />
                </div>
                <div className="space-y-2">
                  <Label>Mensagem *</Label>
                  <Textarea value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} placeholder="Ex: Lembrete para tomar medicação" rows={4} required data-testid="reminder-message" />
                </div>
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={submitting} data-testid="submit-reminder-btn">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Lembrete'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}
          </div>
        ) : reminders.length > 0 ? (
          <div className="space-y-4">
            {reminders.map((rem) => (
              <Card key={rem.reminder_id} className="border-slate-100 shadow-card">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${rem.sent ? 'bg-green-100' : 'bg-amber-100'}`}>
                        {getTypeIcon(rem.reminder_type)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{rem.message}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(rem.scheduled_for).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{getTypeLabel(rem.reminder_type)}</Badge>
                      <Badge className={rem.sent ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                        {rem.sent ? 'Enviado' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-slate-100">
            <CardContent className="py-12 text-center">
              <Bell className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">Nenhum lembrete configurado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Reminders;
