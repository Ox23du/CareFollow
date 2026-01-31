import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, User, Mail, Phone, Calendar, FileText, Bell, ClipboardCheck, Loader2, X } from 'lucide-react';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';

const PatientDetails = () => {
  const { patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [instructionToDelete, setInstructionToDelete] = useState(null);

  const fetchPatientData = useCallback(async () => {
    try {
      const [patientRes, appointmentsRes, instructionsRes] = await Promise.all([
        api.get(`/patients/${patientId}`),
        api.get(`/appointments?patient_id=${patientId}`),
        api.get(`/instructions?patient_id=${patientId}`)
      ]);
      setPatient(patientRes.data);
      setAppointments(appointmentsRes.data);
      setInstructions(instructionsRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados do paciente');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);

  const handleDeleteInstruction = (instructionId) => {
    setInstructionToDelete(instructionId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteInstruction = async () => {
    if (!instructionToDelete) return;
    
    setDeletingId(instructionToDelete);
    setDeleteDialogOpen(false);
    try {
      console.log(`Deleting instruction: ${instructionToDelete}`);
      const response = await api.delete(`/instructions/${instructionToDelete}`);
      console.log('Delete response:', response.data);
      setInstructions(instructions.filter(ins => ins.instruction_id !== instructionToDelete));
      toast.success('Orientação excluída com sucesso');
    } catch (error) {
      console.error('Delete error full:', error);
      console.error('Delete error response:', error.response);
      const errorMessage = error.response?.data?.detail || error.message || 'Erro ao excluir orientação';
      toast.error(errorMessage);
    } finally {
      setDeletingId(null);
      setInstructionToDelete(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      </Layout>
    );
  }

  if (!patient) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-500">Paciente não encontrado</p>
          <Link to="/patients">
            <Button variant="link" className="mt-4">Voltar para lista</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="patient-details-page">
        <div className="flex items-center gap-4">
          <Link to="/patients">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-900">{patient.name}</h1>
            <p className="text-slate-600">Detalhes do paciente</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Info */}
          <Card className="border-slate-100 shadow-card">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <User className="w-5 h-5 text-teal-600" /> Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700">{patient.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700">{patient.phone}</span>
              </div>
              {patient.birth_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700">{new Date(patient.birth_date).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
              {patient.notes && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-slate-500 mb-1">Observações:</p>
                  <p className="text-slate-700">{patient.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointments */}
          <Card className="border-slate-100 shadow-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-heading flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" /> Atendimentos
              </CardTitle>
              <Link to={`/appointments/new?patient=${patientId}`}>
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700">Novo</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {appointments.length > 0 ? (
                <div className="space-y-3">
                  {appointments.map((apt) => (
                    <div key={apt.appointment_id} className="p-4 bg-slate-50 rounded-xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-slate-900">{apt.procedure}</p>
                          <p className="text-sm text-slate-500">{apt.diagnosis}</p>
                        </div>
                        <Badge variant="outline">{new Date(apt.created_at).toLocaleDateString('pt-BR')}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">Nenhum atendimento registrado</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="border-slate-100 shadow-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" /> Orientações Geradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {instructions.length > 0 ? (
              <div className="space-y-4">
                {instructions.map((ins) => (
                  <div key={ins.instruction_id} className="p-4 bg-slate-50 rounded-xl relative group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-teal-100 text-teal-700">
                          {new Date(ins.created_at).toLocaleDateString('pt-BR')}
                        </Badge>
                        {ins.audio_url && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">Com áudio</Badge>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteInstruction(ins.instruction_id)}
                        disabled={deletingId === ins.instruction_id}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50 disabled:opacity-50"
                        title="Excluir orientação"
                      >
                        {deletingId === ins.instruction_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap line-clamp-4">{ins.text_content}</p>
                    {ins.audio_url && (
                      <audio controls className="w-full mt-3" src={ins.audio_url}>
                        Seu navegador não suporta áudio.
                      </audio>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">Nenhuma orientação gerada</p>
            )}
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDeleteInstruction}
        title="Excluir orientação"
        description="Tem certeza que deseja excluir esta orientação? Esta ação não pode ser desfeita."
      />
    </Layout>
  );
};

export default PatientDetails;
