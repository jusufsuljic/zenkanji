<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# KanjiHub

Run and deploy your KanjiHub app.

KanjiHub supports mixed kanji and vocabulary collections so learners can study both in one suite.

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/7a134935-3fea-4ced-8d97-62d31abd6d5a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` from `.env.example`
3. Set `VITE_GEMINI_API_KEY` in `.env.local` to your Gemini API key
4. Run the app:
   `npm run dev`

Example `.env.local`:
```bash
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

For Netlify, set the same variable name: `VITE_GEMINI_API_KEY`.

Note: this app calls Gemini directly from the browser, so the key is shipped to the client. Use referrer restrictions on the key, or move Gemini calls behind a server/serverless function if you want the key kept private.
