export const stringOperators = [':', '!:', '=', '!=', '^', '!^'];

export const enumOperators = [
  { operator: '=', tokenType: 'enum' },
  { operator: '!=', tokenType: 'enum' },
  ':',
  '!:',
] as const;