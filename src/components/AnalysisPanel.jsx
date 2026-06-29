import React from 'react';
import { Layers } from 'lucide-react';

export default function AnalysisPanel({ firstSets, followSets, ll1Conflicts }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <Layers size={16} className="text-info-light" />
          <h2 className="card-title">Analysis Panel</h2>
        </div>
      </div>
      <div className="card-body">
        <div className="analysis-grid">
          <div className="analysis-block">
            <h3>FIRST</h3>
            {Array.from(firstSets.entries()).map(([nt, set]) => (
              <div key={nt} className="analysis-row">
                <span className="analysis-symbol">{nt}</span>
                <span className="analysis-values">{`{ ${Array.from(set).join(', ')} }`}</span>
              </div>
            ))}
          </div>
          <div className="analysis-block">
            <h3>FOLLOW</h3>
            {Array.from(followSets.entries()).map(([nt, set]) => (
              <div key={nt} className="analysis-row">
                <span className="analysis-symbol">{nt}</span>
                <span className="analysis-values">{`{ ${Array.from(set).join(', ')} }`}</span>
              </div>
            ))}
          </div>
          <div className="analysis-block">
            <h3>LL(1) Conflicts</h3>
            {ll1Conflicts.length > 0 ? ll1Conflicts.map((conflict, idx) => (
              <div key={idx} className="conflict-card">
                <strong>{conflict.nonTerminal}</strong> on <strong>{conflict.terminal}</strong>
                <ul>
                  {conflict.rules.map((rule, ruleIdx) => (
                    <li key={ruleIdx}>{rule.lhs} {'->'} {rule.rhs.length === 0 ? 'ε' : rule.rhs.join(' ')}</li>
                  ))}
                </ul>
              </div>
            )) : <div className="empty-state">No LL(1) conflicts detected.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
