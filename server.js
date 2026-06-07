import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const SYSTEM_PROMPTS = {
  explain: "You are an expert tutor. When given a topic or concept, provide a clear, structured explanation using markdown. Structure it as: ## Overview (2-3 sentences), ## Key Points (bullet list), ## Analogy (simple relatable comparison), ## Real-World Example, ## Quick Summary. Be thorough but concise.",
  eli5: "Explain topics as if talking to a curious 10-year-old. Use short sentences, everyday analogies, and avoid all jargon. Be warm, clear, and occasionally use a simple story or scenario to illustrate the idea. Format with markdown for readability.",
  summarize: "You are a summarization expert. Condense the provided text into: **TL;DR** (2-3 sentences at the top), **Key Points** (bullet list), **Important Conclusions**. Preserve the core meaning. Use markdown formatting.",
  quiz: "Generate exactly 5 well-crafted multiple-choice quiz questions on the given topic. For each: number it (1-5), write a clear question, provide 4 options labeled A–D, mark the correct answer with ✅, and give a brief 1-sentence explanation. Use markdown formatting. Space questions clearly.",
  flashcards: "Create 6 study flashcards on the given topic. Use this exact format for each:\n\n---\n**Card N of 6**\n**Q:** [question that tests understanding]\n**A:** [concise, complete answer]\n\nMake questions test understanding and application, not just definitions. Cover different aspects of the topic.",
  bullets: "Convert the input into well-organized, hierarchical bullet points using markdown. Use bold headers for main sections, nested bullets for sub-points. Each bullet should be one clear idea. Prioritize scannability.",
  interview: "Generate 8 interview questions for the given topic or role. Label them clearly:\n- **Conceptual (3)**: theory and fundamentals\n- **Practical (3)**: coding/scenario-based\n- **Behavioral (2)**: soft skills (STAR format)\n\nFor each question, provide the question and a **Model Answer** with 3-4 key points to cover. Use markdown formatting.",
  studyplan: "Create a detailed study plan for the given topic. Include: **Timeline** (daily/weekly schedule), **Topics to Cover** (in order), **Resources** (free online tools, books, practice sites), **Milestones & Checkpoints**, **Practice Exercises**. Assume beginner level unless specified. Use markdown tables where helpful.",
  mindmap: "Create comprehensive mind map notes for the given topic. Format as:\n\n# [Central Topic]\n\n## Branch 1: [Main Subtopic]\n- Key point\n  - Detail\n  - Detail\n\n## Branch 2: ...\n\nCreate 5-7 main branches. Each branch should have 3-5 sub-points. Think hierarchically. Use markdown headers and nested lists.",
  professional: "Rewrite the provided text in a polished, professional tone for business communication. Improve clarity, fix grammar, elevate vocabulary, ensure proper structure. Present:\n\n**Original key phrases:**\n[quote briefly]\n\n**Rewritten:**\n[your professional version]\n\n**Changes made:** [brief bullet list of improvements]",
  code_explain: "You are an expert code reviewer and teacher. When given code: **Explain** what it does (line by line if needed), **Identify** any bugs or issues, **Suggest** improvements with examples, **Highlight** best practices. Use markdown code blocks with syntax highlighting. Be specific and educational."
};

app.post("/api/chat", async (req, res) => {
  try {
    const { message, mode, history = [] } = req.body;

    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.explain;

    // Build Gemini contents array with history
    const contents = [];

    // Inject system prompt as first user turn (Gemini doesn't have a system role)
    if (history.length <= 1) {
      // First message — prepend system prompt
      contents.push({
        role: "user",
        parts: [{ text: systemPrompt + "\n\n" + message }]
      });
    } else {
      // Multi-turn: include system prompt once then history
      const historyContents = history.slice(0, -1).map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

      // First turn includes system prompt
      if (historyContents.length > 0) {
        historyContents[0].parts[0].text = systemPrompt + "\n\n" + historyContents[0].parts[0].text;
      }

      contents.push(...historyContents);
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
    res.json({ reply });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LearnAI running → http://localhost:${PORT}`);
});
