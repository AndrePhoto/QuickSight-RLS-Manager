import { generateClient } from "aws-amplify/data";
import { Schema } from "../../amplify/data/resource";

interface RegionManagerProps {
  region: string;
  addLog: (log: string, type?: string, errorCode?: number, errorName?: string) => void;
}

interface RegionManagerResult {
  status: number;
  message: string;
}


const client = generateClient<Schema>();

export const regionDelete = async ({
  region,
  addLog,
}: RegionManagerProps): Promise<RegionManagerResult> => {

  try{
    addLog("===================================================================")
    addLog("Starting Region Deletion: " + region)

    const resDeleteFromTool = await client.models.ManagedRegion.delete({
      regionName: region
    })

    if( resDeleteFromTool?.errors ){
      addLog("Error deleting ManagedRegion. Skipping.", "ERROR", 500, "GraphQL-DeleteError")
      return {
        status: 500,
        message: "Error deleting ManagedRegion. Skipping."
      }
    }

    // Delete S3 Bucket -- TODO
    addLog("-----")

    // Delete Glue DB -- TODO
    addLog("-----")

    // Delete QuickSight DataSource -- TODO
    addLog("-----")


    return {
      status: 200,
      message: "Region Deletion Completed"
    }

  }catch(err){
    return {
      status: 500,
      message: "Region Deletion Failed"
    }
  }
}
