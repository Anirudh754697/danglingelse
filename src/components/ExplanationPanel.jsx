import React from 'react';
import { HelpCircle, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * ExplanationPanel - Renders step-by-step parser resolution details and matched/unmatched explanation
 */
export default function ExplanationPanel({ testCase, originalGrammar, rewrittenGrammar }) {
  const getExplanation = () => {
    if (!testCase) {
      return {
        title: "Dangling-Else Ambiguity Overview",
        steps: [
          "Dangling-else occurs when nested conditional statements share an else branch, making it ambiguous which if the else belongs to.",
          "In the standard grammar, S -> i S t S | i S t S e S is ambiguous because a string like i a t i a t a e a has two valid derivations.",
          "Resolving it requires splitting statements into Matched Statements (all ifs have elses) and Unmatched Statements (at least one if lacks an else).",
          "By defining S_unmatched -> i S_matched t S_unmatched e S, we enforce that the then branch of an if-else statement must be a Matched Statement, which prevents the outer else from dangling inside."
        ]
      };
    }

    switch (testCase.name) {
      case "Test 1: Simple if-then-else (unambiguous)":
        return {
          title: "Test 1: Simple If-Then-Else",
          status: "unambiguous",
          desc: "This statement contains exactly one if and one else. There is no ambiguity.",
          steps: [
            "Input structure: if (c1) then s1 else s2.",
            "Since there is only one if, the else has only one possible binder (the root if).",
            "Both the ambiguous and unambiguous grammars parse this with exactly one parse tree.",
            "In the rewritten grammar, it matches S_matched -> i S_matched t S_matched e S_matched where the branch statements are base statements (terminals)."
          ]
        };
      case "Test 2: Classic dangling-else (ambiguous)":
        return {
          title: "Test 2: Classic Dangling-Else Resolution",
          status: "resolved",
          desc: "This is the classic dangling-else ambiguity: 2 ifs and only 1 else. The else can bind to either if.",
          steps: [
            "Conflict: Does the else associate with the outer if (if c1) or the inner if (if c2)?",
            "Ambiguous parses: The Earley parser extracts two valid parse trees from the original grammar: Tree A (innermost bind) and Tree B (outermost bind).",
            "Rewriting rule: We restrict the then branch of an if-else statement to be S_matched.",
            "Disallowed parse (Outer Bind): The structure would be if c1 then [if c2 then s1] else s2. Since [if c2 then s1] has no else, it is Unmatched. But the rule for an if-else requires the then branch to be Matched. Thus, this parse is rejected.",
            "Allowed parse (Inner Bind): The outer statement is parsed as an if-then statement (S_unmatched -> i S t S). The inner statement is if c2 then s1 else s2, which is S_matched. Since the then branch of an if-then rule can be S (either matched or unmatched), this parse is accepted.",
            "Result: The ambiguity is resolved, forcing the else to bind to the most-recent if (if c2)."
          ]
        };
      case "Test 3: Double nested dangling-else (ambiguous)":
        return {
          title: "Test 3: Double Nested Dangling-Else Resolution",
          status: "resolved",
          desc: "This contains 3 ifs and 2 elses, creating multiple competing parse paths.",
          steps: [
            "Conflict: In the ambiguous grammar, the two elses can be distributed in 3 different ways among the 3 ifs, yielding 3 separate parse trees.",
            "Innermost resolution: In the rewritten grammar, only one parse tree is valid.",
            "The parser binds else s2 to if c3 (the most recent if) and else s3 to if c2 (the next most recent if).",
            "The outermost if c1 remains unmatched (has no else).",
            "This behaves like nested blocks: each else climbs back to match the closest preceding unmatched if, preventing outer elses from breaking the scope of inner blocks."
          ]
        };
      case "Test 4: Else-if chain (unambiguous)":
        return {
          title: "Test 4: Else-If Chain Analysis",
          status: "unambiguous",
          desc: "A standard else-if chain is syntactically unambiguous because the else explicitly matches the preceding if, and the nested if is in the else branch.",
          steps: [
            "Input structure: if (c1) then s1 else if (c2) then s2 else s3.",
            "The first else clause is else [if c2...]. Since the else branch of the rule (S_unmatched -> i S_matched t S_unmatched e S) can be any statement S (matched or unmatched), the nested if statement fits perfectly in the else branch.",
            "There are no competing interpretations because the nested if does not precede the else; it is inside it.",
            "Both the ambiguous and resolved grammars parse this as a single, unambiguous tree."
          ]
        };
      case "Test 5: Complex nested (ambiguous)":
        return {
          title: "Test 5: Complex Nested If-Else Structure",
          status: "resolved",
          desc: "This case has 3 ifs and 3 elses. In both grammars, it parses to exactly 1 tree because all conditionals are matched.",
          steps: [
            "Input: if c1 then (if c2 then s1 else (if c3 then s2 else s3)) else s4.",
            "Since the number of elses matches the number of ifs (3 of each), there are no dangling branches at the end.",
            "Every if has a corresponding else, meaning the entire statement is S_matched.",
            "The outer S_matched resolves to i S_matched t S_matched e S_matched, where the then branch is itself a matched if-else statement."
          ]
        };
      default:
        return {
          title: "Custom Test Program Trace",
          status: "custom",
          desc: "Tracing your custom input program against the matched/unmatched grammar rules.",
          steps: [
            "Tokens are extracted and parsed against both the ambiguous and unambiguous grammars.",
            "If the ambiguous grammar yields multiple trees, it demonstrates dangling-else or other grammatical ambiguity.",
            "The unambiguous grammar should yield exactly one tree, resolving any ambiguity in favor of the innermost binding.",
            "Examine the parse tree node names (S_matched vs S_unmatched) to trace the hierarchy."
          ]
        };
    }
  };

  const exp = getExplanation();

  return (
    <div className="explanation-panel">
      <div className="panel-header">
        <HelpCircle size={18} className="text-primary-light" />
        <h3 className="panel-title">{exp.title}</h3>
      </div>
      
      <div className="panel-body">
        {exp.desc && (
          <div className="panel-desc">
            <span className="desc-text">{exp.desc}</span>
            {exp.status === 'resolved' && (
              <span className="badge badge-success mt-1">
                <CheckCircle2 size={12} className="inline mr-1" />
                Ambiguity Resolved (Innermost Bind)
              </span>
            )}
            {exp.status === 'unambiguous' && (
              <span className="badge badge-info mt-1">
                <AlertCircle size={12} className="inline mr-1" />
                Naturally Unambiguous
              </span>
            )}
          </div>
        )}

        <div className="explanation-steps">
          <span className="section-subtitle">How Parsing Resolves Ambiguity:</span>
          <ol className="steps-list">
            {exp.steps.map((step, idx) => (
              <li key={idx} className="step-item">
                <span className="step-number">{idx + 1}</span>
                <span className="step-content">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="grammar-rules-reference">
          <span className="section-subtitle">Rewriting Logic & Grammar Invariant:</span>
          <div className="alert alert-info">
            <p className="alert-text">
              <strong>Invariant:</strong> The <code>then</code> branch of an <code>if-else</code> statement is restricted to <code>S_matched</code>.
            </p>
            <p className="alert-subtext mt-1 text-xs">
              This prevents an unmatched nested statement from catching a trailing else that belongs to the outer statement.
            </p>
          </div>

          <div className="side-by-side-rules mt-3">
            <div>
              <span className="rule-label">Original Ambiguous Rules:</span>
              <pre className="rule-box font-mono">
                {`S -> i S t S\n   | i S t S e S\n   | other`}
              </pre>
            </div>
            <div>
              <span className="rule-label">Rewritten Unambiguous Rules:</span>
              <pre className="rule-box font-mono">
                {`S -> S_matched | S_unmatched\n\nS_matched -> i S_matched t S_matched e S_matched\n           | other\n\nS_unmatched -> i S t S\n             | i S_matched t S_unmatched e S`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
