
import { GoogleGenAI } from "@google/genai";
import { StockLog } from "../types";

export const analyzeStockLog = async (log: StockLog): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze this daily stock log and provide a concise summary (max 100 words).
    Highlight any anomalies or key trends in the Dori, Warpin, Bheem, and Delivery sections.
    
    Log Data:
    Date: ${log.date}
    Author: ${log.author}
    Sections: ${JSON.stringify({
      Dori: log['Dori Detail'],
      Warpin: log['Warpin Detail'],
      Bheem: log['Bheem Detail'],
      Delivery: log['Delivery Detail']
    })}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No AI summary available.";
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "Failed to generate AI analysis.";
  }
};
