import { defineFunction } from '@aws-amplify/backend';

export const publishRLS04QsUpdateMainDataSetRLS = defineFunction({
  name: 'publishRLS04QsUpdateMainDataSetRLS',
  entry: './handler.ts',
  timeoutSeconds: 120,
});
