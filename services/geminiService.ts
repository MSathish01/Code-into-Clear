
import { GoogleGenAI, Schema, Type, Chat } from "@google/genai";
import { AnalysisResult } from "../types";

// Define the expected schema for the JSON response
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    plainEnglishSummary: {
      type: Type.STRING,
      description: "A high-level, plain English summary of the code's purpose and logic, avoiding jargon."
    },
    mermaidCode: {
      type: Type.STRING,
      description: "Raw Mermaid.js graph code. Choose the diagram type (Graph, Sequence, Class) that best fits the code structure. Do NOT wrap in markdown blocks. Do NOT use comments."
    },
    juniorDevGuide: {
      type: Type.STRING,
      description: "Markdown content containing rewritten functions with docstrings and 'gotchas' for junior developers. Use blockquotes (>) for the 'Gotcha' section."
    }
  },
  required: ["plainEnglishSummary", "mermaidCode", "juniorDevGuide"]
};

export const analyzeCode = async (codeContext: string): Promise<AnalysisResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please contact the administrator.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `
    You are an expert Senior Staff Software Engineer and Technical Writer. 
    Your goal is to analyze codebase uploads and explain them to Junior Developers. 
    You prioritize clarity, visual flow, and educational value.
    
    You must generate a "Developer Onboarding Kit" based on the provided code.
    If the code contains multiple files (delimited by --- START OF FILE ---), treat it as a complete project/module.
    
    1. Plain English Logic: Summarize purpose, break down critical functions and module interactions.
    
    2. Visual Architecture: Generate a high-quality Mermaid.js diagram.
       * **Strategy:** Analyze the code structure (OO vs Functional vs Modular) to pick the best diagram type.
       * **CRITICAL SYNTAX RULES (To prevent rendering errors):**
         - **ALWAYS enclose node labels in square brackets with double quotes inside.** 
           - CORRECT: \`A["User Login"] --> B["Database"]\`
           - INCORRECT: \`A(User Login) --> B(Database)\`
         - **Node IDs must be simple alphanumeric** (e.g., \`Node1\`, \`AuthService\`, \`stepA\`). NO special chars in IDs.
         - **NEVER use these special shapes - they cause errors:**
           - WRONG: \`A[/"text"/]\` or \`B[("text")]\` or \`C{{"text"}}\`
           - CORRECT: \`A["text"]\` - use simple square brackets only
         - **NEVER use parentheses () inside ANY text** - not in labels, not in subgraph names.
           - WRONG: \`subgraph Data Generation (Optional)\`
           - CORRECT: \`subgraph DataGeneration\` or \`subgraph Data_Generation_Optional\`
         - **Subgraph names must be simple** - alphanumeric with underscores only, NO spaces or special chars.
           - WRONG: \`subgraph Input Data Sources\`
           - CORRECT: \`subgraph InputDataSources\`
         - **Do NOT chain too many nodes with &** - max 3 nodes per & chain.
           - WRONG: \`A & B & C & D & E --> F\`
           - CORRECT: Split into multiple lines
         - **Do NOT** wrap output in \`\`\`mermaid\`\`\` markdown blocks. Return ONLY raw mermaid code.
         - **Do NOT** use %% comments.
         - **PREFER simpler diagrams** - max 15-20 nodes for readability.
         - **PREFER Top-Down (TD) orientation.**
       * **Diagram Types:**
         - \`graph TD\` (Flowchart): Best for general logic. Use \`subgraph\` to group.
         - \`classDiagram\`: Best for TypeScript/Python classes.
         - \`sequenceDiagram\`: Best for API call flows.
    
    3. Junior Dev Guide: 
       - Rewrite 2 complex functions with detailed JSDoc/Docstrings.
       - Identify 1 "gotcha" or potential bug. **Use a Markdown blockquote (> ) for the "Gotcha" section so it stands out.**
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'user', parts: [{ text: `Here is the code to analyze:\n\n${codeContext}` }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2, 
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response received from Gemini.");
    }

    try {
        const jsonResponse = JSON.parse(text) as AnalysisResult;
        return jsonResponse;
    } catch (parseError) {
        console.error("JSON Parse Error", text);
        throw new Error("Failed to parse Gemini response.");
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Creates a chat session context-aware of the code.
 * Optimized for faster response times with smart context compression.
 */
export const createChatSession = async (codeContext: string): Promise<Chat> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });
  
  // Smart context compression for better performance
  // Prioritize keeping structure over raw code for large contexts
  let context = codeContext;
  if (codeContext.length > 100000) {
    // For very large codebases, compress by removing excessive whitespace and comments
    context = codeContext
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/^\s*[\r\n]/gm, '') // Remove empty lines
      .replace(/[ \t]+/g, ' ') // Collapse whitespace
      .substring(0, 200000);
    if (codeContext.length > 200000) {
      context += "\n...(truncated for performance)...";
    }
  }

  const chat = await ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
        systemInstruction: `You are CodeDoc Assistant, a fast and precise developer assistant.

CODE CONTEXT:
${context}

RULES:
1. Be concise - answer in 2-4 sentences when possible
2. Cite specific function/variable names from the code
3. For code fixes, provide minimal working snippets
4. Skip unnecessary pleasantries - get straight to the answer
5. Use bullet points for multi-part answers`,
        temperature: 0.3, // Lower temperature for faster, more focused responses
        maxOutputTokens: 1024, // Limit response length for speed
    }
  });
  
  return chat;
};

/**
 * Generates or edits an infographic using Gemini 2.5 Flash Image.
 * @param imageBase64 The source image (e.g., a screenshot of the diagram) in Base64
 * @param prompt User prompt to guide generation (e.g., "Add a retro filter")
 */
export const generateInfographic = async (imageBase64: string, prompt: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  // Clean the base64 string if it contains headers
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt || "Transform this technical architecture diagram into a beautiful, high-fidelity 3D infographic suitable for a presentation. Make it cleaner, modern, and easier to understand. Maintain the logical flow but improve the aesthetics significantly.",
          },
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64
            }
          }
        ]
      }
    });

    // Iterate through parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image generated by Gemini.");
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
};
