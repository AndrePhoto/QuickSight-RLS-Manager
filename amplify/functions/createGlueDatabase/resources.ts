import { defineFunction } from '@aws-amplify/backend';

export const createGlueDatabase = defineFunction({
  name: 'createGlueDatabase',
  entry: './handler.ts',
  timeoutSeconds: 120,
});
