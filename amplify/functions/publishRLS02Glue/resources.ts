import { defineFunction } from '@aws-amplify/backend';

export const publishRLS02Glue = defineFunction({
  name: 'publishRLS02Glue',
  entry: './handler.ts',
  timeoutSeconds: 120,
});
