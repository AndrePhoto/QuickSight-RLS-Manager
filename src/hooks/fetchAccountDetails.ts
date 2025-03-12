import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

// Define the return type for better type safety
type AccountDetails = {
    account_id: string | null;
    qs_management_region: string | null;
    s3_bucket: string | null;
  };

export const fetchAccountDetails = async () : Promise<AccountDetails | undefined> => {
console.info("fetchAccountDetails: START")
try {
    const response = await client.models.AccountDetails.list({
        authMode: 'userPool'
    });


    if (response.data.length > 0 && response.data[0]) { 
        console.info("fetchAccountDetails: Account Details Found.")
        return{
            account_id: response.data[0].accountId,
            qs_management_region: response.data[0].qsManagementRegion,
            s3_bucket: "FOUND"
        }
    }else{
        console.warn("fetchAccountDetails: Account Details are set yet. Please enter them.")
        return{
            account_id: null,
            qs_management_region: null,
            s3_bucket: "NOT FOUND"
        }
    }
} catch (err) {
    console.error('fetchAccountDetails: Error fetching Account Details:', err);
    return{
        account_id: null,
        qs_management_region: null,
        s3_bucket: null
    }
}
};