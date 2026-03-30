
import { GoogleGenAI, Type } from "@google/genai";
import { Sale, Product } from "../types";

export const getBusinessInsights = async (sales: Sale[], products: Product[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const salesSummary = sales.map(s => ({
    total: s.totalAmount,
    items: s.items.length,
    payment: s.paymentMethod
  }));

  const stockAlerts = products.filter(p => p.stockQty <= p.alertThreshold).map(p => p.name);

  const prompt = `
    Agis en tant qu'expert en gestion de commerce de détail en Afrique de l'Ouest.
    Voici les données de vente récentes : ${JSON.stringify(salesSummary.slice(-10))}
    Produits en rupture de stock : ${stockAlerts.join(', ')}
    
    Analyse brièvement ces données et donne 3 conseils stratégiques au commerçant pour augmenter son chiffre d'affaires ou optimiser son stock aujourd'hui.
    Réponds en français, avec un ton professionnel et encourageant.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Impossible de générer des conseils pour le moment. Vérifiez votre connexion.";
  }
};

export const searchProductImages = async (productName: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Recherche 6 URLs directes d'images professionnelles pour le produit : "${productName}". 
      IMPORTANT: Privilégie les images provenant de sources libres de droits comme Unsplash, Pexels, Pixabay ou Wikimedia Commons car elles autorisent le téléchargement direct (CORS).
      L'objectif est d'utiliser ces images pour un catalogue de vente.
      Retourne uniquement un tableau JSON contenant les URLs des images (format: ["url1", "url2", ...]).`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
    });
    
    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (error) {
    console.error("Image search error:", error);
    return [];
  }
};

export const beautifyProductImage = async (base64Image: string, productName: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let mimeType = 'image/jpeg';
  let imageData = base64Image;

  if (base64Image.startsWith('data:')) {
    const parts = base64Image.split(';base64,');
    if (parts.length === 2) {
      mimeType = parts[0].split(':')[1];
      imageData = parts[1].replace(/\s/g, ''); 
    }
  } else {
    imageData = base64Image.replace(/\s/g, '');
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageData,
              mimeType: mimeType,
            },
          },
          {
            text: `This is a photo of a product called "${productName}". Please beautify this image for a professional e-commerce store. 
            Instructions:
            1. Enhance the lighting to make it look like a professional studio shot.
            2. Clean the background to be minimalist and professional (solid light grey or white).
            3. Make the colors vibrant and the product look premium.
            4. The product itself must remain unchanged and clearly recognizable as "${productName}".
            Generate only the improved image as a result.`
          }
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    if (!response.candidates?.[0]?.content?.parts) {
      throw new Error("Réponse de l'IA vide ou bloquée.");
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("Aucune image générée par l'IA.");
  } catch (error) {
    console.error("Gemini Image Error Details:", error);
    throw error;
  }
};
