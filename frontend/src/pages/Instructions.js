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
import { FileText, Sparkles, Loader2, Volume2, Calendar } from 'lucide-react';

const Instructions = () => {
  const [appointments, setAppointments] = useState([]);
  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState('');
  const [generateAudio, setGenerateAudio] = useState(true);

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
    try {
      const response = await api.post('/instructions/generate', {
        appointment_id: selectedAppointment,
        generate_audio: generateAudio
      });
      toast.success('Orientações geradas com sucesso!');
      setInstructions([response.data, ...instructions]);
      setSelectedAppointment('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao gerar orientações');
    } finally {
      setGenerating(false);
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
            <Button onClick={handleGenerate} disabled={generating || !selectedAppointment} className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 gap-2" data-testid="generate-btn">
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Gerando com IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Gerar Orientações
                </>
              )}
            </Button>
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
                  <div key={ins.instruction_id} className="p-6 bg-slate-50 rounded-xl">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
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
                    <div className="prose prose-slate prose-sm max-w-none">
                      <p className="text-slate-700 whitespace-pre-wrap">{ins.text_content}</p>
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
    </Layout>
  );
};

export default Instructions;
