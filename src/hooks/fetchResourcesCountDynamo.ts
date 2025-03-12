import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

type Counters = {
  namespacesCount: number | null;
  groupsCount: number | null;
  usersCount: number | null;
  datasetsCount: number | null;
};


export const fetchResourcesCountDynamo = async () : Promise<Counters | undefined> => {
  try {
    let namespacesCount = 0
    let groupsCount = 0
    let usersCount = 0
    let datasetsCount = 0
    /**
     * Fetch Namespaces Count
     */
    const resultNamespaces = await client.models.Namespace.list();

    if( resultNamespaces.data.length > 0 ){
      namespacesCount = resultNamespaces.data.length
    }

    /**
     * Fetch Groups Count
     */
    const resultGroups = await client.models.UserGroup.list({
      filter: {
        userGroup: {
          eq: "Group"
        }
      }
    });

    if( resultGroups.data.length > 0 ){
      groupsCount = resultGroups.data.length
    }

    /**
     * Fetch Users Count
     */
    const resultUsers = await client.models.UserGroup.list({
      filter: {
        userGroup: {
          eq: "User"
        }
      }
    });

    if( resultUsers.data.length > 0 ){
      usersCount = resultUsers.data.length
    }

    /**
     * Fetch Datasets Count
     */
    const resultDatasets = await client.models.DataSet.list();

    if( resultDatasets.data.length > 0 ){
      datasetsCount = resultDatasets.data.length
    }

    return{
      namespacesCount: namespacesCount,
      groupsCount: groupsCount,
      usersCount: usersCount,
      datasetsCount: datasetsCount
    }

  } catch (err) {

    console.error('Fetch Resources Count (for Dyanamo) error: ', err);
    return{
      namespacesCount: null,
      groupsCount: null,
      usersCount: null,
      datasetsCount: null
    }
  }
};