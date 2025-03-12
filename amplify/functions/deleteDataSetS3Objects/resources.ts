import { defineFunction } from '@aws-amplify/backend';

export const deleteDataSetS3Objects = defineFunction({
  name: 'deleteDataSetS3Objects',
  entry: './handler.ts',
  timeoutSeconds: 120,
});
