import { defineFunction } from '@aws-amplify/backend';

export const publishRLS99QsCheckIngestion = defineFunction({
  name: 'publishRLS99QsCheckIngestion',
  entry: './handler.ts',
  timeoutSeconds: 120,
});
