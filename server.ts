import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

let defaultGeminiClient: GoogleGenAI | null = null;

function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const trimmedKey = customApiKey && customApiKey.trim();
  if (trimmedKey) {
    return new GoogleGenAI({
      apiKey: trimmedKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  if (!defaultGeminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }
    defaultGeminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return defaultGeminiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support large base64 uploads for images and documents
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      app: "BarExpress API", 
      aiReady: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString() 
    });
  });

  // AI API Diagnostics & Connection Test Endpoint
  app.post("/api/chat/test-api", async (req, res) => {
    try {
      const { customApiKey } = req.body;
      const startTime = Date.now();
      const ai = getGeminiClient(customApiKey);

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: "Dis brièvement 'Connexion IA active et opérationnelle pour BarExpress !' en une seule phrase.",
      });

      const latencyMs = Date.now() - startTime;
      res.json({
        success: true,
        model: "gemini-3.7-flash",
        latencyMs,
        reply: response.text?.trim() || "Connexion IA établie.",
        isCustomKey: Boolean(customApiKey && customApiKey.trim()),
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("[Test API Error]", err);
      res.status(400).json({
        success: false,
        error: err.message || "Erreur de validation de la clé API ou échec de connexion.",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Dona AI Multi-turn Chat Endpoint with Google Search Grounding & Multimodal Support
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, context, enableSearch = true, customApiKey, customInstructions } = req.body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Liste de messages invalide." });
      }

      let ai: GoogleGenAI;
      try {
        ai = getGeminiClient(customApiKey || context?.customGeminiApiKey);
      } catch (err: any) {
        return res.status(503).json({
          error: "Clé API Gemini non configurée. Veuillez configurer la clé API dans les paramètres Direction ou dans les Secrets.",
          reply: "⚠️ Je n'ai pas pu joindre le service Gemini car aucune clé API valide n'a été détectée. Veuillez configurer la clé API dans Direction > Paramètres IA ou dans les secrets de l'application."
        });
      }

      // Format bar context for Dona
      let contextPrompt = "";
      if (context) {
        contextPrompt = `
[CONTEXTE ÉTABLISSEMENT ACTUEL]
Nom du Bar: ${context.barName || 'BarExpress'}
Devise: ${context.currency || 'HTG'}
Utilisateur connecté: ${context.cashierName || 'Équipe'}
Date/Heure actuelle: ${new Date().toLocaleString('fr-FR')}

Statistiques & Métriques:
- Chiffre d'affaires du jour: ${context.todayRevenue ? context.todayRevenue + ' ' + context.currency : 'Non spécifié'}
- Ventes enregistrées: ${context.totalSalesCount || 0}
- Nombre de produits en catalogue: ${context.totalProducts || 0}
- Alertes rupture / stock faible: ${context.lowStockCount || 0} article(s)

Produits en stock faible / critique:
${Array.isArray(context.lowStockItems) && context.lowStockItems.length > 0
  ? context.lowStockItems.map((item: any) => `- ${item.name}: Stock restant = ${item.stock} (Seuil alerte: ${item.minStockAlert})`).join('\n')
  : 'Aucune rupture critique détectée pour le moment.'}

Top Ventes récentes:
${Array.isArray(context.topProducts) && context.topProducts.length > 0
  ? context.topProducts.map((p: any) => `- ${p.name}: ${p.soldQuantity} vendus (CA: ${p.revenue} ${context.currency})`).join('\n')
  : 'Données de ventes en cours de constitution.'}
`;
      }

      const specificBarInstructions = customInstructions || context?.donaCustomInstructions;

      const systemInstruction = `Tu es Dona, une assistante IA ultra-intelligente, chaleureuse, polyvalente et experte intégrée au logiciel de gestion BarExpress.

TES CAPACITÉS & RÈGLES :
1. POLYVALENCE TOTALE : Tu es capable de répondre avec brio à TOUT TYPE DE CONVERSATION. Que l'utilisateur te parle de culture générale, de science, de philosophie, d'histoire, de programmation, de blagues, de recettes de cuisine, de musique, de conseils de vie ou de son humeur du jour, réponds avec passion, clarté et naturel, même si cela n'a aucun lien avec le bar !
2. EXPERTE EN GESTION DE BAR & RESTAURATION : Lorsque l'utilisateur te pose des questions sur son établissement, son stock, ses ventes, ses marges ou son équipe, exploite les données du [CONTEXTE ÉTABLISSEMENT ACTUEL] fourni ci-dessous pour donner des analyses précises, des calculs financiers exacts, des alertes de réapprovisionnement et des conseils stratégiques sur-mesure (ex: calcul du coût de revient, suggestion de prix, recettes de cocktails tendances, promotions pour les heures creuses).
3. MULTIMODALITÉ : Tu as la capacité d'analyser des photos, reçus, étiquettes de bouteilles, factures, cartes de menu, documents PDF ou fichiers texte fournis par l'utilisateur.
4. RECHERCHE GOOGLE EN TEMPS RÉEL : Si une question nécessite des informations récentes ou externes (recettes de cocktails modernes, météo, actualités, prix du marché, tendances des boissons), utilise la recherche web intégrée pour fournir une information exacte et à jour.
5. STYLE : Soigne la mise en page avec du Markdown élégant (listes à puces, gras pour les chiffres clés, tableaux récapitulatifs lorsque c'est pertinent). Reste bienveillante, dynamique, concise et percutante.

${specificBarInstructions ? `[DIRECTIVES SPÉCIFIQUES DE LA DIRECTION DU BAR] :\n${specificBarInstructions}\n` : ''}
${contextPrompt}`;

      // Convert conversation messages to Gemini format
      const formattedContents = messages.map((msg: any) => {
        const parts: any[] = [];

        // Add attachments if any (images, documents)
        if (Array.isArray(msg.attachments)) {
          for (const att of msg.attachments) {
            if (att.base64 && att.mimeType) {
              parts.push({
                inlineData: {
                  mimeType: att.mimeType,
                  data: att.base64.replace(/^data:[^;]+;base64,/, "")
                }
              });
            }
          }
        }

        // Add text prompt
        if (msg.content) {
          parts.push({ text: msg.content });
        } else if (parts.length === 0) {
          parts.push({ text: "Bonjour Dona" });
        }

        return {
          role: msg.role === "user" ? "user" : "model",
          parts
        };
      });

      const tools: any[] = [];
      if (enableSearch) {
        tools.push({ googleSearch: {} });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
          tools: tools.length > 0 ? tools : undefined,
        }
      });

      const replyText = response.text || "Désolé, je n'ai pas pu générer de réponse.";
      
      // Extract Google Search Grounding sources if available
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const webSources: Array<{ title: string; uri: string }> = [];
      if (Array.isArray(groundingChunks)) {
        for (const chunk of groundingChunks) {
          if (chunk.web && chunk.web.uri) {
            webSources.push({
              title: chunk.web.title || chunk.web.uri,
              uri: chunk.web.uri
            });
          }
        }
      }

      res.json({
        reply: replyText,
        sources: webSources,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("[Dona Chat Error]", err);
      res.status(500).json({
        error: err.message || "Erreur lors de la génération avec Dona",
        reply: `Une erreur est survenue lors de la communication avec Dona : ${err.message || 'Erreur inconnue'}`
      });
    }
  });

  // Audio Transcription Endpoint using gemini-3.5-flash
  app.post("/api/chat/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType = "audio/webm", customApiKey } = req.body;

      if (!audioBase64) {
        return res.status(400).json({ error: "Données audio manquantes." });
      }

      const ai = getGeminiClient(customApiKey);
      const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "");

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64
              }
            },
            {
              text: "Transcris mot pour mot et avec exactitude cet enregistrement vocal en français (ou dans la langue parlée comme le créole ou l'anglais). Ne fournis QUE la transcription exacte du texte prononcé, sans aucun commentaire, sans guillemets et sans explications d'introduction."
            }
          ]
        }
      });

      const transcribedText = response.text?.trim() || "";
      res.json({ text: transcribedText });
    } catch (err: any) {
      console.error("[Transcription Error]", err);
      res.status(500).json({ error: err.message || "Erreur de transcription vocale" });
    }
  });

  // Text-to-Speech Endpoint using gemini-3.1-flash-tts-preview
  app.post("/api/chat/tts", async (req, res) => {
    try {
      const { text, voiceName = "Kore", customApiKey } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Texte requis pour la synthèse vocale." });
      }

      const ai = getGeminiClient(customApiKey);
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: text.slice(0, 500) }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName }
            }
          }
        }
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioBase64) {
        res.json({ audioBase64 });
      } else {
        res.status(500).json({ error: "Pas d'audio généré." });
      }
    } catch (err: any) {
      console.error("[TTS Error]", err);
      res.status(500).json({ error: err.message || "Erreur de synthèse vocale" });
    }
  });

  // Offline Sales Synchronization Endpoint
  // Receives batch of sales generated while offline and confirms reconciliation
  const syncedServerSalesStore: any[] = [];

  app.post("/api/sync-sales", (req, res) => {
    try {
      const { sales, deviceId } = req.body;
      if (!Array.isArray(sales)) {
        return res.status(400).json({ error: "Tableau de ventes invalide" });
      }

      const syncedIds: string[] = [];
      const now = new Date().toISOString();

      for (const sale of sales) {
        if (sale && sale.id) {
          const syncedRecord = {
            ...sale,
            syncedAt: now,
            deviceId: deviceId || "pos-terminal-1",
            status: sale.status || "completed"
          };
          
          // Check if already synced to avoid duplication
          const existingIdx = syncedServerSalesStore.findIndex(s => s.id === sale.id);
          if (existingIdx >= 0) {
            syncedServerSalesStore[existingIdx] = syncedRecord;
          } else {
            syncedServerSalesStore.push(syncedRecord);
          }
          syncedIds.push(sale.id);
        }
      }

      console.log(`[Sync] Synchronisé ${syncedIds.length} vente(s) hors-ligne au serveur à ${now}`);

      res.json({
        success: true,
        syncedCount: syncedIds.length,
        syncedIds,
        syncedAt: now,
        message: `${syncedIds.length} vente(s) synchronisée(s) avec le serveur principal.`
      });
    } catch (err) {
      console.error("[Sync Error]", err);
      res.status(500).json({ error: "Erreur serveur lors de la synchronisation" });
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
    console.log(`Serveur BarExpress démarré sur http://0.0.0.0:${PORT}`);
  });
}

startServer();

