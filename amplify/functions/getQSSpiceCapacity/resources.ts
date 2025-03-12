import { defineFunction } from '@aws-amplify/backend';

export const getQSSpiceCapacity = defineFunction({
  name: 'getQSSpiceCapacity',
  entry: './handler.ts',
  timeoutSeconds: 120,
});
