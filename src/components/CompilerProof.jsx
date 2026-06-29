import React from 'react';
import { Sparkles } from 'lucide-react';

export default function CompilerProof({ proof }) {
  if (!proof) {
    return null;
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <Sparkles size={16} className="text-warning-light" />
          <h2 className="card-title">Compiler Proof</h2>
        </div>
        <span className={`badge ${proof.resultType === 'ambiguous' ? 'badge-warning' : 'badge-success'}`}>{proof.result}</span>
      </div>

      <div className="card-body">
        <div className="proof-grid">
          <div className="proof-block">
            <h3>Original Grammar</h3>
            <pre>{proof.originalGrammar.join('\n')}</pre>
          </div>
          <div className="proof-block">
            <h3>Common Prefix</h3>
            <pre>{proof.commonPrefix}</pre>
          </div>
          <div className="proof-block">
            <h3>Conflicting Productions</h3>
            <ul>
              {proof.conflictingProductions.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="proof-block">
            <h3>Reason for Ambiguity</h3>
            <p>{proof.reason}</p>
          </div>
          <div className="proof-block">
            <h3>Parser Decision</h3>
            <p>{proof.parserDecision}</p>
          </div>
          <div className="proof-block result-block">
            <h3>Result</h3>
            <p>{proof.result}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
