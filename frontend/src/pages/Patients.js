import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Users, Plus, Search, Phone, Mail, Calendar, Loader2, User } from 'lucide-react';

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', birth_date: '', notes: ''
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
    setSubmitting(true);
    try {
      await api.post('/patients', formData);
      toast.success('Paciente cadastrado com sucesso!');
      setDialogOpen(false);
      setFormData({ name: '', email: '', phone: '', birth_date: '', notes: '' });
      fetchPatients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cadastrar paciente');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6" data-testid="patients-page">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-900">Pacientes</h1>
            <p className="text-slate-600 mt-1">{patients.length} pacientes cadastrados</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-teal-600 hover:bg-teal-700" data-testid="new-patient-btn">
                <Plus className="w-4 h-4" /> Novo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading">Cadastrar Paciente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome completo *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required data-testid="patient-name-input" />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required data-testid="patient-email-input" />
                </div>
                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required data-testid="patient-phone-input" />
                </div>
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input type="date" value={formData.birth_date} onChange={(e) => setFormData({...formData, birth_date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
                </div>
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={submitting} data-testid="submit-patient-btn">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cadastrar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar pacientes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" data-testid="search-patients" />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-slate-200 rounded-xl animate-pulse" />)}
          </div>
        ) : filteredPatients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient) => (
              <Link key={patient.patient_id} to={`/patients/${patient.patient_id}`}>
                <Card className="border-slate-100 shadow-card hover:shadow-card-hover transition-all cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">{patient.name}</h3>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="truncate">{patient.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{patient.phone}</span>
                          </div>
                          {patient.birth_date && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{new Date(patient.birth_date).toLocaleDateString('pt-BR')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-slate-100">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">Nenhum paciente encontrado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Patients;
