import { defineFunction } from '@aws-amplify/backend';

export const publishRLS03QsRLSDataSet = defineFunction({
  name: 'publishRLS03QsRLSDataSet',
  entry: './handler.ts',
  timeoutSeconds: 120,
});
