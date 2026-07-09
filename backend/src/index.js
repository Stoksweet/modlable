"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modlableChatFlow = void 0;
const google_genai_1 = require("@genkit-ai/google-genai");
const beta_1 = require("genkit/beta");
// Initialize Genkit with the Google AI plugin
const ai = (0, beta_1.genkit)({
    plugins: [(0, google_genai_1.googleAI)()],
    model: google_genai_1.googleAI.model('gemini-2.5-flash', {
        temperature: 0.8,
    }),
});
const session = ai.createSession({
    initialState: {
        userName: 'Pavel',
    },
});
// Define a recipe generator flow
exports.modlableChatFlow = ai.defineFlow({
    name: 'modlableChatFlow',
    inputSchema: beta_1.z.object({
        query: beta_1.z.string().describe('The users chat query message'),
        pdfURLs: beta_1.z.array(beta_1.z.string()).optional(),
    }).describe('The input chat query message'),
    outputSchema: beta_1.z.object({
        response: beta_1.z.string().describe('The agents output response')
    }).describe('The output response'),
}, async (input) => {
    // Create a prompt based on the input
    const prompt = ` You are a AI model development assistant called Modlabot for a ML NPM JS model building tool specialising in TensorflowJS and Transformers technology.
      Your role is to take in a user query message and assist them by responging with usefull code samples, table based 
      visualizations in and other usefull infomation in markdown form.
      
      Here is the users query: ${input.query}

      Provide the output in markdown text string only. Do not include newline char.
    `;
    // Chat handling
    const chat = session.chat({
        model: google_genai_1.googleAI.model('gemini-2.5-flash'),
        system: prompt,
        // prompt,
        config: {
            temperature: 1.3,
        },
    });
    await chat.send(input.query);
    const llmResponse = await chat.send(input.query);
    // Handle the response from the model API. In this sample, we just convert
    // it to a string, but more complicated flows might coerce the response into
    // structured output or chain the response into another LLM call, etc.
    return { response: llmResponse.text };
});
// Run the flow test
async function main() {
    const recipe = await (0, exports.modlableChatFlow)({
        query: 'Hello, who are you?',
    });
    console.log(recipe);
}
main().catch(console.error);
//# sourceMappingURL=index.js.map