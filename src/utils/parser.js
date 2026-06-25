/**
 * GrammarFix - Earley Parser & Tokenizer Utility
 */

/**
 * Tokenizes a source code string into a list of terminal tokens.
 * Handles keywords, identifiers, brackets, and operators.
 * @param {string} text 
 * @returns {string[]}
 */
export function tokenize(text) {
  if (!text) return [];
  // Tokenize words (alphanumeric + underscore) or any single non-whitespace character
  const regex = /[a-zA-Z_][a-zA-Z0-9_]*|[^a-zA-Z0-9_\s]/g;
  return text.match(regex) || [];
}

/**
 * Parses a BNF grammar string into structured rules.
 * Supports "->", "::=", "|" and comment lines starting with "#" or "//".
 * @param {string} bnfText 
 * @returns {{ lhs: string, rhs: string[] }[]}
 */
export function parseGrammar(bnfText) {
  const lines = bnfText.split('\n');
  const rules = [];
  let lastLhs = null;
  
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      continue;
    }
    
    let lhs = null;
    let rhsStr = null;
    
    // Check if it starts with | (continuation of previous rule)
    if (line.startsWith('|')) {
      if (!lastLhs) continue; // invalid grammar
      lhs = lastLhs;
      rhsStr = line.slice(1).trim();
    } else {
      // Split by LHS and RHS arrow
      const match = line.match(/^(.*?)(?:->|::=)(.*)$/);
      if (!match) continue;
      
      lhs = match[1].trim();
      rhsStr = match[2].trim();
      lastLhs = lhs;
    }
    
    const rhsParts = rhsStr.split('|');
    for (let part of rhsParts) {
      const symbols = part.trim().split(/\s+/).filter(s => s !== '');
      // Handle epsilon rules represented by empty RHS or special keyword like "epsilon"
      const rhs = (symbols.length === 1 && (symbols[0] === 'ε' || symbols[0].toLowerCase() === 'epsilon')) 
        ? [] 
        : symbols;
      rules.push({ lhs, rhs });
    }
  }
  
  return rules;
}

/**
 * Represents a state in the Earley parser.
 */
class EarleyState {
  constructor(lhs, rhs, dot, start, end = null) {
    this.lhs = lhs;
    this.rhs = rhs;
    this.dot = dot;
    this.start = start;
    this.end = end; // updated during scanning/completion
    this.parents = []; // stores { prev: EarleyState, completed: EarleyState, terminal: string, position: number }
  }

  isCompleted() {
    return this.dot === this.rhs.length;
  }

  nextSymbol() {
    if (this.isCompleted()) return null;
    return this.rhs[this.dot];
  }

  key() {
    return `${this.lhs} -> ${this.rhs.join(' ')} (@ ${this.dot}), start: ${this.start}`;
  }
}

/**
 * Earley Parser class.
 */
export class EarleyParser {
  constructor(rules, startSymbol = 'S') {
    this.rules = rules;
    this.startSymbol = startSymbol;
    // Determine non-terminals: any symbol on the LHS of any rule
    this.nonTerminals = new Set(rules.map(r => r.lhs));
  }

  isNonTerminal(symbol) {
    return this.nonTerminals.has(symbol);
  }

  parse(tokens) {
    const n = tokens.length;
    const chart = Array.from({ length: n + 1 }, () => []);
    const chartKeys = Array.from({ length: n + 1 }, () => new Map());

    const addState = (index, state) => {
      const k = state.key();
      const existing = chartKeys[index].get(k);
      if (existing) {
        // Merge parents to record multiple parse paths
        for (const p of state.parents) {
          if (!existing.parents.some(ep => ep.prev === p.prev && ep.completed === p.completed && ep.terminal === p.terminal)) {
            existing.parents.push(p);
          }
        }
        return existing;
      }
      state.end = index;
      chart[index].push(state);
      chartKeys[index].set(k, state);
      return state;
    };

    // Initialize with start rules
    const startRules = this.rules.filter(r => r.lhs === this.startSymbol);
    if (startRules.length === 0) {
      // If start symbol is not found, fallback to the LHS of the first rule
      const fallback = this.rules[0]?.lhs || 'S';
      const fallbackRules = this.rules.filter(r => r.lhs === fallback);
      for (const r of fallbackRules) {
        addState(0, new EarleyState(r.lhs, r.rhs, 0, 0));
      }
    } else {
      for (const r of startRules) {
        addState(0, new EarleyState(r.lhs, r.rhs, 0, 0));
      }
    }

    for (let i = 0; i <= n; i++) {
      const states = chart[i];
      // Note: states array can grow during iteration (prediction/completion)
      for (let sIdx = 0; sIdx < states.length; sIdx++) {
        const state = states[sIdx];
        
        if (state.isCompleted()) {
          // COMPLETE
          const lhs = state.lhs;
          const start = state.start;
          const completionTargetStates = chart[start];
          
          for (let pIdx = 0; pIdx < completionTargetStates.length; pIdx++) {
            const prevState = completionTargetStates[pIdx];
            if (prevState.nextSymbol() === lhs) {
              const newState = new EarleyState(prevState.lhs, prevState.rhs, prevState.dot + 1, prevState.start);
              newState.parents.push({ prev: prevState, completed: state });
              addState(i, newState);
            }
          }
        } else {
          const nextSym = state.nextSymbol();
          if (this.isNonTerminal(nextSym)) {
            // PREDICT
            const prodRules = this.rules.filter(r => r.lhs === nextSym);
            for (const r of prodRules) {
              const newState = new EarleyState(r.lhs, r.rhs, 0, i);
              addState(i, newState);
            }
            // If next symbol can derive epsilon, we also predict completion
            // Handled automatically when the epsilon rule itself completes
          } else {
            // SCAN
            if (i < n && nextSym === tokens[i]) {
              const newState = new EarleyState(state.lhs, state.rhs, state.dot + 1, state.start);
              newState.parents.push({ prev: state, terminal: tokens[i], position: i });
              addState(i + 1, newState);
            }
          }
        }
      }
    }

    return chart;
  }

  /**
   * Reconstructs all valid parse trees from the chart.
   * @param {EarleyState[][]} chart 
   * @param {string[]} tokens 
   * @returns {object[]} Array of parse trees
   */
  getParseTrees(chart, tokens) {
    const n = tokens.length;
    // Find successful completions of start symbol
    const finalStates = chart[n].filter(s => 
      (s.lhs === this.startSymbol || s.lhs === this.rules[0]?.lhs) && 
      s.isCompleted() && 
      s.start === 0
    );

    const trees = [];
    const memo = new Map();

    // Helper to generate trees for a state
    const generateTrees = (state) => {
      const key = `${state.key()}, end: ${state.end}`;
      if (memo.has(key)) return memo.get(key);

      // If dot === 0, base case of the rule: return an empty list of children
      if (state.dot === 0) {
        return [[]];
      }

      const results = [];

      for (const parent of state.parents) {
        if (parent.terminal !== undefined) {
          // Scanned a terminal
          const prevTreesList = generateTrees(parent.prev);
          const leaf = { 
            type: 'terminal', 
            label: parent.terminal, 
            start: parent.position, 
            end: parent.position + 1 
          };
          for (const prevTrees of prevTreesList) {
            results.push([...prevTrees, leaf]);
          }
        } else if (parent.completed !== undefined) {
          // Completed a non-terminal
          const prevTreesList = generateTrees(parent.prev);
          const childTrees = generateTrees(parent.completed);
          
          // Wrap the completed rule inside a non-terminal node
          const completedNodeList = [];
          for (const subChildren of childTrees) {
            completedNodeList.push({
              type: 'nonterminal',
              label: parent.completed.lhs,
              rule: `${parent.completed.lhs} -> ${parent.completed.rhs.join(' ')}`,
              children: subChildren,
              start: parent.completed.start,
              end: parent.completed.end
            });
          }

          // Combine each prefix with each completed subtree (Cartesian product)
          for (const prevTrees of prevTreesList) {
            for (const cNode of completedNodeList) {
              results.push([...prevTrees, cNode]);
            }
          }
        }
      }

      // Deduplicate results based on stringified JSON to avoid identical trees from different chart derivations
      const seen = new Set();
      const uniqueResults = [];
      for (const res of results) {
        const str = JSON.stringify(res);
        if (!seen.has(str)) {
          seen.add(str);
          uniqueResults.push(res);
        }
      }

      memo.set(key, uniqueResults);
      return uniqueResults;
    };

    for (const fs of finalStates) {
      const completedRulesTrees = generateTrees(fs);
      for (const children of completedRulesTrees) {
        trees.push({
          type: 'nonterminal',
          label: fs.lhs,
          rule: `${fs.lhs} -> ${fs.rhs.join(' ')}`,
          children,
          start: 0,
          end: n
        });
      }
    }

    return trees;
  }
}
