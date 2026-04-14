// IEC-convention terminal autofill pairs.
// Togglable per element (off by default).

interface PairRule {
  elementTypes: string[];
  pairs: [string, string, string?][]; // [input, suggestion, label?]
}

const PAIR_RULES: PairRule[] = [
  {
    elementTypes: ['Relay', 'Timer Relay'],
    pairs: [
      ['A1', 'A2'],
      ['11', '12', 'NC'],
      ['13', '14', 'NO'],
      ['21', '22', 'NC'],
      ['23', '24', 'NO'],
      ['31', '32', 'NC'],
      ['33', '34', 'NO'],
      ['41', '42', 'NC'],
      ['43', '44', 'NO'],
    ],
  },
  {
    elementTypes: ['Contactor'],
    pairs: [
      ['A1', 'A2'],
      ['1', '2'],
      ['3', '4'],
      ['5', '6'],
      ['13', '14', 'aux NO'],
      ['11', '12', 'aux NC'],
    ],
  },
  {
    elementTypes: ['Push Button'],
    pairs: [
      ['13', '14', 'NO'],
      ['11', '12', 'NC'],
      ['23', '24', 'NO'],
      ['21', '22', 'NC'],
    ],
  },
  {
    elementTypes: ['Circuit Breaker'],
    pairs: [
      ['1', '2'],
      ['3', '4'],
      ['5', '6'],
    ],
  },
  {
    elementTypes: ['Motor'],
    pairs: [
      ['U1', 'V1'],
      ['V1', 'W1'],
      ['U2', 'V2'],
      ['V2', 'W2'],
    ],
  },
];

/**
 * Given an element type and a terminal designation, return the suggested
 * next terminal designation, or null if no suggestion exists.
 */
export function getAutofillSuggestion(
  elementType: string | null,
  designation: string,
): { designation: string; label?: string } | null {
  if (!elementType) return null;

  for (const rule of PAIR_RULES) {
    if (!rule.elementTypes.includes(elementType)) continue;
    for (const [input, suggestion, label] of rule.pairs) {
      if (input === designation) {
        return { designation: suggestion, label };
      }
    }
  }

  return null;
}
