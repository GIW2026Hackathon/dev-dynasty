// Your custom Teachable Machine Model Link
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/ulGOVg1kg/";

export async function verifyFarmImage(file: File): Promise<{ isValid: boolean; reason: string }> {
  try {
    // 1. Load your custom AI model
    // @ts-ignore
    const modelURL = MODEL_URL + "model.json";
    const metadataURL = MODEL_URL + "metadata.json";
    
    // @ts-ignore
    const model = await window.tmImage.load(modelURL, metadataURL);

    // 2. Create an image element to feed to the AI
    const image = document.createElement("img");
    image.src = URL.createObjectURL(file);
    
    // Wait for the image to load into memory
    await new Promise((resolve) => {
      image.onload = resolve;
    });

    // 3. Ask the AI to predict what is in the image
    // @ts-ignore
    const predictions = await model.predict(image);
    
    let highestProb = 0;
    let bestMatch = "";

    // Loop through the predictions to find the highest confidence
    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i].probability > highestProb) {
        highestProb = predictions[i].probability;
        bestMatch = predictions[i].className;
      }
    }

    console.log("AI Prediction:", bestMatch, "Confidence:", highestProb);

    // 4. If the AI is more than 50% sure it's NOT produce, block it
    if (bestMatch === "Not Produce" && highestProb > 0.5) {
      return {
        isValid: false,
        reason: "AI Flagged: This image does not appear to be farming produce. Please upload a photo of crops or livestock."
      };
    }

    // Otherwise, allow it
    return {
      isValid: true,
      reason: "AI Verified: Accepted as agricultural produce."
    };

  } catch (error) {
    console.error("Teachable Machine Error:", error);
    return { isValid: true, reason: "AI check skipped due to loading error." };
  }
}