export async function askMkulimaAI(question: string): Promise<string> {
  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    
    if (!apiKey) {
      return "AI Error: API key is missing. Please check your .env file.";
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content: "You are an expert agricultural extension officer in Kenya. Answer farming questions covering crops, livestock, pests, soil, weather, and post-harvest handling. Keep your answers practical, clear, and under 4 sentences."
            },
            {
              role: "user",
              content: question
            }
          ],
          temperature: 0.5,
          max_tokens: 150
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Groq API Error Details:", errorData);
      return `AI Error: ${errorData.error?.message || "Failed to get a response."}`;
    }

    const data = await response.json();
    return data.choices[0].message.content;
    
  } catch (error: any) {
    console.error("Network/Catch Error:", error);
    return "Sorry, we couldn't reach the AI right now. Please check your internet connection.";
  }
}