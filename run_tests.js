/**
 * GrammarFix - Test Suite Runner
 */

import { parseGrammar, tokenize, EarleyParser } from './src/utils/parser.js';
import { detectDanglingElse, detectGeneralAmbiguity } from './src/utils/ambiguity.js';
import { rewriteGrammar, rulesToBNF } from './src/utils/rewriter.js';

// Helper to inspect tree count
function checkParsing(grammarRules, startSymbol, tokens, expectedTreesCount) {
  const parser = new EarleyParser(grammarRules, startSymbol);
  const chart = parser.parse(tokens);
  const trees = parser.getParseTrees(chart, tokens);
  
  if (trees.length !== expectedTreesCount) {
    console.error(`❌ Test failed for tokens [${tokens.join(' ')}]: Expected ${expectedTreesCount} parse trees, got ${trees.length}`);
    return false;
  }
  console.log(`✅ Test passed for tokens [${tokens.join(' ')}]: Found ${trees.length} tree(s)`);
  return true;
}

function runAllTests() {
  console.log("=== RUNNING GRAMMARFIX ALGORITHMIC TESTS ===\n");

  // 1. Defining the standard ambiguous dangling-else grammar
  const bnfAmbiguous = `
    S -> i S t S
       | i S t S e S
       | a
  `;

  console.log("Parsing Ambiguous Grammar...");
  const ambiguousRules = parseGrammar(bnfAmbiguous);
  console.log("Rules loaded:", ambiguousRules.length);
  console.log(rulesToBNF(ambiguousRules));
  console.log();

  // 2. Ambiguity Detection
  console.log("Detecting Dangling Else...");
  const danglingElseInfo = detectDanglingElse(ambiguousRules);
  if (danglingElseInfo) {
    console.log(`✅ Dangling Else detected in non-terminal: ${danglingElseInfo.nonTerminal}`);
    console.log(`   If-then rule: S -> ${danglingElseInfo.ifThenRule.rhs.join(' ')}`);
    console.log(`   If-then-else rule: S -> ${danglingElseInfo.ifThenElseRule.rhs.join(' ')}`);
  } else {
    console.error("❌ Failed to detect dangling else in ambiguous grammar!");
  }
  console.log();

  // 3. Grammar Rewriting
  console.log("Rewriting Grammar...");
  const rewriteResult = rewriteGrammar(ambiguousRules);
  if (!rewriteResult) {
    console.error("❌ Failed to rewrite grammar!");
    return;
  }
  const unambiguousRules = rewriteResult.rules;
  console.log("✅ Grammar rewritten successfully! Unambiguous rules BNF:");
  console.log(rulesToBNF(unambiguousRules));
  console.log();

  // 4. Verification with the 5 Test Programs
  console.log("Verifying 5 Test Programs...");
  let allPassed = true;

  const testPrograms = [
    {
      name: "Test 1: Simple if-then-else (unambiguous)",
      input: "i a t a e a",
      expectedAmbiguous: 1,
      expectedUnambiguous: 1
    },
    {
      name: "Test 2: Classic dangling-else (ambiguous)",
      input: "i a t i a t a e a",
      expectedAmbiguous: 2,
      expectedUnambiguous: 1
    },
    {
      name: "Test 3: Double nested dangling-else (ambiguous)",
      input: "i a t i a t i a t a e a e a",
      expectedAmbiguous: 3, // S -> i S t S vs S -> i S t S e S nested options
      expectedUnambiguous: 1
    },
    {
      name: "Test 4: Else-if chain (unambiguous)",
      input: "i a t a e i a t a e a",
      expectedAmbiguous: 1,
      expectedUnambiguous: 1
    },
    {
      name: "Test 5: Complex nested (ambiguous)",
      input: "i a t i a t a e i a t a e a e a",
      expectedAmbiguous: 1,
      expectedUnambiguous: 1
    }
  ];

  for (const prog of testPrograms) {
    console.log(`\n--- Running ${prog.name} ---`);
    console.log(`Input: "${prog.input}"`);
    const tokens = tokenize(prog.input);
    
    console.log("Testing Ambiguous Grammar Parsing...");
    const okAmb = checkParsing(ambiguousRules, 'S', tokens, prog.expectedAmbiguous);
    
    console.log("Testing Unambiguous Grammar Parsing...");
    const okUnamb = checkParsing(unambiguousRules, 'S', tokens, prog.expectedUnambiguous);
    
    if (!okAmb || !okUnamb) {
      allPassed = false;
    }
  }

  // 5. General Ambiguity Detection
  console.log("\n=== GENERAL AMBIGUITY DETECTION ===");
  const arithmeticAmbiguous = `
    E -> E + E
       | E * E
       | id
  `;
  const arithmeticRules = parseGrammar(arithmeticAmbiguous);
  console.log("Parsing Arithmetic Grammar...");
  console.log(rulesToBNF(arithmeticRules));
  
  console.log("Scanning for general ambiguity...");
  const ambiguityProof = detectGeneralAmbiguity(arithmeticRules, 'E', 6);
  if (ambiguityProof) {
    console.log("✅ SUCCESS: Detected general ambiguity!");
    console.log(`   Ambiguous terminal sequence: "${ambiguityProof.ambiguousString}"`);
    console.log(`   Found ${ambiguityProof.treeCount} distinct parse trees!`);
  } else {
    console.error("❌ Failed to detect ambiguity in E -> E + E | E * E | id!");
    allPassed = false;
  }

  console.log("\n=============================================");
  if (allPassed) {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉");
  } else {
    console.log("❌ SOME TESTS FAILED. Please review the errors above.");
  }
  console.log("=============================================");
}

runAllTests();
