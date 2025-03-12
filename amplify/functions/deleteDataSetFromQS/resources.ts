// Create an Amplify Function to do some CDK invocation
import {defineFunction} from '@aws-amplify/backend'

export const deleteDataSetFromQS = defineFunction({
    name: 'deleteDataSetFromQS',
    entry: './handler.ts',
    timeoutSeconds: 120,
})