// Create an Amplify Function to do some CDK invocation
import {defineFunction} from '@aws-amplify/backend'

export const setAccount = defineFunction({
    name: 'setAccount',
    entry: './handler.ts',
    timeoutSeconds: 120,
})