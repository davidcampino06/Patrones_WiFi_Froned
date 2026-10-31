import { useState } from 'react';
import { formatDateTime } from '../format';
import { errorMessage } from '../hooks/useApi';
import { api } from '../services/api';
import type { NearbyAnalysis } from '../types';
import { FindingList } from './FindingList';
import { Icon } from './Icon';

/**
 * The AI reading of the last scan, only when the user asks for it (it is not repeated on every refresh). Facts and
 * possible explanations stay in separate lists; when there is no scan or the AI is down, the message says so.
 */
export function NearbyAnalysisSection({ networkId, scanId }: { networkId: number; scanId: number | null }) {
  const [analysis, setAnalysis] = useState<NearbyAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const outdated = analysis !== null && analysis.scanId !== scanId;

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      setAnalysis(await api.nearbyAnalysis(networkId));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="nearby-analysis">
      <div className="nearby-analysis__head">
        <h3>Lectura de la IA</h3>
        <button className="button button--quiet" onClick={analyze} disabled={busy || scanId === null}>
          <Icon name="ai" size={16} /> {busy ? 'Analizando…' : analysis ? 'Analizar de nuevo' : 'Analizar con IA'}
        </button>
      </div>
      {scanId === null && <p className="muted small">Cuando haya un escaneo completado podrás pedir su lectura.</p>}
      {error && <p className="notice notice--error" role="alert">{error}</p>}
      {analysis && !analysis.available && <p className="notice" role="status">{analysis.message}</p>}
      {analysis?.available && (
        <>
          {outdated && <p className="notice" role="status">Hay un escaneo más nuevo: vuelve a analizar.</p>}
          <p className="muted small">Lectura del escaneo de {formatDateTime(analysis.scannedAt)}.</p>
          <FindingList kind="facts" findings={analysis.facts} empty="Nada que destacar en lo medido." />
          <FindingList kind="inferences" findings={analysis.inferences}
                       empty="La IA no encontró nada que explicar." />
          {analysis.uncertainty && <p className="muted small nearby-analysis__uncertainty">{analysis.uncertainty}</p>}
        </>
      )}
    </div>
  );
}
