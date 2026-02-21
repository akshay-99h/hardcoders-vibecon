import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

function MissionDetail() {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [expandedStep, setExpandedStep] = useState(null);

  useEffect(() => {
    fetchMission();
  }, [missionId]);

  const fetchMission = async () => {
    try {
      const response = await api.get(`/api/missions/${missionId}`);
      setMission(response.data);
      // Auto-expand current step
      setExpandedStep(response.data.current_step_index);
    } catch (error) {
      console.error('Failed to fetch mission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = async (stepIndex) => {
    try {
      await api.put(`/api/missions/${missionId}/step/${stepIndex}`, {
        status: 'completed'
      });
      
      // Refresh mission
      await fetchMission();
    } catch (error) {
      console.error('Failed to update step:', error);
    }
  };

  const handleVoiceNarration = async (text) => {
    try {
      const response = await api.post('/api/voice/synthesize', {
        text: text,
        language: 'en'
      });
      
      // Play audio
      const audio = new Audio(`data:audio/mp3;base64,${response.data.audio_base64}`);
      audio.play();
    } catch (error) {
      console.error('Voice synthesis error:', error);
    }
  };

  const getStepStatusIcon = (status) => {
    const icons = {
      pending: '⚪',
      in_progress: '🔵',
      completed: '✅',
      failed: '❌',
      skipped: '⏭️'
    };
    return icons[status] || '⚪';
  };

  const getStepTypeLabel = (type) => {
    const labels = {
      inform: 'Information',
      collect: 'Collect Data',
      submit: 'Submit',
      wait: 'Wait',
      decision: 'Decision',
      escalate: 'Escalate',
      close: 'Close'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading mission...</p>
        </div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Mission not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const progress = mission.steps.length > 0
    ? Math.round((mission.steps.filter(s => s.status === 'completed').length / mission.steps.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{mission.title}</h1>
              <p className="text-sm text-gray-600">{mission.objective}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (!voiceEnabled) {
                  handleVoiceNarration(mission.briefing);
                }
              }}
              className={`p-2 rounded-lg transition-colors ${
                voiceEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}
              title="Toggle voice guidance"
            >
              {voiceEnabled ? '🔊' : '🔇'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Mission Briefing */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Mission Briefing</h2>
              <p className="text-gray-700 mb-4">{mission.briefing}</p>
              
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`status-badge inline-block ${mission.status}`}>
                    {mission.status.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estimated Time</p>
                  <p className="font-semibold text-gray-900">⏱️ {mission.estimated_completion_time}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">State</p>
                  <p className="font-semibold text-gray-900">📍 {mission.state}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">Overall Progress</p>
              <p className="text-sm font-bold text-blue-600">{progress}%</p>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {mission.steps.filter(s => s.status === 'completed').length} of {mission.steps.length} steps completed
            </p>
          </div>

          {/* Risk Assessment */}
          {mission.risk_assessment && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 mb-2">Safety Assessment</p>
              <p className="text-sm text-blue-800">
                Risk Level: <span className="font-semibold">{mission.risk_assessment.risk_level}</span>
              </p>
              {mission.risk_assessment.recommendations && mission.risk_assessment.recommendations.length > 0 && (
                <p className="text-sm text-blue-800 mt-1">
                  {mission.risk_assessment.recommendations[0]}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Mission Timeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Mission Timeline</h2>

          <div className="space-y-4">
            {mission.steps.map((step, index) => (
              <div key={step.step_id} className="timeline-step">
                <div
                  className={`timeline-marker ${step.status}`}
                >
                  {index + 1}
                </div>

                <div
                  className={`ml-8 p-5 rounded-lg border-2 transition-all cursor-pointer ${
                    expandedStep === index
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  onClick={() => setExpandedStep(expandedStep === index ? null : index)}
                  data-testid={`step-${index}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getStepStatusIcon(step.status)}</span>
                        <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
                      </div>
                      <p className="text-gray-700 mb-3">{step.description}</p>
                      
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                          {getStepTypeLabel(step.step_type)}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                          📱 {step.platform}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                          ⏱️ {step.estimated_time_minutes} min
                        </span>
                        {step.sensitive_required && (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                            ⚠️ Sensitive data required
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedStep === index && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 animate-fade-in">
                      {/* Safety Warnings */}
                      {step.safety_warnings && step.safety_warnings.length > 0 && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="font-semibold text-yellow-900 mb-2">⚠️ Safety Warnings</p>
                          <ul className="space-y-1 text-sm text-yellow-800">
                            {step.safety_warnings.map((warning, idx) => (
                              <li key={idx}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Common Mistakes */}
                      {step.common_mistakes && step.common_mistakes.length > 0 && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="font-semibold text-blue-900 mb-2">💡 Common Mistakes to Avoid</p>
                          <ul className="space-y-1 text-sm text-blue-800">
                            {step.common_mistakes.map((mistake, idx) => (
                              <li key={idx}>• {mistake}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Success Indicator */}
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="font-semibold text-green-900 mb-1">✅ Success Indicator</p>
                        <p className="text-sm text-green-800">{step.success_indicator}</p>
                      </div>

                      {/* Actions */}
                      {step.status !== 'completed' && (
                        <div className="flex gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStepComplete(index);
                            }}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                            data-testid={`complete-step-${index}`}
                          >
                            Mark as Complete
                          </button>
                          {voiceEnabled && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVoiceNarration(step.description);
                              }}
                              className="px-6 py-3 bg-blue-100 text-blue-600 rounded-lg font-semibold hover:bg-blue-200 transition-colors"
                            >
                              🔊 Read Aloud
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Official Sources */}
        {mission.sources && mission.sources.length > 0 && (
          <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Official Sources</h3>
            <div className="space-y-3">
              {mission.sources.map((source, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-green-600 font-bold">✓</span>
                  <div className="flex-1">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      {source.url}
                    </a>
                    <p className="text-sm text-gray-600 mt-1">{source.purpose}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Authority: {source.authority_tier} • Confidence: {(source.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default MissionDetail;
