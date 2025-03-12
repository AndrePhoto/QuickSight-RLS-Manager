import { defineFunction } from '@aws-amplify/backend';

export const publishRLS01S3 = defineFunction({
  name: 'publishRLS01S3',
  entry: './handler.ts',
  timeoutSeconds: 120,
});
