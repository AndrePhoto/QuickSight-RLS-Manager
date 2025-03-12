import { generateClient } from "aws-amplify/data";
import { Schema } from "../../amplify/data/resource";

interface IngestionManagerProps {
  region: string;
  dataSetArn: string;
  ingestionId: string;
  addLog: (log: string, type?: string, errorCode?: number, errorName?: string) => void;
}

interface FunctionManagerResult {
  status: number;
  message: string;
  errorType? : string
}

const client = generateClient<Schema>();

export const qsDataSetIngestionCheck = async({
  region,
  dataSetArn,
  ingestionId,
  addLog
}: IngestionManagerProps): Promise<FunctionManagerResult> => {

  let ingestionStatus = "RUNNING"

  try{
    do{
      addLog("Waiting 5 seconds...")
      await new Promise(resolve => setTimeout(resolve, 5000));
  
      const quickSightIngestionResponse = await client.queries.publishRLS99QsCheckIngestion({
        datasetRegion: region,
        dataSetId: dataSetArn,
        ingestionId: ingestionId
      })

      if(quickSightIngestionResponse.data?.statusCode == 200){
        addLog("RLS DataSet Ingestion Completed.")
        ingestionStatus = "COMPLETED"
      }else if(quickSightIngestionResponse.data?.statusCode == 201){
        addLog("RLS DataSet Ingestion still running...")
        ingestionStatus = "RUNNING"
      }else{
        if(quickSightIngestionResponse.data?.statusCode && quickSightIngestionResponse.data?.message && quickSightIngestionResponse.data?.errorType){
          return{
            status: quickSightIngestionResponse.data.statusCode,
            message: quickSightIngestionResponse.data.message,
            errorType: quickSightIngestionResponse.data.errorType
          }
        }else if(quickSightIngestionResponse.errors){
          for(const error of quickSightIngestionResponse.errors) {
            addLog(error.errorInfo + " - " + error.message, "ERROR", 500, error.errorType)
          }
          throw new Error(quickSightIngestionResponse.errors[0].message);
        }else{
          throw new Error("Unknown error in DataSet ingestion. Please check the logs for more details.");
        }
      }

    }while(ingestionStatus != "COMPLETED")

    return {
      status: 200,
      message: "DataSet Ingestion Completed"
    }

  }catch(e){
    const error = e as Error
    return {
      status: 500,
      errorType: "UnknownError",
      message: error.message,
    };
  }
}