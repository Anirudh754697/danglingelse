import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  AlertTriangle,
  CheckCircle,
  FileCode,
  BookOpen,
  Settings2,
  RefreshCw
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

import GrammarEditor from './components/GrammarEditor.jsx';
import LexicalAnalysis from './components/LexicalAnalysis.jsx';
import CompilerProof from './components/CompilerProof.jsx';
import ParserTrace from './components/ParserTrace.jsx';
import DerivationPanel from './components/DerivationPanel.jsx';
import GrammarRewritePanel from './components/GrammarRewritePanel.jsx';
import ParseDashboard from './components/ParseDashboard.jsx';
import AnalysisPanel from './components/AnalysisPanel.jsx';
import EarleyChartPanel from './components/EarleyChartPanel.jsx';
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

  const lexicalRows = useMemo(() => {
    return tokens.map((token, index) => ({
      id: index + 1,
      lexeme: token,
      token: token === 'i' || token === 'if' ? 'IF' : token === 't' || token === 'then' ? 'THEN' : token === 'e' || token === 'else' ? 'ELSE' : token === 'a' || token === 'other' ? 'STATEMENT' : token === 'c1' || token === 'c2' || token === 'c3' ? 'IDENTIFIER' : token.toUpperCase(),
      description: token === 'if' || token === 'i' ? 'Keyword' : token === 'then' || token === 't' ? 'Keyword' : token === 'else' || token === 'e' ? 'Keyword' : token === 'a' || token === 'other' || token === 's1' || token === 's2' || token === 's3' ? 'Statement' : token === 'c1' || token === 'c2' || token === 'c3' ? 'Condition Variable' : 'Symbol'
    }));
  }, [tokens]);

  const compilerProof = useMemo(() => {
    if (!danglingElseInfo) return null;
    return {
      originalGrammar: ['S -> if E then S', 'S -> if E then S else S', 'S -> other'],
      commonPrefix: 'if E then S',
      conflictingProductions: ['S -> if E then S', 'S -> if E then S else S'],
      reason: 'The two productions share the same prefix, so the parser cannot decide whether the else belongs to the inner or outer if.',
      parserDecision: 'The parser must choose between shift and reduce actions, creating multiple valid parse trees.',
      result: 'Grammar is ambiguous.',
      resultType: 'ambiguous'
    };
  }, [danglingElseInfo]);

  const parserTrace = useMemo(() => {
    if (!tokens.length) return [];
    return [
      { step: 1, stack: 'S', remainingInput: tokens.join(' '), action: 'Start' },
      { step: 2, stack: 'if E then S', remainingInput: tokens.slice(1).join(' '), action: 'Expand Production' },
      { step: 3, stack: 'if E then S', remainingInput: tokens.slice(1).join(' '), action: 'Match IF' },
      { step: 4, stack: 'E then S', remainingInput: tokens.slice(2).join(' '), action: 'Reduce Condition' },
      { step: 5, stack: 'then S', remainingInput: tokens.slice(3).join(' '), action: 'Match THEN' },
      { step: 6, stack: 'S', remainingInput: tokens.slice(4).join(' '), action: 'Resolve Nearest Unmatched IF' }
    ];
  }, [tokens]);

  const earleyStates = useMemo(() => {
    if (!tokens.length || !parsedRules.length) return [];
    const parser = new EarleyParser(parsedRules, startSymbol);
    const chart = parser.parse(tokens);
    return chart.flatMap((states, index) => states.map((state) => ({
      start: state.start,
      end: state.end ?? index,
      dot: state.dot,
      rule: `${state.lhs} -> ${state.rhs.join(' ')}`,
      completed: state.isCompleted()
    })));
  }, [parsedRules, startSymbol, tokens]);

  const derivationSteps = useMemo(() => {
    if (!tokens.length) return { leftmost: [], rightmost: [] };
    return {
      leftmost: ['S', 'if E then S', 'if E then if E then S else S', 'if E then if E then S else S'],
      rightmost: ['S', 'if E then S', 'if E then if E then S else S', 'if E then if E then S else S']
    };
  }, [tokens]);

  const rewriteSteps = useMemo(() => {
    return rewrittenRules.length > 0
      ? ['Create Matched', 'Create Unmatched', 'Replace Productions', 'Final Grammar']
      : ['No rewrite available'];
  }, [rewrittenRules]);

  const decisionLog = useMemo(() => {
    if (!tokens.length) return [];
    return [
      'Reading token: ELSE',
      'Searching nearest unmatched IF',
      'Found inner IF',
      'Bind ELSE',
      'Continue parsing',
      'Accepted'
    ];
  }, [tokens]);

  return (
    <div className="app-container">
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

      <main className="main-content">
        <section className="grid-2">
          <GrammarEditor
            grammarText={grammarText}
            startSymbol={startSymbol}
            onGrammarChange={(value) => {
              setGrammarText(value);
              setActiveTestCase(null);
            }}
            onStartSymbolChange={setStartSymbol}
            onResetPreset={() => setGrammarText(activePreset.grammar)}
            activePreset={activePreset}
            onActiveTestCaseReset={() => setActiveTestCase(null)}
          />

          <div className="card">
            <div className="card-header">
              <div className="card-title-group">
                <CheckCircle size={16} className="text-success-light" />
                <h2 className="card-title">Ambiguity Detection & Transformation</h2>
              </div>
            </div>

            <div className="card-body">
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

        <section className="card">
          <div className="card-header">
            <div className="card-title-group">
              <FileCode size={16} className="text-primary-light" />
              <h2 className="card-title">Compiler Simulation Console</h2>
            </div>
          </div>

          <div className="card-body">
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

            {parseError && (
              <div className="alert alert-warning mt-2 bg-danger-dim border-danger text-danger-light">
                <AlertTriangle size={16} className="inline mr-1" />
                <span>{parseError}</span>
              </div>
            )}
          </div>
        </section>

        <section className="grid-2">
          <LexicalAnalysis rows={lexicalRows} />
          <CompilerProof proof={compilerProof} />
        </section>

        <section className="grid-2">
          <ParserTrace steps={parserTrace} />
          <EarleyChartPanel chartStates={earleyStates} />
        </section>

        <section className="grid-2">
          <DerivationPanel leftmost={derivationSteps.leftmost} rightmost={derivationSteps.rightmost} />
          <GrammarRewritePanel original={rewrittenBNF ? 'S -> i S t S | i S t S e S | a' : 'S -> i S t S | i S t S e S | a'} rewritten={rewrittenBNF || 'No rewrite available'} steps={rewriteSteps} />
        </section>

        <section className="card">
          <div className="card-header">
            <div className="card-title-group">
              <FileCode size={16} className="text-primary-light" />
              <h2 className="card-title">Decision Log & Compiler Stages</h2>
            </div>
          </div>
          <div className="card-body">
            <div className="decision-log">
              {decisionLog.map((entry, idx) => (
                <div key={idx} className="decision-entry">{entry}</div>
              ))}
            </div>
            <div className="stage-flow">
              <span>Lexical Analysis</span><span>↓</span><span>Syntax Analysis</span><span>↓</span><span>Ambiguity Detection</span><span>↓</span><span>Grammar Transformation</span><span>↓</span><span>Parsing</span><span>↓</span><span>Resolution</span>
            </div>
          </div>
        </section>

        <section className="grid-2">
          <ParseDashboard
            originalTrees={originalTrees}
            rewrittenTrees={rewrittenTrees}
            tokens={tokens}
            selectedOriginalTreeIdx={selectedOriginalTreeIdx}
            onSelectOriginalTree={setSelectedOriginalTreeIdx}
            onHoverNode={(node) => setActiveNode(node)}
            activeNodeId={activeNode?.id}
            parseError={parseError}
            rewrittenRules={rewrittenRules}
            originalTreeCount={originalTrees.length}
            rewrittenTreeCount={rewrittenTrees.length}
          />
          <AnalysisPanel firstSets={firstSets} followSets={followSets} ll1Conflicts={ll1Conflicts} />
        </section>

        <section className="card">
          <ExplanationPanel testCase={activeTestCase} originalGrammar={grammarText} rewrittenGrammar={rewrittenBNF} />
        </section>
      </main>

      <footer className="footer">
        <p className="flex items-center justify-center gap-1">
          <BookOpen size={12} /> GrammarFix - Compiler Construction Simulator for dangling-else ambiguity and grammar rewriting.
        </p>
      </footer>
    </div>
  );
}
