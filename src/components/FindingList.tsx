import type { Finding } from '../types';
import { Icon } from './Icon';

const SEVERITY_LABEL: Record<Finding['severity'], string> = { INFO: 'Info', WARNING: 'Atención', CRITICAL: 'Crítico' };

/**
 * Facts (what was counted) or inferences (possible explanations): two separate lists, never one, so a guess never reads
 * as a measurement. An inference shows its confidence in words and as a bar.
 */
export function FindingList({ findings, kind, empty }: { findings: Finding[]; kind: 'facts' | 'inferences';
  empty: string }) {
  const title = kind === 'facts' ? 'Hechos medidos' : 'Posibles explicaciones';
  const hint = kind === 'facts'
    ? 'Contados en los datos; no son suposiciones.'
    : 'Lo que podría explicar los hechos. Cada una dice qué tan segura es: confírmala antes de actuar.';
  return (
    <section className={`findings-block findings-block--${kind}`} aria-label={title}>
      <h3 className="findings-block__title">{title}</h3>
      <p className="muted small">{hint}</p>
      {findings.length === 0 ? <p className="muted">{empty}</p> : (
        <ul className="findings">
          {findings.map((f) => (
            <li key={f.code + f.title} className={`finding finding--${f.severity.toLowerCase()}`}>
              <span className="finding__severity">{SEVERITY_LABEL[f.severity]}</span>
              <div>
                <strong>{f.title}</strong>
                <p>{f.evidence}</p>
                {f.confidence !== null && <Confidence value={f.confidence} />}
                {f.recommendation && (
                  <p className="finding__action"><Icon name="check" size={14} /> {f.recommendation}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function confidenceWord(value: number): string {
  if (value >= 0.75) return 'alta';
  if (value >= 0.5) return 'media';
  return 'baja';
}

function Confidence({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <p className="confidence">
      <span className="confidence__bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
            aria-label="Confianza">
        <i style={{ width: `${pct}%` }} />
      </span>
      <span className="muted small">Confianza {confidenceWord(value)} ({pct} %)</span>
    </p>
  );
}
