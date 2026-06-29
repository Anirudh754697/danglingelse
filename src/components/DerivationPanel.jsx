import React from 'react';
import { ArrowRightLeft } from 'lucide-react';

export default function DerivationPanel({ leftmost, rightmost }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <ArrowRightLeft size={16} className="text-success-light" />
          <h2 className="card-title">Derivations</h2>
        </div>
      </div>

      <div className="card-body derivation-grid">
        <div className="derivation-block">
          <h3>Leftmost Derivation</h3>
          <div className="derivation-stack">
            {leftmost?.map((step, idx) => (
              <div key={idx} className="derivation-step">
                <span className="derivation-label">{step}</span>
                {idx < leftmost.length - 1 && <span className="arrow">↓</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="derivation-block">
          <h3>Rightmost Derivation</h3>
          <div className="derivation-stack">
            {rightmost?.map((step, idx) => (
              <div key={idx} className="derivation-step">
                <span className="derivation-label">{step}</span>
                {idx < rightmost.length - 1 && <span className="arrow">↓</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
