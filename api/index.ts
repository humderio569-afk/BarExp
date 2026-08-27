import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json());

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "BarExpress API (Serverless)", timestamp: new Date().toISOString() });
});

// Offline Sales Synchronization Endpoint
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
          deviceId: deviceId || 'pos-terminal-1',
          status: sale.status || 'completed'
        };
        
        const existingIdx = syncedServerSalesStore.findIndex(s => s.id === sale.id);
        if (existingIdx >= 0) {
          syncedServerSalesStore[existingIdx] = syncedRecord;
        } else {
          syncedServerSalesStore.push(syncedRecord);
        }
        syncedIds.push(sale.id);
      }
    }

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

// AI Insights Endpoint
app.post("/api/ai-insights", async (req, res) => {
  try {
    const { prompt, history, barContext, apiKey: customApiKey } = req.body;
    const apiKey = (customApiKey && typeof customApiKey === 'string' && customApiKey.trim().length > 0) 
      ? customApiKey.trim() 
      : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(200).json({
        reply: `### 🔐 Mode Consultation Locale (${barContext?.barName || 'Bar'})\n\n` +
               `**État actuel :**\n` +
               `- Alerte Stock : ${barContext?.products?.filter((p: any) => p.stock <= p.minStockAlert).length || 0} produits à commander.\n` +
               `- CA Jour : ${barContext?.totalSales?.toLocaleString() || 0} ${barContext?.currency || 'G'}.\n\n` +
               `> *Note : Connectez une clé Gemini API dans les paramètres pour des analyses prédictives et stratégiques complètes.*`
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const barDataSummary = `[PROTOCOLE DE CONTEXTE TEMPS RÉEL - ${barContext?.barName}]
Devise : ${barContext?.currency || 'G'}
Catalogue & Stocks : ${JSON.stringify(barContext?.products || [])}
Ventes Globales : ${barContext?.totalSales || 0} ${barContext?.currency || 'G'} (${barContext?.salesCount || 0} reçus)
Dépenses & Achats : ${JSON.stringify(barContext?.expenses || [])}
Journal d'Audit (Audit Logs) : ${JSON.stringify(barContext?.auditLogs || [])}
Tables Actives : ${JSON.stringify(barContext?.activeTabs || [])}`;

    const chatHistory = [];
    
    chatHistory.push({
      role: 'user',
      parts: [{ text: `Voici l'état actuel de l'établissement :\n${barDataSummary}` }]
    });

    chatHistory.push({
      role: 'model',
      parts: [{ text: `Analyse du contexte terminée. Je suis prêt à délivrer des insights stratégiques pour ${barContext?.barName}. Comment puis-je vous aider aujourd'hui ?` }]
    });

    if (Array.isArray(history)) {
      for (const msg of history) {
        chatHistory.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        });
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [...chatHistory, { role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: `Vous êtes le Consultant Stratégique et Directeur d'Exploitation IA de l'établissement "${barContext?.barName || 'Bar'}".
Votre expertise s'appuie sur la science des données, la psychologie de consommation et la gestion rigoureuse de la restauration (F&B Management).

VOTRE PERSONA :
- Professionnel, concis, rigoureux, et pragmatique.
- Vous utilisez des terminologies de gestion (COGS, Yield, Prime Cost, Dead Stock, Turnover Rate).
- Vous n'hésitez pas à être critique si les chiffres montrent des anomalies ou des baisses de rentabilité.

VOTRE MISSION :
1. ANALYSE DE RENTABILITÉ : Calculez les marges ($ \\text{Marge} $) et suggérez des optimisations de prix.
2. AUDIT DE SÉCURITÉ : Analysez les 'Audit Logs' pour détecter des comportements suspects ou des erreurs de procédure.
3. GESTION DES STOCKS : Priorisez les commandes et proposez des solutions pour liquider les invendus (Upselling, Happy Hour, Cocktails spéciaux).
4. CONSEILS OPÉRATIONNELS : Proposez des objectifs de vente pour les serveurs et des briefings de shift.

DIRECTIVES TECHNIQUES :
- Présentez vos analyses sous forme de tableaux Markdown élégants.
- Utilisez la notation KaTeX ($...$ ou $$...$$) pour toute démonstration mathématique.
- Si vous détectez des stocks bas, listez-les systématiquement avec une recommandation d'action.
- Répondez en Français de manière professionnelle.`
      }
    });

    const responseText = response.text || "Désolé, je n'ai pas pu générer une réponse d'analyse.";
    res.json({ reply: responseText });
  } catch (err: any) {
    console.error("AI Insights Error:", err);
    const errMsg = err.message || "";
    if (errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED")) {
      return res.status(200).json({ 
        reply: "⚠️ **Erreur de Permission (403)** : Votre clé API Gemini semble être restreinte ou invalide pour ce modèle. Veuillez vérifier vos paramètres Google AI Studio (clé API et facturation/limites)." 
      });
    }
    res.status(500).json({ error: "Erreur lors du traitement de la requête IA" });
  }
});

export default app;
