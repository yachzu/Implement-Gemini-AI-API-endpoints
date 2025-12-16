This project implements a Node.js + Express API that connects to Google Gemini AI (Generative AI) to generate text and image-based content.

It provides several endpoints:

  1. /generate-text         — generate AI responses from text prompts
  2. /generate-from-image   — analyze or generate text based on an uploaded image and optional prompt
  3. /generate-from-document        — analyze or generate text based on an uploaded document and optional prompt
  4. /generate-from-audio   — analyze or generate text based on an uploaded audio and optional prompt

The API uses multer for file uploads and @google/genai SDK for interacting with Gemini models such as gemini-2.5-flash.

Ideal for building chatbots, content generators, or intelligent media analysis tools.

#Node.js 
#Express 
#GoogleGemini 
#AI 
#API
#JavaScript
