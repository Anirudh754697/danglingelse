// src/utils/lexer.js

const tokenMap = {
  i: "IF",
  t: "THEN",
  e: "ELSE",
  a: "STATEMENT",
};

export function tokenize(input) {
  const symbols = input.trim().split(/\s+/);

  const tokens = symbols.map((symbol, index) => ({
    id: index + 1,
    lexeme: symbol,
    token: tokenMap[symbol] || "UNKNOWN",
  }));

  return tokens;
}