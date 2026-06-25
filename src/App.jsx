import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RefreshCw, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Code,
  FileCode, 
  Layers, 
  Settings2,
  BookOpen
} from 'lucide-react';

import { parseGrammar, tokenize, EarleyParser } from './utils/parser.js';
import { 
  detectDanglingElse, 
  detectGeneralAmbiguity, 
  computeFirstSets, 
  computeFollowSets, 
  analyzeLL1 
} from './utils/ambiguity.js';
import { rewriteGrammar, rulesToBNF } from './utils/rewriter.js';

import TreeViewer from './components/TreeViewer.jsx';
import ExplanationPanel from './components/ExplanationPanel.jsx';

// Grammar Presets
const PRESETS = {
  dangling_shorthand: {
    name: "Classic Dangling-Else (Shorthand)",
    grammar: `S -> i S t S\n   | i S t S e S\n   | a`,
    startSymbol: "S",
    defaultInput: "i a t i a t a e a",
    testCases: [
      { name: "Test 1: Simple if-then-else (unambiguous)", input: "i a t a e a" },
      { name: "Test 2: Classic dangling-else (ambiguous)", input: "i a t i a t a e a" },
      { name: "Test 3: Double nested dangling-else (ambiguous)", input: "i a t i a t i a t a e a e a" },
      { name: "Test 4: Else-if chain (unambiguous)", input: "i a t a e i a t a e a" },
      { name: "Test 5: Complex nested (ambiguous)", input: "i a t i a t a e i a t a e a e a" }
    ]
  },
  dangling_english: {
    name: "Classic Dangling-Else (Full English)",
    grammar: `stmt -> if expr then stmt\n     | if expr then stmt else stmt\n     | other`,
    startSymbol: "stmt",
    defaultInput: "if c1 then if c2 then s1 else s2",
    testCases: [
      { name: "Test 1: Simple if-then-else (unambiguous)", input: "if c1 then s1 else s2" },
      { name: "Test 2: Classic dangling-else (ambiguous)", input: "if c1 then if c2 then s1 else s2" },
      { name: "Test 3: Double nested dangling-else (ambiguous)", input: "if c1 then if c2 then if c3 then s1 else s2 else s3" },
      { name: "Test 4: Else-if chain (unambiguous)", input: "if c1 then s1 else if c2 then s2 else s3" },
      { name: "Test 5: Complex nested (ambiguous)", input: "if c1 then if c2 then s1 else if c3 then s2 else s3 else s4" }
    ]
  },
  arithmetic_ambiguous: {
    name: "Arithmetic Operator Precedence",
    grammar: `E -> E + E\n   | E * E\n   | id`,
    startSymbol: "E",
    defaultInput: "id + id * id",
    testCases: [
      { name: "Test 1: Addition only", input: "id + id" },
      { name: "Test 2: Precedence conflict", input: "id + id * id" },
      { name: "Test 3: Multi-operation chain", input: "id * id * id + id" }
    ]
  }
};

export default function App() {
  const [selectedPresetKey, setSelectedPresetKey] = useState('dangling_shorthand');
  const [grammarText, setGrammarText] = useState(PRESETS.dangling_shorthand.grammar);
  const [startSymbol, setStartSymbol] = useState(PRESETS.dangling_shorthand.startSymbol);
  const [inputText, setInputText] = useState(PRESETS.dangling_shorthand.defaultInput);
  
  // Algorithmic State
  const [parsedRules, setParsedRules] = useState([]);
  const [rewrittenRules, setRewrittenRules] = useState([]);
  const [rewrittenBNF, setRewrittenBNF] = useState("");
  
  // Ambiguity Analysis
  const [danglingElseInfo, setDanglingElseInfo] = useState(null);
  const [generalAmbiguityProof, setGeneralAmbiguityProof] = useState(null);
  const [firstSets, setFirstSets] = useState(new Map());
  const [followSets, setFollowSets] = useState(new Map());
  const [ll1Conflicts, setLl1Conflicts] = useState([]);
  
  // Parsing Output State
  const [tokens, setTokens] = useState([]);
  const [originalTrees, setOriginalTrees] = useState([]);
  const [rewrittenTrees, setRewrittenTrees] = useState([]);
  const [selectedOriginalTreeIdx, setSelectedOriginalTreeIdx] = useState(0);
  const [activeTestCase, setActiveTestCase] = useState(PRESETS.dangling_shorthand.testCases[1]);
  const [parseError, setParseError] = useState(null);

  // UI States
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);
  const [activeNode, setActiveNode] = useState(null);

  // Trigger analysis when grammar text or start symbol changes
  useEffect(() => {
    try {
      const rules = parseGrammar(grammarText);
      setParsedRules(rules);
      
      // 1. Detect dangling-else
      const deInfo = detectDanglingElse(rules);
      setDanglingElseInfo(deInfo);
      
      // 2. Rewrite grammar if dangling else is detected
      if (deInfo) {
        const rewriteRes = rewriteGrammar(rules);
        if (rewriteRes) {
          setRewrittenRules(rewriteRes.rules);
          setRewrittenBNF(rulesToBNF(rewriteRes.rules));
        } else {
          setRewrittenRules([]);
          setRewrittenBNF("");
        }
      } else {
        setRewrittenRules([]);
        setRewrittenBNF("");
      }

      // 3. Compute First and Follow sets
      const nonTerminals = new Set(rules.map(r => r.lhs));
      const firsts = computeFirstSets(rules, nonTerminals);
      const follows = computeFollowSets(rules, nonTerminals, firsts, startSymbol);
      setFirstSets(firsts);
      setFollowSets(follows);

      // 4. Construct LL(1) Table & find conflicts
      const { conflicts } = analyzeLL1(rules, nonTerminals, firsts, follows);
      setLl1Conflicts(conflicts);

      // 5. Detect General Ambiguity
      const genAmb = detectGeneralAmbiguity(rules, startSymbol, 6);
      setGeneralAmbiguityProof(genAmb && genAmb.ambiguousString ? genAmb : null);

      // Auto-detect and populate test input for custom grammars
      const isCustomGrammar = grammarText.trim() !== PRESETS[selectedPresetKey].grammar.trim();
      if (isCustomGrammar && genAmb) {
        const autoInput = genAmb.ambiguousString || genAmb.firstValidString;
        if (autoInput) {
          setInputText(autoInput);
          setActiveTestCase(null);
        }
      }

    } catch (e) {
      console.error(e);
    }
  }, [grammarText, startSymbol]);

  // Execute parsing when rules, input text, or active test case changes
  useEffect(() => {
    handleParse();
  }, [parsedRules, rewrittenRules, inputText]);

  // Handle preset dropdown selection
  const handlePresetChange = (presetKey) => {
    setSelectedPresetKey(presetKey);
    const preset = PRESETS[presetKey];
    setGrammarText(preset.grammar);
    setStartSymbol(preset.startSymbol);
    setInputText(preset.defaultInput);
    setActiveTestCase(preset.testCases[1] || preset.testCases[0]);
  };

  // Run the parser on the input text
  const handleParse = () => {
    setParseError(null);
    const tks = tokenize(inputText);
    setTokens(tks);
    
    if (tks.length === 0) {
      setOriginalTrees([]);
      setRewrittenTrees([]);
      return;
    }

    try {
      // Parse with original grammar
      const originalParser = new EarleyParser(parsedRules, startSymbol);
      const originalChart = originalParser.parse(tks);
      const oTrees = originalParser.getParseTrees(originalChart, tks);
      setOriginalTrees(oTrees);
      setSelectedOriginalTreeIdx(0);

      // Parse with rewritten grammar (if it exists)
      if (rewrittenRules.length > 0) {
        const rewrittenParser = new EarleyParser(rewrittenRules, startSymbol);
        const rewrittenChart = rewrittenParser.parse(tks);
        const rTrees = rewrittenParser.getParseTrees(rewrittenChart, tks);
        setRewrittenTrees(rTrees);
      } else {
        setRewrittenTrees([]);
      }

      if (oTrees.length === 0) {
        setParseError("Syntax Error: The input program could not be parsed by the grammar.");
      }
    } catch (err) {
      setParseError(`Parse Execution Error: ${err.message}`);
      setOriginalTrees([]);
      setRewrittenTrees([]);
    }
  };

  // Load a preloaded test case
  const loadTestCase = (tc) => {
    setActiveTestCase(tc);
    setInputText(tc.input);
  };

  const activePreset = PRESETS[selectedPresetKey];

  return (
    <div className="app-container">
      {/* Header Bar */}
      <header className="header">
        <div className="header-content">
          <div className="brand">
            <div className="brand-logo">GF</div>
            <div>
              <h1 className="brand-name">GrammarFix</h1>
              <p className="brand-tagline">Dangling-Else Resolver & Educational Parser Dashboard</p>
            </div>
          </div>
          <div className="flex gap-2">
            <label className="text-xs text-text-muted font-mono flex items-center mr-2">Grammar Preset:</label>
            <select 
              value={selectedPresetKey}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="select-dropdown"
            >
              {Object.entries(PRESETS).map(([key, p]) => (
                <option key={key} value={key}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="main-content">
        
        {/* Top Section: Playground Editor & Ambiguity Analyzer */}
        <section className="grid-2">
          {/* Card 1: BNF Input Editor */}
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
                onChange={(e) => setStartSymbol(e.target.value)}
                className="input-text font-mono text-center"
                style={{ width: '50px', padding: '0.2rem' }}
              />
            </div>
            
            <div className="card-body">
              <span className="text-xs text-text-muted">Edit the grammar rules below. Multi-line alternations starting with '|' are supported:</span>
              <textarea
                value={grammarText}
                onChange={(e) => {
                  setGrammarText(e.target.value);
                  setActiveTestCase(null);
                }}
                className="textarea-code"
                placeholder="S -> i S t S | a"
              />
              <div className="flex justify-between items-center text-xs text-text-muted">
                <span>Use 'ε' or 'epsilon' to represent empty rules.</span>
                <button 
                  onClick={() => setGrammarText(activePreset.grammar)}
                  className="btn btn-secondary btn-sm flex items-center gap-1"
                >
                  <RefreshCw size={10} /> Reset Current Preset
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Ambiguity Detector & Transform Output */}
          <div className="card">
            <div className="card-header">
              <div className="card-title-group">
                <Code size={16} className="text-success-light" />
                <h2 className="card-title">Ambiguity Detection & Transformation</h2>
              </div>
            </div>
            
            <div className="card-body">
              {/* Dangling-Else Alert */}
              {danglingElseInfo ? (
                <div className="alert alert-warning fade-in">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-warning-light" />
                    <span className="alert-text font-bold">Dangling-Else Ambiguity Detected!</span>
                  </div>
                  <span className="alert-subtext">
                    Non-terminal <code>{danglingElseInfo.nonTerminal}</code> derives both 
                    <code>{danglingElseInfo.ifThenRule.rhs.join(' ')}</code> and 
                    <code>{danglingElseInfo.ifThenElseRule.rhs.join(' ')}</code>, sharing a prefix.
                  </span>
                </div>
              ) : (
                <div className="alert alert-info fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={18} className="text-info-light" />
                    <span className="alert-text font-bold">No Dangling-Else Pattern Detected.</span>
                  </div>
                  <span className="alert-subtext">The grammar doesn't exhibit standard dangling-else shift-reduce structure.</span>
                </div>
              )}

              {/* General Ambiguity Alert */}
              {generalAmbiguityProof && (
                <div className="alert alert-warning mt-2 fade-in" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-danger-light)' }}>
                    <AlertTriangle size={18} />
                    <span className="alert-text font-bold">General Ambiguity Found!</span>
                  </div>
                  <span className="alert-subtext" style={{ color: 'var(--color-text-secondary)' }}>
                    The terminal sequence <code>"{generalAmbiguityProof.ambiguousString}"</code> parses to 
                    <code>{generalAmbiguityProof.treeCount}</code> distinct parse trees, proving the grammar is ambiguous.
                  </span>
                </div>
              )}

              {/* Rewritten Grammar Output */}
              {rewrittenRules.length > 0 ? (
                <div className="mt-2 flex-1 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-success-light">Automatically Resolved Unambiguous Grammar:</span>
                  <pre className="rule-box font-mono flex-1 text-sm bg-dark p-3 border rounded overflow-auto" style={{ maxHeight: '150px' }}>
                    {rewrittenBNF}
                  </pre>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-text-muted italic text-xs">
                  (No unambiguous rewrite rules available for this grammar)
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Expandable First/Follow and LL(1) Table Conflict Analysis Section */}
        <section className="card">
          <div 
            className="card-header" 
            onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <div className="card-title-group">
              <Layers size={16} className="text-info-light" />
              <h2 className="card-title">Detailed Compiler Analysis (FIRST/FOLLOW & LL(1) Conflicts)</h2>
            </div>
            {isAnalysisExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          
          {isAnalysisExpanded && (
            <div className="card-body fade-in">
              <div className="sets-grid">
                {/* FIRST Set Card */}
                <div className="sets-box">
                  <span className="text-xs font-bold text-text-secondary uppercase">FIRST Sets</span>
                  {Array.from(firstSets.entries()).map(([nt, set]) => (
                    <div key={nt} className="sets-row">
                      <span className="sets-row-nt">{nt}</span>
                      <span className="sets-row-values">{`{ ${Array.from(set).join(', ')} }`}</span>
                    </div>
                  ))}
                </div>

                {/* FOLLOW Set Card */}
                <div className="sets-box">
                  <span className="text-xs font-bold text-text-secondary uppercase">FOLLOW Sets</span>
                  {Array.from(followSets.entries()).map(([nt, set]) => (
                    <div key={nt} className="sets-row">
                      <span className="sets-row-nt">{nt}</span>
                      <span className="sets-row-values">{`{ ${Array.from(set).join(', ')} }`}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* LL(1) Parsing Table conflicts list */}
              <div className="mt-3">
                <span className="text-xs font-bold text-text-secondary uppercase block mb-1">LL(1) Table Conflicts (Ambiguity Signposts)</span>
                {ll1Conflicts.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-warning-light">
                      Found {ll1Conflicts.length} cell conflict(s) in the LL(1) parsing table (multiple entries):
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {ll1Conflicts.map((c, idx) => (
                        <div key={idx} className="bg-dark p-2 rounded border border-border-dark text-xs font-mono">
                          <span className="text-warning font-semibold">Table[{c.nonTerminal}, {c.terminal}]</span> conflicts:
                          <ul className="list-disc pl-4 mt-1 text-text-muted">
                            {c.rules.map((r, rIdx) => (
                              <li key={rIdx}>{r.lhs} {"->"} {r.rhs.length === 0 ? 'ε' : r.rhs.join(' ')}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-success-dim border border-success text-success-light text-xs p-2 rounded">
                    No LL(1) Table Conflicts! The grammar is LL(1)-compatible.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Middle Section: Test Suite Dashboard & Program Input */}
        <section className="card">
          <div className="card-header">
            <div className="card-title-group">
              <FileCode size={16} className="text-primary-light" />
              <h2 className="card-title">Test Suite Playground & Program Runner</h2>
            </div>
          </div>
          
          <div className="card-body">
            {/* Preloaded Test Program Selection */}
            {activePreset.testCases && (
              <div className="flex flex-col gap-2 mb-2">
                <span className="text-xs text-text-muted font-bold uppercase">Preloaded Educational Test Suite:</span>
                <div className="test-suite-grid">
                  {activePreset.testCases.map((tc, idx) => {
                    const isActive = activeTestCase && activeTestCase.input === tc.input;
                    return (
                      <button
                        key={idx}
                        onClick={() => loadTestCase(tc)}
                        className={`test-btn ${isActive ? 'active' : ''}`}
                      >
                        <span className="test-btn-title">{tc.name}</span>
                        <span className="test-btn-code">{tc.input}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Program Input Row */}
            <div className="flex flex-col md:flex-row gap-3 items-end mt-2">
              <div className="flex-1 flex flex-col gap-1 w-100">
                <label className="text-xs text-text-secondary font-semibold">Test Program Input (space separated tokens):</label>
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    setActiveTestCase(null);
                  }}
                  className="input-text font-mono w-100"
                  placeholder="i a t i a t a e a"
                />
              </div>
              <button 
                onClick={handleParse}
                className="btn btn-primary w-100 md:w-auto"
              >
                <Play size={14} /> Parse Input Program
              </button>
            </div>

            {/* Parsing Errors Banner */}
            {parseError && (
              <div className="alert alert-warning mt-2 bg-danger-dim border-danger text-danger-light">
                <AlertTriangle size={16} className="inline mr-1" />
                <span>{parseError}</span>
              </div>
            )}
          </div>
        </section>

        {/* Bottom Section: Side-by-Side Parse Trees & Step-by-Step Educational Explanation */}
        <section className="grid-3 flex-1">
          
          {/* Card 1: Ambiguous Parse Trees */}
          <div className="card">
            <div className="card-header">
              <div className="card-title-group">
                <AlertTriangle size={16} className="text-warning-light" />
                <h2 className="card-title">Ambiguous Parses</h2>
              </div>
              
              {/* Tree Selector Tabs */}
              {originalTrees.length > 1 && (
                <div className="tree-tabs">
                  {originalTrees.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedOriginalTreeIdx(idx)}
                      className={`tab-btn ${selectedOriginalTreeIdx === idx ? 'active' : ''}`}
                    >
                      Parse {idx + 1} {idx === 0 ? "(Inner Bind)" : idx === 1 ? "(Outer Bind)" : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="card-body p-0">
              {originalTrees.length > 0 ? (
                <div className="flex flex-col flex-grow">
                  <div className="p-2 bg-dark border-bottom text-xs font-mono text-center text-warning-light">
                    Found {originalTrees.length} valid parse tree(s) in the original grammar.
                  </div>
                  <TreeViewer 
                    tree={originalTrees[selectedOriginalTreeIdx]} 
                    tokens={tokens}
                    onHoverNode={(node) => setActiveNode(node)}
                    activeNodeId={activeNode?.id}
                  />
                </div>
              ) : (
                <div className="tree-viewer-empty p-5">
                  Input not parsed yet or parsing failed.
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Resolved Unambiguous Parse Tree */}
          <div className="card">
            <div className="card-header">
              <div className="card-title-group">
                <CheckCircle size={16} className="text-success-light" />
                <h2 className="card-title">Resolved Definitive Parse</h2>
              </div>
              <span className="badge badge-success badge-sm">Unambiguous</span>
            </div>
            
            <div className="card-body p-0">
              {rewrittenTrees.length > 0 ? (
                <div className="flex flex-col flex-grow">
                  <div className="p-2 bg-dark border-bottom text-xs font-mono text-center text-success-light">
                    Found exactly {rewrittenTrees.length} parse tree under the rewritten grammar.
                  </div>
                  <TreeViewer 
                    tree={rewrittenTrees[0]} 
                    tokens={tokens}
                    onHoverNode={(node) => setActiveNode(node)}
                    activeNodeId={activeNode?.id}
                  />
                </div>
              ) : (
                <div className="tree-viewer-empty p-5">
                  {rewrittenRules.length > 0 
                    ? "Grammar was rewritten, but this program couldn't be parsed or input failed."
                    : "No rewritten grammar available. Ambiguity must be resolved first."}
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Step-by-Step Educational Explanation */}
          <div className="card">
            <ExplanationPanel 
              testCase={activeTestCase} 
              originalGrammar={grammarText}
              rewrittenGrammar={rewrittenBNF}
            />
          </div>

        </section>

      </main>

      <footer className="footer">
        <p className="flex items-center justify-center gap-1">
          <BookOpen size={12} /> GrammarFix - Built for Compiler Construction Units (Parsing Ambiguity Resolution).
        </p>
      </footer>
    </div>
  );
}
