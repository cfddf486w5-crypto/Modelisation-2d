import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.post("/api/analyze-warehouse", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Remove the data:image/png;base64, prefix if present
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          {
            text: "Analyze this rough sketch of a warehouse floor plan. I need to convert this sketch into a structured 2D map. Identify the main components like walls (outer boundary), racks (storage), eating areas (cafeteria/break room), and doors. Output the layout as a JSON object where coordinates and dimensions are percentages (0 to 100) relative to the whole floor plan area.",
          },
          {
            inlineData: {
              data: base64Data,
              mimeType: "image/png",
            },
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              width: { type: Type.NUMBER, description: "Total width of the warehouse map (can just be 100)" },
              height: { type: Type.NUMBER, description: "Total height of the warehouse map (can just be 100)" },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { 
                      type: Type.STRING, 
                      description: "The type of the object: 'rack', 'wall', 'door', 'eating_area', 'office', 'bathroom', 'other'" 
                    },
                    label: { type: Type.STRING, description: "A user friendly label for the item" },
                    x: { type: Type.NUMBER, description: "X coordinate of the top-left corner (0-100)" },
                    y: { type: Type.NUMBER, description: "Y coordinate of the top-left corner (0-100)" },
                    width: { type: Type.NUMBER, description: "Width of the item (0-100)" },
                    height: { type: Type.NUMBER, description: "Height of the item (0-100)" },
                    color: { type: Type.STRING, description: "A suggested hex color for rendering this item" }
                  },
                  required: ["id", "type", "label", "x", "y", "width", "height"]
                }
              }
            },
            required: ["width", "height", "items"]
          }
        },
      });

      const jsonStr = response.text?.trim() || "{}";
      const layout = JSON.parse(jsonStr);

      res.json(layout);
    } catch (error: any) {
      console.error("Error analyzing image:", error);
      res.status(500).json({ error: error.message || "Failed to analyze image" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
