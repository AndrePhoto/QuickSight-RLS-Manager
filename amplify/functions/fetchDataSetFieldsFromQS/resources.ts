// Create an Amplify Function to do some CDK invocation
import {defineFunction} from '@aws-amplify/backend'

export const fetchDataSetFieldsFromQS = defineFunction({
    name: 'fetchDataSetFieldsFromQS',
    entry: './handler.ts',
    timeoutSeconds: 120,
})