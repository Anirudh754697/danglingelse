import React, { useState, useRef, useEffect } from 'react';

/**
 * TreeViewer - SVG Parse Tree Renderer with Pan, Zoom, and Hover Effects
 */
export default function TreeViewer({ tree, tokens, onHoverNode, activeNodeId }) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState(null);
  
  const svgRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Config parameters
  const tokenSpacing = 85;
  const levelHeight = 80;
  const xOffset = 50;
  const yOffset = 50;

  // Flatten the tree structure to nodes and links
  const getTreeData = () => {
    if (!tree) return { nodes: [], links: [], maxDepth: 0 };
    
    const nodes = [];
    const links = [];
    let maxDepth = 0;
    let idCounter = 0;

    const traverse = (node, depth, parent = null) => {
      if (depth > maxDepth) maxDepth = depth;
      
      // Midpoint-based horizontal coordinate
      const startIdx = node.start;
      const endIdx = node.end;
      const isLeaf = node.type === 'terminal';
      
      const x = isLeaf 
        ? startIdx * tokenSpacing + xOffset 
        : ((startIdx + endIdx - 1) / 2) * tokenSpacing + xOffset;
      const y = depth * levelHeight + yOffset;
      
      const currNode = {
        id: `node_${idCounter++}_${node.label}_${startIdx}_${endIdx}`,
        label: node.label,
        type: node.type,
        rule: node.rule || '',
        start: startIdx,
        end: endIdx,
        x,
        y,
        depth
      };
      
      nodes.push(currNode);
      
      if (parent) {
        links.push({
          id: `link_${parent.id}_${currNode.id}`,
          source: { x: parent.x, y: parent.y + 12 }, // adjust slightly down from parent center
          target: { x: currNode.x, y: currNode.y - 12 } // adjust slightly up from child center
        });
      }
      
      if (node.children) {
        for (const child of node.children) {
          traverse(child, depth + 1, currNode);
        }
      }
    };

    traverse(tree, 0);
    return { nodes, links, maxDepth };
  };

  const { nodes, links, maxDepth } = getTreeData();

  // Reset zoom & pan when tree changes
  useEffect(() => {
    if (tree) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [tree]);

  // Handle Dragging / Panning
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'circle' || e.target.tagName === 'rect' || e.target.tagName === 'text') {
      return; // don't drag if interacting with a node
    }
    isDragging.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Handle Zooming via Scroll Wheel
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 0.1;
    let newZoom = zoom + (e.deltaY < 0 ? zoomFactor : -zoomFactor);
    newZoom = Math.max(0.4, Math.min(2.5, newZoom)); // bound zoom
    setZoom(newZoom);
  };

  const resetViewport = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (!tree) {
    return (
      <div className="tree-viewer-empty">
        <p>No parse tree available.</p>
      </div>
    );
  }

  const svgWidth = tokens.length * tokenSpacing + 100;
  const svgHeight = (maxDepth + 1) * levelHeight + 100;

  return (
    <div className="tree-viewer-container">
      <div className="tree-viewer-header">
        <span className="tree-viewer-title">Interactive Parse Tree</span>
        <button className="btn-secondary btn-sm" onClick={resetViewport}>Reset view</button>
      </div>

      <div 
        className="tree-viewer-svg-wrapper"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
      >
        <svg 
          ref={svgRef}
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isDragging.current ? 'none' : 'transform 0.15s ease-out'
          }}
        >
          {/* Highlighted token range background bar */}
          {hoveredNode && hoveredNode.type !== 'terminal' && (
            <rect
              x={hoveredNode.start * tokenSpacing + xOffset - 30}
              y={svgHeight - 65}
              width={(hoveredNode.end - hoveredNode.start - 1) * tokenSpacing + 60}
              height="35"
              rx="6"
              fill="rgba(99, 102, 241, 0.15)"
              stroke="rgba(99, 102, 241, 0.4)"
              strokeWidth="1.5"
              className="fade-in"
            />
          )}

          {/* Links (Edges) */}
          {links.map((link) => {
            // Cubic Bezier curve for smooth links
            const dx = link.target.x - link.source.x;
            const dy = link.target.y - link.source.y;
            const pathData = `
              M ${link.source.x} ${link.source.y}
              C ${link.source.x} ${link.source.y + dy * 0.5},
                ${link.target.x} ${link.target.y - dy * 0.5},
                ${link.target.x} ${link.target.y}
            `;

            return (
              <path 
                key={link.id} 
                d={pathData} 
                fill="none" 
                stroke="var(--color-border-dark)" 
                strokeWidth="2" 
                strokeLinecap="round"
                className="tree-link"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isNonTerminal = node.type === 'nonterminal';
            const isHovered = hoveredNode && hoveredNode.id === node.id;
            const isActive = activeNodeId && node.id.includes(activeNodeId);
            
            // Highlight color classes based on category (matched vs unmatched)
            let nodeFill = 'var(--color-bg-panel)';
            let nodeStroke = 'var(--color-border)';
            let labelColor = 'var(--color-text)';

            if (isNonTerminal) {
              if (node.label.endsWith('_matched')) {
                nodeFill = isHovered ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.08)';
                nodeStroke = 'rgba(16, 185, 129, 0.8)';
                labelColor = 'rgb(52, 211, 153)';
              } else if (node.label.endsWith('_unmatched')) {
                nodeFill = isHovered ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.08)';
                nodeStroke = 'rgba(239, 68, 68, 0.8)';
                labelColor = 'rgb(248, 113, 113)';
              } else if (node.label === 'S' || node.label === 'stmt' || node.label === 'E') {
                nodeFill = isHovered ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.12)';
                nodeStroke = 'rgba(99, 102, 241, 0.8)';
                labelColor = 'rgb(165, 180, 252)';
              } else {
                nodeFill = isHovered ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.08)';
                nodeStroke = 'rgba(245, 158, 11, 0.7)';
                labelColor = 'rgb(252, 211, 77)';
              }
            } else {
              // Terminal leaf nodes
              nodeFill = 'var(--color-bg-dark)';
              nodeStroke = 'var(--color-border-dark)';
              labelColor = 'var(--color-text-secondary)';
            }

            if (isActive) {
              nodeStroke = 'var(--color-primary)';
              nodeFill = 'rgba(99, 102, 241, 0.3)';
            }

            return (
              <g 
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className={`tree-node-group ${isNonTerminal ? 'non-terminal' : 'terminal'}`}
                onMouseEnter={() => {
                  setHoveredNode(node);
                  if (onHoverNode) onHoverNode(node);
                }}
                onMouseLeave={() => {
                  setHoveredNode(null);
                  if (onHoverNode) onHoverNode(null);
                }}
                style={{ cursor: isNonTerminal ? 'pointer' : 'default' }}
              >
                {isNonTerminal ? (
                  // Draw capsule-like pill for non-terminals
                  <rect
                    x="-28"
                    y="-15"
                    width="56"
                    height="30"
                    rx="8"
                    fill={nodeFill}
                    stroke={nodeStroke}
                    strokeWidth={isHovered || isActive ? '2.5' : '1.5'}
                    className="transition-all"
                  />
                ) : (
                  // Draw small circles/boxes for terminal leaf placeholders
                  <circle
                    r="8"
                    fill="var(--color-bg-dark)"
                    stroke={isHovered ? 'var(--color-primary)' : 'var(--color-border)'}
                    strokeWidth="1.5"
                  />
                )}

                {/* Node Label Text */}
                <text
                  dy={isNonTerminal ? '4' : '22'}
                  textAnchor="middle"
                  fill={labelColor}
                  fontSize={isNonTerminal ? '12px' : '11px'}
                  fontWeight={isNonTerminal ? '600' : 'normal'}
                  fontFamily="monospace"
                >
                  {node.label}
                </text>
              </g>
            );
          })}

          {/* Tokens row at the very bottom */}
          {tokens.map((token, idx) => {
            const isSpanHighlighted = hoveredNode && idx >= hoveredNode.start && idx < hoveredNode.end;
            return (
              <g 
                key={`token_${idx}`}
                transform={`translate(${idx * tokenSpacing + xOffset}, ${svgHeight - 45})`}
              >
                {/* Dotted connecting line up to the leaf node */}
                <line
                  x1="0"
                  y1="-10"
                  x2="0"
                  y2={-((svgHeight - 45) - (maxDepth * levelHeight + yOffset + 12))}
                  stroke="var(--color-border-dark)"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
                
                {/* Token box */}
                <rect
                  x="-28"
                  y="-12"
                  width="56"
                  height="24"
                  rx="4"
                  fill={isSpanHighlighted ? 'var(--color-primary-dim)' : 'var(--color-bg-panel)'}
                  stroke={isSpanHighlighted ? 'var(--color-primary)' : 'var(--color-border-dark)'}
                  strokeWidth={isSpanHighlighted ? '1.5' : '1'}
                />
                
                {/* Token text */}
                <text
                  dy="4"
                  textAnchor="middle"
                  fill={isSpanHighlighted ? 'var(--color-primary-light)' : 'var(--color-text)'}
                  fontSize="12px"
                  fontWeight={isSpanHighlighted ? '600' : 'normal'}
                  fontFamily="monospace"
                >
                  {token}
                </text>
                
                {/* Token Index label */}
                <text
                  dy="24"
                  textAnchor="middle"
                  fill="var(--color-text-muted)"
                  fontSize="9px"
                  fontFamily="monospace"
                >
                  {idx}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Node Tooltip Info overlay */}
      {hoveredNode && hoveredNode.type === 'nonterminal' && (
        <div className="tree-node-tooltip fade-in">
          <div className="tooltip-row">
            <span className="tooltip-label">Symbol:</span>
            <span className="tooltip-value font-mono highlight">{hoveredNode.label}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Derived Rule:</span>
            <span className="tooltip-value font-mono">{hoveredNode.rule}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Token Range:</span>
            <span className="tooltip-value font-mono">
              [{hoveredNode.start}...{hoveredNode.end - 1}] (
              {tokens.slice(hoveredNode.start, hoveredNode.end).join(' ')}
              )
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
