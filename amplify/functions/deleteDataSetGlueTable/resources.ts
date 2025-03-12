import { defineFunction } from '@aws-amplify/backend';

export const deleteDataSetGlueTable = defineFunction({
  name: 'deleteDataSetGlueTable',
  entry: './handler.ts',
  timeoutSeconds: 120,
});
