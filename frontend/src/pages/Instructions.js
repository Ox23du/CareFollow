import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { FileText, Sparkles, Loader2, Volume2, Calendar, X } from 'lucide-react';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';

// Helper function to clean AI-generated text (remove markdown characters)
const cleanAIText = (text) => {
  if (!text) return '';
  return text
    // Remove markdown headers
    .replace(/#{1,6}\s*/g, '')
    // Remove bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove bullet points and replace with proper formatting
    .replace(/^[-*•]\s*/gm, '• ')
    // Remove numbered list markers but keep the number
    .replace(/^\d+\.\s*/gm, (match) => match)
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    .replace(/^___+$/gm, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const Instructions = () => {
  const [appointments, setAppointments] = useState([]);
  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState('');
  const [generateAudio, setGenerateAudio] = useState(true);
  const [progress, setProgress] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [instructionToDelete, setInstructionToDelete] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [aptRes, insRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/instructions')
      ]);
      setAppointments(aptRes.data);
      setInstructions(insRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedAppointment) {
      toast.error('Selecione um atendimento');
      return;
    }
    setGenerating(true);
    setProgress('Gerando orientações com IA...');
    
    try {
      // Show progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev.includes('IA...')) return 'Processando texto...';
          if (prev.includes('texto...')) return generateAudio ? 'Gerando áudio...' : 'Finalizando...';
          if (prev.includes('áudio...')) return 'Finalizando...';
          return prev;
        });
      }, 5000);

      const response = await api.post('/instructions/generate', {
        appointment_id: selectedAppointment,
        generate_audio: generateAudio
      }, {
        timeout: 180000 // 3 minutes for AI + audio generation
      });
      
      clearInterval(progressInterval);
      toast.success('Orientações geradas com sucesso!');
      setInstructions([response.data, ...instructions]);
      setSelectedAppointment('');
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error('A geração demorou muito. Tente novamente ou desative o áudio.');
      } else {
        toast.error(error.response?.data?.detail || 'Erro ao gerar orientações');
      }
    } finally {
      setGenerating(false);
      setProgress('');
    }
  };

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

  return (
    <Layout>
      <div className="space-y-6" data-testid="instructions-page">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Orientações</h1>
          <p className="text-slate-600 mt-1">Gere orientações personalizadas com IA</p>
        </div>

        {/* Generate Section */}
        <Card className="border-slate-100 shadow-card bg-gradient-to-br from-teal-50 to-slate-50">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" /> Gerar Novas Orientações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Selecione o Atendimento</Label>
                <Select value={selectedAppointment} onValueChange={setSelectedAppointment}>
                  <SelectTrigger data-testid="appointment-select">
                    <SelectValue placeholder="Escolha um atendimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {appointments.map((apt) => (
                      <SelectItem key={apt.appointment_id} value={apt.appointment_id}>
                        {apt.patient_name} - {apt.procedure}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-teal-600" />
                  <div>
                    <p className="font-medium text-slate-900">Gerar Áudio</p>
                    <p className="text-sm text-slate-500">ElevenLabs TTS</p>
                  </div>
                </div>
                <Switch checked={generateAudio} onCheckedChange={setGenerateAudio} data-testid="audio-switch" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Button onClick={handleGenerate} disabled={generating || !selectedAppointment} className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 gap-2" data-testid="generate-btn">
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {progress || 'Gerando...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Gerar Orientações
                  </>
                )}
              </Button>
              {generating && (
                <p className="text-sm text-slate-500">Isso pode levar até 1 minuto...</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions List */}
        <Card className="border-slate-100 shadow-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" /> Orientações Geradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : instructions.length > 0 ? (
              <div className="space-y-4">
                {instructions.map((ins) => (
                  <div key={ins.instruction_id} className="p-6 bg-slate-50 rounded-xl relative group">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-teal-100 text-teal-700">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(ins.created_at).toLocaleDateString('pt-BR')}
                        </Badge>
                        {ins.audio_url && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Volume2 className="w-3 h-3 mr-1" /> Com áudio
                          </Badge>
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
                    <div className="prose prose-slate prose-sm max-w-none">
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{cleanAIText(ins.text_content)}</p>
                    </div>
                    {ins.audio_url && (
                      <div className="mt-4 p-4 bg-white rounded-lg border">
                        <p className="text-sm text-slate-500 mb-2">Áudio das orientações:</p>
                        <audio controls className="w-full" src={ins.audio_url}>
                          Seu navegador não suporta áudio.
                        </audio>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">Nenhuma orientação gerada ainda</p>
                <p className="text-sm text-slate-400 mt-1">Selecione um atendimento acima para gerar</p>
              </div>
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

export default Instructions;
