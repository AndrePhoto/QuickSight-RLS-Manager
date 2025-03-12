import { defineFunction } from '@aws-amplify/backend';

export const publishRLS00ResourcesValidation = defineFunction({
  name: 'publishRLS00ResourcesValidation',
  entry: './handler.ts',
  timeoutSeconds: 120,
});
