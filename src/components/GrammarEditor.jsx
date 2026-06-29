import React from 'react';
import { Settings2, RefreshCw } from 'lucide-react';

export default function GrammarEditor({
  grammarText,
  startSymbol,
  onGrammarChange,
  onStartSymbolChange,
  onResetPreset,
  activePreset,
  onActiveTestCaseReset
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <Settings2 size={16} className="text-primary-light" />
          <h2 className="card-title">Grammar Playground (BNF Form)</h2>
        </div>
        <span className="text-xs text-text-muted font-mono">Start Symbol:</span>
        <input
          type="text"
          value={startSymbol}
          onChange={(e) => onStartSymbolChange(e.target.value)}
          className="input-text font-mono text-center"
          style={{ width: '50px', padding: '0.2rem' }}
        />
      </div>

      <div className="card-body">
        <span className="text-xs text-text-muted">Edit the grammar rules below. Multi-line alternations starting with '|' are supported.</span>
        <textarea
          value={grammarText}
          onChange={(e) => onGrammarChange(e.target.value)}
          className="textarea-code"
          placeholder="S -> i S t S | a"
        />
        <div className="flex justify-between items-center text-xs text-text-muted">
          <span>Use 'ε' or 'epsilon' to represent empty rules.</span>
          <button
            onClick={() => {
              onResetPreset();
              onActiveTestCaseReset();
            }}
            className="btn btn-secondary btn-sm flex items-center gap-1"
          >
            <RefreshCw size={10} /> Reset Current Preset
          </button>
        </div>
        {activePreset && (
          <div className="pill-group">
            <span className="pill">Preset: {activePreset.name}</span>
            <span className="pill">Use input tokens with spaces</span>
          </div>
        )}
      </div>
    </div>
  );
}
