import { defineFunction } from '@aws-amplify/backend';

export const createS3Bucket = defineFunction({
  name: 'createS3Bucket',
  entry: './handler.ts',
  timeoutSeconds: 120,
});
