// Create an Amplify Function to do some CDK invocation
import {defineFunction} from '@aws-amplify/backend'

export const fetchDataSetsFromQS = defineFunction({
    name: 'fetchDataSetsFromQS',
    entry: './handler.ts',
    timeoutSeconds: 120,
    environment: {
      API_MAX_RESULTS: "50"
    }
})