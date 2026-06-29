import React from 'react';
import { Boxes } from 'lucide-react';
import TreeViewer from './TreeViewer.jsx';

export default function ParseDashboard({
  originalTrees,
  rewrittenTrees,
  tokens,
  selectedOriginalTreeIdx,
  onSelectOriginalTree,
  onHoverNode,
  activeNodeId,
  parseError,
  rewrittenRules,
  originalTreeCount,
  rewrittenTreeCount
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <Boxes size={16} className="text-warning-light" />
          <h2 className="card-title">Parse Dashboard</h2>
        </div>
      </div>
      <div className="card-body">
        <div className="dashboard-grid">
          <div className="dashboard-panel">
            <div className="panel-subtitle">Ambiguous Parse Trees</div>
            {originalTrees.length > 1 && (
              <div className="tree-tabs">
                {originalTrees.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectOriginalTree(idx)}
                    className={`tab-btn ${selectedOriginalTreeIdx === idx ? 'active' : ''}`}
                  >
                    Parse {idx + 1}
                  </button>
                ))}
              </div>
            )}
            {originalTrees.length > 0 ? (
              <div className="tree-shell">
                <TreeViewer
                  tree={originalTrees[selectedOriginalTreeIdx]}
                  tokens={tokens}
                  onHoverNode={onHoverNode}
                  activeNodeId={activeNodeId}
                />
              </div>
            ) : (
              <div className="empty-state">{parseError || 'No original parse tree available.'}</div>
            )}
            <div className="footnote">Found {originalTreeCount} parser trees for the original grammar.</div>
          </div>

          <div className="dashboard-panel">
            <div className="panel-subtitle">Resolved Parse Tree</div>
            {rewrittenTrees.length > 0 ? (
              <div className="tree-shell">
                <TreeViewer
                  tree={rewrittenTrees[0]}
                  tokens={tokens}
                  onHoverNode={onHoverNode}
                  activeNodeId={activeNodeId}
                />
              </div>
            ) : (
              <div className="empty-state">{rewrittenRules.length > 0 ? 'The rewritten grammar could not parse this input.' : 'No rewritten grammar available.'}</div>
            )}
            <div className="footnote">Found {rewrittenTreeCount} parser tree(s) for the rewritten grammar.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
