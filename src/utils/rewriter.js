/**
 * GrammarFix - Grammar Rewriter Utility
 */

import { detectDanglingElse } from './ambiguity.js';

/**
 * Automatically rewrites an ambiguous dangling-else grammar into an unambiguous one.
 * Uses the matched/unmatched statement technique.
 * @param {object[]} rules 
 * @returns {object|null} Rewritten grammar info or null if not applicable
 */
export function rewriteGrammar(rules) {
  const info = detectDanglingElse(rules);
  if (!info) return null; // No dangling else detected
  
  const S = info.nonTerminal;
  const S_matched = `${S}_matched`;
  const S_unmatched = `${S}_unmatched`;
  
  const rewrittenRules = [];
  
  // Add S -> S_matched | S_unmatched
  rewrittenRules.push({ lhs: S, rhs: [S_matched] });
  rewrittenRules.push({ lhs: S, rhs: [S_unmatched] });
  
  // Get all rules of S
  const sRules = rules.filter(r => r.lhs === S);
  
  // Find the if-then and if-then-else rules in the original list
  const ifThenRule = info.ifThenRule;
  const ifThenElseRule = info.ifThenElseRule;
  
  const isIfThen = (r) => r.lhs === S && JSON.stringify(r.rhs) === JSON.stringify(ifThenRule.rhs);
  const isIfThenElse = (r) => r.lhs === S && JSON.stringify(r.rhs) === JSON.stringify(ifThenElseRule.rhs);
  
  const prefix = info.prefix;
  const elseSym = info.elseSymbol;
  
  // 1. Create S_matched rules
  // - If-then-else rule in S_matched: prefix S_matched else S_matched
  const matchedIfThenElseRhs = [...prefix, S_matched, elseSym, S_matched];
  rewrittenRules.push({ lhs: S_matched, rhs: matchedIfThenElseRhs });
  
  // - Other rules of S: copy as is, keeping S inside them if recursive
  for (const r of sRules) {
    if (isIfThen(r) || isIfThenElse(r)) continue;
    rewrittenRules.push({ lhs: S_matched, rhs: [...r.rhs] });
  }
  
  // 2. Create S_unmatched rules
  // - If-then rule in S_unmatched: prefix S
  const unmatchedIfThenRhs = [...prefix, S];
  rewrittenRules.push({ lhs: S_unmatched, rhs: unmatchedIfThenRhs });
  
  // - If-then-else rule in S_unmatched: prefix S_matched else S_unmatched
  const unmatchedIfThenElseRhs = [...prefix, S_matched, elseSym, S_unmatched];
  rewrittenRules.push({ lhs: S_unmatched, rhs: unmatchedIfThenElseRhs });
  
  // 3. Copy all rules for other non-terminals (they don't change)
  for (const r of rules) {
    if (r.lhs === S) continue;
    // For other non-terminals, if they reference S, they should keep referencing S
    // since S expands to S_matched | S_unmatched automatically.
    rewrittenRules.push({ lhs: r.lhs, rhs: [...r.rhs] });
  }
  
  return {
    originalLHS: S,
    matchedLHS: S_matched,
    unmatchedLHS: S_unmatched,
    rules: rewrittenRules
  };
}

/**
 * Formats structured grammar rules into a standard BNF string.
 * @param {object[]} rules 
 * @returns {string} BNF string
 */
export function rulesToBNF(rules) {
  const groups = new Map();
  for (const r of rules) {
    if (!groups.has(r.lhs)) {
      groups.set(r.lhs, []);
    }
    const rhsStr = r.rhs.length === 0 ? 'ε' : r.rhs.join(' ');
    groups.get(r.lhs).push(rhsStr);
  }
  
  let bnfText = "";
  for (const [lhs, alts] of groups.entries()) {
    bnfText += `${lhs} -> ${alts.join(' | ')}\n`;
  }
  return bnfText.trim();
}
