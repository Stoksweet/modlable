import { googleAI } from '@genkit-ai/google-genai';
import { genkit, z } from 'genkit/beta';

// Initialize Genkit with the Google AI plugin
const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash', {
    temperature: 0.8,
  }),
});

// Persistant chat settings
interface MyState {
  userName: string;
}

const session = ai.createSession<MyState>({
  initialState: {
    userName: 'Pavel',
  },
});

// Define a recipe generator flow
export const modlableChatFlow = ai.defineFlow(
  {
    name: 'modlableChatFlow',
    inputSchema: z.object({
      query: z.string().describe('The users chat query message'),
      pdfURLs: z.array(z.string()).optional(),
    }).describe('The input chat query message'),
    outputSchema: z.object({
      response: z.string().describe('The agents output response')
    }).describe('The output response'),
  },
  async (input) => {
    // Create a prompt based on the input
    const prompt = ` You are a AI model development assistant called Modlabot for a ML NPM JS model building tool specialising in TensorflowJS and Transformers technology.
      Your role is to take in a user query message and assist them by responging with usefull code samples, table based 
      visualizations in and other usefull infomation in markdown form.
      
      Here is the users query: ${input.query}

      Provide the output in markdown text string only. Do not include newline char.
    `;

    // Chat handling
    const chat = session.chat({
      model: googleAI.model('gemini-2.5-flash'),
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
  },
);

// Run the flow test
async function main() {
  const recipe = await modlableChatFlow({
    query: 'Hello, who are you?',
  });

  console.log(recipe);
}

main().catch(console.error);