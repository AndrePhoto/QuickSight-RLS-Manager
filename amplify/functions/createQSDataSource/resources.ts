import { defineFunction } from '@aws-amplify/backend';

export const createQSDataSource = defineFunction({
  name: 'createQSDataSource',
  entry: './handler.ts',
  timeoutSeconds: 120,
});
