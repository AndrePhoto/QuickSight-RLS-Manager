// Create an Amplify Function to do some CDK invocation
import {defineFunction} from '@aws-amplify/backend'

export const fetchNamespacesFromQS = defineFunction({
    name: 'fetchNamespacesFromQS',
    entry: './handler.ts',
    timeoutSeconds: 120,
    environment: {
        API_MAX_RESULTS: "50"
    }
})