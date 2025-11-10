import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

const projectId: string | undefined = process.env.PROJECT_ID;
const region: string | undefined = process.env.REGION;
const accessToken: string = await getAccessToken();

console.log('Inputs from env: ', projectId, region);
console.log('Access token: ', accessToken);

// Create server instance
const server = new McpServer({
    name: "modlable",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

const METADATA_URL = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

export async function getAccessToken(): Promise<string> {
  const response = await fetch(METADATA_URL, {
    headers: { 'Metadata-Flavor': 'Google' }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get access token: ${response.status} ${text}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

// Tools to create
// - Create Training Job (Cloud Run) (Run API)
// - Convert TF to ONNX TransformersJS Job (Python Container)

// createCloudRunJob.ts
export interface CloudRunJobOptions {
    accessToken: string;
    projectId: string;
    region: string;
    jobName: string;
    imageUrl: string;
}
  
export interface CloudRunJobResponse {
    name: string;
    uid?: string;
    generation?: string;
    labels?: Record<string, string>;
    template?: any;
    [key: string]: any;
}
  
async function createCloudRunJob({
    accessToken,
    projectId,
    region,
    jobName,
    imageUrl
  }: CloudRunJobOptions): Promise<CloudRunJobResponse> {
    const url = `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs?jobId=${jobName}`;
  
    const body = {
      template: {
        template: {
          containers: [
            { image: imageUrl }
          ]
        }
      }
    };
  
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request failed: ${response.status} ${response.statusText}\n${errorText}`);
    }
  
    return response.json() as Promise<CloudRunJobResponse>;
}   

// Register weather tools
// server.tool(
//     "get_alerts",
//     "Get weather alerts for a state",
//     {
//         state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
//     },
//     async ({ state }) => {
//         const stateCode = state.toUpperCase();
//         const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
//         const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

//         if (!alertsData) {
//             return {
//                 content: [
//                     {
//                         type: "text",
//                         text: "Failed to retrieve alerts data",
//                     },
//                 ],
//             };
//         }

//         const features = alertsData.features || [];
//         if (features.length === 0) {
//             return {
//                 content: [
//                     {
//                         type: "text",
//                         text: `No active alerts for ${stateCode}`,
//                     },
//                 ],
//             };
//         }

//         const formattedAlerts = features.map(formatAlert);
//         const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n")}`;

//         return {
//             content: [
//                 {
//                     type: "text",
//                     text: alertsText,
//                 },
//             ],
//         };
//     },
// );

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Weather MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});