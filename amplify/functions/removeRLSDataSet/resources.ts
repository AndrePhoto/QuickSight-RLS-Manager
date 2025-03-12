// Create an Amplify Function to do some CDK invocation
import {defineFunction} from '@aws-amplify/backend'

export const removeRLSDataSet = defineFunction({
    name: 'removeRLSDataSet',
    entry: './handler.ts',
    timeoutSeconds: 120,
})