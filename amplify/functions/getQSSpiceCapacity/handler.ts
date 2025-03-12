import { 
  CloudWatch, 
  GetMetricDataCommand, 
  GetMetricDataCommandInput,
  StandardUnit 
} from '@aws-sdk/client-cloudwatch';
import type { Schema } from "../../data/resource";
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/getQSSpiceCapacity';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);


interface MetricResponse {
  Timestamps: Date[];
  Values: number[];
}

export const handler: Schema["getQSSpiceCapacity"]["functionHandler"] = async ( event ) => {

  // Check Environment Variables
  const accountId = env.ACCOUNT_ID || null

  // If Environment Variables have failed to load, or in the QuickSight Management Region is missing, then throw an Error
  if( ! accountId  ){
    throw new Error("Missing environment variables")
  }

  // Check arguments:
  // qsRegion
  try{
    const cloudwatchClient = new CloudWatch({ region: event.arguments.region });
    
    const endtime = new Date();
    const starttime = new Date(endtime.getTime() - (1000 * 24 * 60 * 60 * 1000)); // 10 days

    const inputLimit = { // GetMetricDataInput
      MetricDataQueries: [ // MetricDataQueries // required
        { // MetricDataQuery
          Id: "cloudwatch", // required
          MetricStat: { // MetricStat
            Metric: { // Metric
              Namespace: 'AWS/QuickSight',
              MetricName: "SPICECapacityLimitInMB",
            },
            Period: 3600,
            Stat: 'Maximum',
            Unit: StandardUnit.Megabytes,
          },
          Label: "cloudwatch",
          ReturnData: true,
          AccountId: accountId,
        },
      ],
      StartTime: starttime, // required
      EndTime: endtime, // required
    };

    const getLimit = new GetMetricDataCommand( inputLimit );
    const response_limit = await cloudwatchClient.send(getLimit);

    if( response_limit.MetricDataResults === undefined || response_limit.MetricDataResults.length === 0
    || response_limit.MetricDataResults[0].StatusCode !== "Complete"|| response_limit.MetricDataResults[0].Values === undefined
    || response_limit.MetricDataResults[0].Values.length === 0 ){
      throw new Error("Error processing response.")
    }
    
    let qsLimitInMB = response_limit.MetricDataResults?.[0]?.Values?.[0]


    const inputUser = { // GetMetricDataInput
      MetricDataQueries: [ // MetricDataQueries // required
        { // MetricDataQuery
          Id: "cloudwatch", // required
          MetricStat: { // MetricStat
            Metric: { // Metric
              Namespace: 'AWS/QuickSight',
              MetricName: "SPICECapacityConsumedInMB",
            },
            Period: 3600,
            Stat: 'Maximum',
            Unit: StandardUnit.Megabytes,
          },
          Label: "cloudwatch",
          ReturnData: true,
          AccountId: accountId,
        },
      ],
      StartTime: starttime, // required
      EndTime: endtime, // required
    };

    const getUsed = new GetMetricDataCommand( inputUser );
    const response_used = await cloudwatchClient.send(getUsed);

    if( response_used.MetricDataResults === undefined || response_used.MetricDataResults.length === 0
    || response_used.MetricDataResults[0].StatusCode !== "Complete"|| response_used.MetricDataResults[0].Values === undefined
    || response_used.MetricDataResults[0].Values.length === 0 ){
      throw new Error("Error processing response.")
    }
    
    let qsUsedInMB = response_used.MetricDataResults?.[0]?.Values?.[0]

    return {
      statusCode: 200,
      message: "QuickSight SPICE Capacity successfully retrieved.",
      availableCapacityInGB: Number((qsLimitInMB / 1024).toFixed(2)),
      usedCapacityInGB: Number((qsUsedInMB / 1024).toFixed(2)),
    }

  }catch(err){
    return {
      statusCode: 500,
      message: "Error fetching QuickSight SPICE Capacity.",
      availableCapacityInGB: 0,
      usedCapacityInGB: 0,
      errorName: "QSSPICE"
    }
  }
};
