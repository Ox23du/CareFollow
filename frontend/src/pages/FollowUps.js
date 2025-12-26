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
import { ClipboardCheck, Plus, Loader2, Calendar, User, CheckCircle } from 'lucide-react';

const FollowUps = () => {
  const [followups, setFollowups] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '', follow_up_date: '', reason: '', notes: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [fupRes, patRes] = await Promise.all([
        api.get('/followups'),
        api.get('/patients')
      ]);
      setFollowups(fupRes.data);
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
      await api.post('/followups', formData);
      toast.success('Follow-up criado com sucesso!');
      setDialogOpen(false);
      setFormData({ patient_id: '', follow_up_date: '', reason: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (followupId) => {
    try {
      await api.patch(`/followups/${followupId}/complete`);
      toast.success('Follow-up concluído!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao concluir follow-up');
    }
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="followups-page">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-900">Follow-ups</h1>
            <p className="text-slate-600 mt-1">{followups.filter(f => !f.completed).length} pendentes</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-teal-600 hover:bg-teal-700" data-testid="new-followup-btn">
                <Plus className="w-4 h-4" /> Novo Follow-up
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading">Agendar Follow-up</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Paciente *</Label>
                  <Select value={formData.patient_id} onValueChange={(v) => setFormData({...formData, patient_id: v})}>
                    <SelectTrigger data-testid="followup-patient-select">
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
                  <Label>Data do Follow-up *</Label>
                  <Input type="datetime-local" value={formData.follow_up_date} onChange={(e) => setFormData({...formData, follow_up_date: e.target.value})} required data-testid="followup-date" />
                </div>
                <div className="space-y-2">
                  <Label>Motivo *</Label>
                  <Input value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} placeholder="Ex: Verificar evolução do tratamento" required data-testid="followup-reason" />
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Observações adicionais" rows={3} />
                </div>
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={submitting} data-testid="submit-followup-btn">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Agendar Follow-up'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}
          </div>
        ) : followups.length > 0 ? (
          <div className="space-y-4">
            {followups.map((fup) => (
              <Card key={fup.followup_id} className={`border-slate-100 shadow-card ${fup.completed ? 'opacity-60' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${fup.completed ? 'bg-green-100' : 'bg-teal-100'}`}>
                        {fup.completed ? <CheckCircle className="w-6 h-6 text-green-600" /> : <ClipboardCheck className="w-6 h-6 text-teal-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{fup.reason}</p>
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            <User className="w-3.5 h-3.5" />
                            {fup.patient_name}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(fup.follow_up_date).toLocaleString('pt-BR')}
                          </div>
                        </div>
                        {fup.notes && <p className="text-sm text-slate-500 mt-2">{fup.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge className={fup.completed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                        {fup.completed ? 'Concluído' : 'Pendente'}
                      </Badge>
                      {!fup.completed && (
                        <Button size="sm" variant="outline" onClick={() => handleComplete(fup.followup_id)} data-testid={`complete-${fup.followup_id}`}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Concluir
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-slate-100">
            <CardContent className="py-12 text-center">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">Nenhum follow-up agendado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default FollowUps;
