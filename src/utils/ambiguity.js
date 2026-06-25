/**
 * GrammarFix - Ambiguity Detector & LL(1) Analyzer Utility
 */

import { EarleyParser, tokenize } from './parser.js';

/**
 * Computes the FIRST sets for all symbols in the grammar.
 * @param {object[]} rules 
 * @param {Set<string>} nonTerminals 
 * @returns {Map<string, Set<string>>}
 */
export function computeFirstSets(rules, nonTerminals) {
  const firstSets = new Map();

  // Initialize
  for (const rule of rules) {
    if (!firstSets.has(rule.lhs)) {
      firstSets.set(rule.lhs, new Set());
    }
    for (const sym of rule.rhs) {
      if (!nonTerminals.has(sym) && !firstSets.has(sym)) {
        firstSets.set(sym, new Set([sym]));
      }
    }
  }
  // Ensure all non-terminals are in the map
  for (const nt of nonTerminals) {
    if (!firstSets.has(nt)) {
      firstSets.set(nt, new Set());
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const rule of rules) {
      const lhs = rule.lhs;
      const firstLhs = firstSets.get(lhs);
      const beforeSize = firstLhs.size;

      if (rule.rhs.length === 0) {
        firstLhs.add('ε');
      } else {
        let allDeriveEpsilon = true;
        for (const sym of rule.rhs) {
          const firstSym = firstSets.get(sym) || new Set([sym]);
          for (const s of firstSym) {
            if (s !== 'ε') {
              firstLhs.add(s);
            }
          }
          if (!firstSym.has('ε')) {
            allDeriveEpsilon = false;
            break;
          }
        }
        if (allDeriveEpsilon) {
          firstLhs.add('ε');
        }
      }

      if (firstLhs.size > beforeSize) {
        changed = true;
      }
    }
  }

  return firstSets;
}

/**
 * Computes the FOLLOW sets for all non-terminals in the grammar.
 * @param {object[]} rules 
 * @param {Set<string>} nonTerminals 
 * @param {Map<string, Set<string>>} firstSets 
 * @param {string} startSymbol 
 * @returns {Map<string, Set<string>>}
 */
export function computeFollowSets(rules, nonTerminals, firstSets, startSymbol) {
  const followSets = new Map();

  // Initialize
  for (const nt of nonTerminals) {
    followSets.set(nt, new Set());
  }
  if (followSets.has(startSymbol)) {
    followSets.get(startSymbol).add('$');
  } else if (rules.length > 0) {
    // Fallback to first rule LHS
    const fallback = rules[0].lhs;
    if (followSets.has(fallback)) {
      followSets.get(fallback).add('$');
    }
  }

  // Helper to compute First of a sequence of symbols
  const getSequenceFirst = (sequence) => {
    const result = new Set();
    if (sequence.length === 0) {
      result.add('ε');
      return result;
    }
    for (const sym of sequence) {
      const firstSym = firstSets.get(sym) || new Set([sym]);
      for (const s of firstSym) {
        if (s !== 'ε') result.add(s);
      }
      if (!firstSym.has('ε')) {
        return result;
      }
    }
    result.add('ε');
    return result;
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (const rule of rules) {
      const lhs = rule.lhs;
      const rhs = rule.rhs;

      for (let i = 0; i < rhs.length; i++) {
        const sym = rhs[i];
        if (!nonTerminals.has(sym)) continue;

        const followSym = followSets.get(sym);
        const beforeSize = followSym.size;

        const rest = rhs.slice(i + 1);
        const firstRest = getSequenceFirst(rest);

        for (const s of firstRest) {
          if (s !== 'ε') {
            followSym.add(s);
          }
        }

        if (firstRest.has('ε')) {
          const followLhs = followSets.get(lhs) || new Set();
          for (const s of followLhs) {
            followSym.add(s);
          }
        }

        if (followSym.size > beforeSize) {
          changed = true;
        }
      }
    }
  }

  return followSets;
}

/**
 * Builds the LL(1) parsing table and returns conflicts.
 * @param {object[]} rules 
 * @param {Set<string>} nonTerminals 
 * @param {Map<string, Set<string>>} firstSets 
 * @param {Map<string, Set<string>>} followSets 
 * @returns {object} { table: Map, conflicts: object[] }
 */
export function analyzeLL1(rules, nonTerminals, firstSets, followSets) {
  const table = new Map(); // key: "NonTerminal,Terminal" -> array of rules
  const conflicts = [];

  // Helper to compute First of a sequence of symbols
  const getSequenceFirst = (sequence) => {
    const result = new Set();
    if (sequence.length === 0) {
      result.add('ε');
      return result;
    }
    for (const sym of sequence) {
      const firstSym = firstSets.get(sym) || new Set([sym]);
      for (const s of firstSym) {
        if (s !== 'ε') result.add(s);
      }
      if (!firstSym.has('ε')) {
        return result;
      }
    }
    result.add('ε');
    return result;
  };

  for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
    const rule = rules[ruleIndex];
    const lhs = rule.lhs;
    const rhs = rule.rhs;
    const firstRhs = getSequenceFirst(rhs);

    const addRuleToTable = (nt, term) => {
      const cellKey = `${nt},${term}`;
      if (!table.has(cellKey)) {
        table.set(cellKey, []);
      }
      const cellRules = table.get(cellKey);
      if (!cellRules.some(r => r.index === ruleIndex)) {
        cellRules.push({ ...rule, index: ruleIndex });
      }
      if (cellRules.length > 1) {
        const conflict = {
          nonTerminal: nt,
          terminal: term,
          rules: [...cellRules]
        };
        if (!conflicts.some(c => c.nonTerminal === nt && c.terminal === term)) {
          conflicts.push(conflict);
        }
      }
    };

    for (const term of firstRhs) {
      if (term !== 'ε') {
        addRuleToTable(lhs, term);
      }
    }

    if (firstRhs.has('ε')) {
      const followLhs = followSets.get(lhs) || new Set();
      for (const term of followLhs) {
        addRuleToTable(lhs, term);
      }
    }
  }

  return { table, conflicts };
}

/**
 * Automatically detects whether the grammar has a dangling-else ambiguity pattern.
 * Checks for a non-terminal S with rules:
 *   S -> prefix S
 *   S -> prefix S Y S  (where Y represents "else")
 * @param {object[]} rules 
 * @returns {object|null} Dangling-else details or null
 */
export function detectDanglingElse(rules) {
  // Find non-terminals
  const nonTerminals = new Set(rules.map(r => r.lhs));

  for (const nt of nonTerminals) {
    const ntRules = rules.filter(r => r.lhs === nt);
    
    // Look for a pair of rules representing if-then and if-then-else
    for (let i = 0; i < ntRules.length; i++) {
      const rule1 = ntRules[i];
      // Rule 1 should end with nt (e.g. S -> ... S)
      if (rule1.rhs.length < 2 || rule1.rhs[rule1.rhs.length - 1] !== nt) continue;
      
      const prefix1 = rule1.rhs.slice(0, -1);

      for (let j = 0; j < ntRules.length; j++) {
        if (i === j) continue;
        const rule2 = ntRules[j];
        
        // Rule 2 should be S -> prefix1 S Y S
        // RHS length should be prefix1.length + 1 (for S) + 1 (for Y) + 1 (for S)
        if (rule2.rhs.length !== prefix1.length + 3) continue;

        // Check prefix match
        let prefixMatch = true;
        for (let k = 0; k < prefix1.length; k++) {
          if (rule2.rhs[k] !== prefix1[k]) {
            prefixMatch = false;
            break;
          }
        }
        if (!prefixMatch) continue;

        // Check S at rule2.rhs[prefix1.length]
        if (rule2.rhs[prefix1.length] !== nt) continue;

        // Check S at the end
        if (rule2.rhs[rule2.rhs.length - 1] !== nt) continue;

        // The symbol at prefix1.length + 1 is the else terminal
        const elseSymbol = rule2.rhs[prefix1.length + 1];

        // Ensure else symbol is a terminal
        if (nonTerminals.has(elseSymbol)) continue;

        return {
          nonTerminal: nt,
          ifThenRule: rule1,
          ifThenElseRule: rule2,
          elseSymbol: elseSymbol,
          prefix: prefix1
        };
      }
    }
  }

  return null;
}

/**
 * Systematically generates short terminal strings derived by the grammar to search for ambiguity.
 * Runs the Earley parser on each. Returns the first string found with >=2 parse trees.
 * @param {object[]} rules 
 * @param {string} startSymbol 
 * @param {number} maxLength 
 * @returns {object|null} Proof of ambiguity or null
 */
export function detectGeneralAmbiguity(rules, startSymbol = 'S', maxLength = 7) {
  const nonTerminals = new Set(rules.map(r => r.lhs));
  const fallbackStart = rules[0]?.lhs || 'S';
  const start = nonTerminals.has(startSymbol) ? startSymbol : fallbackStart;

  // Gather terminals
  const terminals = new Set();
  for (const r of rules) {
    for (const sym of r.rhs) {
      if (!nonTerminals.has(sym) && sym !== 'ε') {
        terminals.add(sym);
      }
    }
  }

  // Queue of sentential forms
  const queue = [[start]];
  const visited = new Set();
  visited.add(start);

  const testStrings = [];
  const maxStringsToTest = 120; // Bound the search to keep it instant

  while (queue.length > 0 && testStrings.length < maxStringsToTest) {
    const form = queue.shift();

    // Check if form is fully terminal
    const isAllTerminals = form.every(sym => !nonTerminals.has(sym));
    if (isAllTerminals) {
      if (form.length > 0) {
        testStrings.push(form);
      }
      continue;
    }

    if (form.length > maxLength) continue;

    // Find the first non-terminal
    const ntIdx = form.findIndex(sym => nonTerminals.has(sym));
    const nt = form[ntIdx];

    const prodRules = rules.filter(r => r.lhs === nt);
    for (const r of prodRules) {
      // Epsilon replacement
      const replacement = r.rhs;
      const nextForm = [
        ...form.slice(0, ntIdx),
        ...replacement,
        ...form.slice(ntIdx + 1)
      ];

      const key = nextForm.join(' ');
      if (!visited.has(key) && nextForm.length <= maxLength + 2) {
        visited.add(key);
        queue.push(nextForm);
      }
    }
  }

  // Now parse the test strings using EarleyParser
  const parser = new EarleyParser(rules, start);
  let firstValidString = null;
  
  for (const tokens of testStrings) {
    try {
      const chart = parser.parse(tokens);
      const trees = parser.getParseTrees(chart, tokens);
      if (trees.length >= 2) {
        return {
          ambiguousString: tokens.join(' '),
          tokens: tokens,
          trees: trees,
          treeCount: trees.length,
          firstValidString: tokens.join(' ')
        };
      }
      if (trees.length >= 1 && !firstValidString) {
        firstValidString = tokens.join(' ');
      }
    } catch (e) {
      // Parse error, ignore
    }
  }

  return firstValidString ? { firstValidString } : null;
}
