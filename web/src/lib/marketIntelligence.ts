import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

export async function getMarketRecommendation(category: string, userRole: "farmer" | "buyer"): Promise<string> {
  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) return "AI Error: API key is missing.";

    // 1. Fetch real data from Firestore for this category
    const q = query(
      collection(db, "listings"), 
      where("status", "==", "active"),
      where("category", "==", category)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return `There are currently no active listings for ${category} in the market. You have the first-mover advantage!`;
    }

    // 2. Summarize the data so we don't send thousands of words to the AI
    const marketData = snapshot.docs.map(doc => {
      const data = doc.data();
      return `${data.title}: KSh ${data.pricePerUnit} per ${data.unit} (${data.quantity} ${data.unit} available in ${data.ward})`;
    }).join("\n");

    // 3. Ask the AI to analyze the data
    const systemPrompt = userRole === "farmer"
      ? `You are an agricultural market analyst. Here is the current market data for ${category} in Kisii:\n${marketData}\n\nA farmer wants to list a new product. Based on this data, recommend a competitive price they should set to attract buyers, and explain why. Keep it under 3 sentences.`
      : `You are an agricultural market analyst. Here is the current market data for ${category} in Kisii:\n${marketData}\n\nA buyer is looking to purchase. Based on this data, tell them what the average price is, which farmer offers the best value, and if now is a good time to buy. Keep it under 3 sentences.`;

    // 4. Send to Groq AI
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: systemPrompt }],
        temperature: 0.4,
        max_tokens: 150
      })
    });

    if (!response.ok) throw new Error("AI API failed");
    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    console.error(error);
    return "Sorry, we couldn't analyze the market data right now.";
  }
}