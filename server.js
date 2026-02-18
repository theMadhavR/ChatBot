const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.static('public'));

// Initialize Gemini with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// CORRECT model names based on your API response
const MODELS = [
    'gemini-2.5-flash',      // Fastest option
    'gemini-2.5-pro',        // Most powerful
    'gemini-2.5-flash-lite', // Lightweight
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash-lite-001',
    'gemini-2.0-flash-lite'
];

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        console.log('📨 Received:', message);
        
        let lastError = null;
        let response = null;
        let usedModel = null;
        
        // Try each model in order
        for (const modelName of MODELS) {
            try {
                console.log(`🔄 Trying model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(message);
                response = await result.response;
                usedModel = modelName;
                console.log(`✅ Success with model: ${modelName}`);
                break;
            } catch (error) {
                console.log(`❌ Model ${modelName} failed:`, error.message);
                lastError = error;
            }
        }
        
        if (!response) {
            throw lastError || new Error('No working model found');
        }
        
        const text = response.text();
        console.log(`💬 Response (using ${usedModel}):`, text.substring(0, 50) + '...');
        
        res.json({ 
            response: text,
            model: usedModel 
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Check server logs for more information'
        });
    }
});

// Model list endpoint
app.get('/api/models', async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    
    try {
        const models = await genAI.listModels();
        res.json({ 
            available: models,
            recommended: MODELS
        });
    } catch (error) {
        res.json({ 
            available: MODELS,
            error: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`\n🚀 Server running at:`);
    console.log(`📍 http://localhost:${port}`);
    console.log(`📝 Using models: gemini-2.5-flash, gemini-2.5-pro, etc.`);
    console.log(`🔑 API Key: ✅ Working\n`);
});