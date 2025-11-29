import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const hrPolicies = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'hrPolicies.json'), 'utf-8')
);

const SYSTEM_PROMPT = `You are an HR Assistant Agent for a company.

Your job is to:
- Answer employee questions about HR policies, leave rules, salary, benefits, onboarding, dress code, work hours, company rules, holidays, and workplace processes.
- Always give clear, accurate, professional answers.
- Answer ONLY using the provided HR policy data below.
- If the answer is not present, say: "This information is not available in the HR policy."

HR DATA (Knowledge Base):
${JSON.stringify(hrPolicies, null, 2)}

Rules:
1. Match user questions to the correct HR policy.
2. If multiple policies are relevant, combine them logically.
3. Keep answers short, direct, and helpful.
4. If user asks unrelated questions (e.g., coding, personal topics), respond: "I can answer only HR-related questions."
5. Do not hallucinate or make up policies.
6. Always respond in ENGLISH only. Translation will be handled separately.`;

// Language detection function
function detectLanguage(text) {
  const patterns = {
    'hi-IN': /[\u0900-\u097F]/, // Hindi
    'kn-IN': /[\u0C80-\u0CFF]/, // Kannada
    'ta-IN': /[\u0B80-\u0BFF]/, // Tamil
    'te-IN': /[\u0C00-\u0C7F]/, // Telugu
    'en-IN': /^[a-zA-Z0-9\s.,!?'"-]+$/ // English
  };

  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return lang;
    }
  }
  return 'en-IN';
}

// Translate using Sarvam AI
async function translateText(text, sourceLang, targetLang) {
  try {
    // Skip if same language or no API key
    if (sourceLang === targetLang || !process.env.SARVAM_API_KEY) {
      return text;
    }

    console.log(`Translating from ${sourceLang} to ${targetLang}:`, text);

    const response = await fetch('https://api.sarvam.ai/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-Subscription-Key': process.env.SARVAM_API_KEY
      },
      body: JSON.stringify({
        input: text,
        source_language_code: sourceLang,
        target_language_code: targetLang,
        speaker_gender: 'Male',
        mode: 'formal',
        model: 'mayura:v1',
        enable_preprocessing: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Sarvam API Error:', response.status, errorText);
      return text; // Return original if translation fails
    }

    const data = await response.json();
    console.log('Translated:', data.translated_text);
    return data.translated_text || text;
  } catch (error) {
    console.error('Translation error:', error.message);
    return text; // Return original text on error
  }
}

// Generate AI response using Cohere
async function generateCohereResponse(message, conversationHistory) {
  try {
    // Build chat history for Cohere
    const chatHistory = conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'USER' : 'CHATBOT',
      message: msg.content
    }));

    const response = await fetch('https://api.cohere.ai/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'command-r-plus-08-2024',
        message: message,
        preamble: SYSTEM_PROMPT,
        chat_history: chatHistory,
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cohere API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.text || 'I apologize, but I could not generate a response.';
  } catch (error) {
    console.error('Cohere API error:', error.message);
    throw error;
  }
}

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Step 1: Detect user's language
    const userLanguage = detectLanguage(message);
    console.log('\n--- New Message ---');
    console.log('User message:', message);
    console.log('Detected language:', userLanguage);

    // Step 2: Translate to English if needed
    let englishMessage = message;
    if (userLanguage !== 'en-IN') {
      englishMessage = await translateText(message, userLanguage, 'en-IN');
      console.log('English translation:', englishMessage);
    }

    // Step 3: Translate conversation history to English
    const englishHistory = [];
    for (const msg of conversationHistory) {
      const msgLang = detectLanguage(msg.content);
      let englishContent = msg.content;
      
      if (msg.role === 'user' && msgLang !== 'en-IN') {
        englishContent = await translateText(msg.content, msgLang, 'en-IN');
      }
      
      englishHistory.push({
        role: msg.role,
        content: englishContent
      });
    }

    // Step 4: Get AI response in English
    const englishResponse = await generateCohereResponse(englishMessage, englishHistory);
    console.log('AI response (English):', englishResponse);

    // Step 5: Translate response back to user's language
    let finalResponse = englishResponse;
    if (userLanguage !== 'en-IN') {
      finalResponse = await translateText(englishResponse, 'en-IN', userLanguage);
      console.log('Translated response:', finalResponse);
    }

    res.json({ 
      response: finalResponse,
      timestamp: new Date().toISOString(),
      provider: 'Cohere + Sarvam AI',
      detectedLanguage: userLanguage,
      model: 'command-r-plus + Sarvam Translate'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
});

// Translate endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLang, targetLang } = req.body;
    const translated = await translateText(text, sourceLang, targetLang);
    
    res.json({
      original: text,
      translated: translated,
      sourceLang,
      targetLang
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Detect language endpoint
app.post('/api/detect-language', async (req, res) => {
  try {
    const { text } = req.body;
    const language = detectLanguage(text);
    
    const languageNames = {
      'hi-IN': 'Hindi',
      'kn-IN': 'Kannada',
      'ta-IN': 'Tamil',
      'te-IN': 'Telugu',
      'en-IN': 'English'
    };
    
    res.json({
      languageCode: language,
      languageName: languageNames[language] || 'Unknown'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    provider: 'Cohere + Sarvam AI Translation',
    model: 'command-r-plus-08-2024',
    translation: 'Sarvam AI (Mayura v1)',
    supportedLanguages: ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu']
  });
});

app.get('/test', async (req, res) => {
  try {
    // Test Cohere
    const cohereResponse = await fetch('https://api.cohere.ai/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'command-r-plus-08-2024',
        message: 'Say hello in one word'
      })
    });

    const cohereData = await cohereResponse.json();

    // Test Sarvam AI Translation
    const sarvamTest = process.env.SARVAM_API_KEY 
      ? await translateText('Hello', 'en-IN', 'hi-IN')
      : 'Not configured';

    res.json({ 
      status: '✅ All APIs working!',
      cohere: {
        status: cohereResponse.ok ? 'OK' : 'Error',
        model: 'command-r-plus-08-2024',
        response: cohereData.text || 'Error'
      },
      sarvamAI: {
        status: sarvamTest !== 'Hello' && sarvamTest !== 'Not configured' ? 'OK' : 'Not configured',
        testTranslation: sarvamTest,
        note: !process.env.SARVAM_API_KEY ? 'Add SARVAM_API_KEY to .env for translation' : 'Translation working!'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: '❌ Error',
      error: error.message,
      hint: 'Check your COHERE_API_KEY and SARVAM_API_KEY in .env'
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`🧠 Using Cohere AI (command-r-plus)`);
  console.log(`🌐 Using Sarvam AI Translation (5 Indian Languages)`);
  console.log(`📝 Test: http://localhost:${PORT}/test\n`);
});
