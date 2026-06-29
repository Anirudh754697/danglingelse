import React from 'react';
import { Wand2 } from 'lucide-react';

export default function GrammarRewritePanel({ original, rewritten, steps }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <Wand2 size={16} className="text-success-light" />
          <h2 className="card-title">Grammar Rewrite Animation</h2>
        </div>
      </div>
      <div className="card-body">
        <div className="rewrite-flow">
          <div className="rewrite-block">
            <h3>Original Grammar</h3>
            <pre>{original}</pre>
          </div>
          {steps?.map((step, idx) => (
            <div key={idx} className="rewrite-arrow">↓</div>
          ))}
          <div className="rewrite-block">
            <h3>Final Grammar</h3>
            <pre>{rewritten}</pre>
          </div>
        </div>
        <div className="rewrite-legend">
          {steps?.map((step, idx) => (
            <div key={idx} className="rewrite-step">
              <strong>{idx + 1}.</strong> {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
