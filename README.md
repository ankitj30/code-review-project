# AI Code Review

React/Vite frontend and Express API that sends submitted code to Google Gemini for review.

## Deploy backend to Render

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Render, create a Blueprint from the repository. Render will use the root `render.yaml` and deploy the Express service from `BackEnd`.
3. Enter your `GOOGLE_GEMINI_KEY` when Render prompts for the secret. Keep API keys in Render's environment settings; do not commit `.env` files.
4. After deploy, copy the backend URL, for example `https://code-review-api.onrender.com`.

## Deploy frontend to Vercel

1. Import the same repository into Vercel.
2. Set the project Root Directory to `Frontend`. The included `Frontend/vercel.json` configures the Vite build and SPA fallback.
3. Add the Vercel environment variable `VITE_API_URL` with the Render backend URL, without a trailing slash, for example `https://code-review-api.onrender.com`.
4. Deploy and copy the production Vercel URL.

## Connect the deployed services

In Render, set `FRONTEND_URL` to the production Vercel URL (for example `https://code-review-project.vercel.app`) and redeploy. This allows the deployed frontend to call the API through CORS.

## Run locally

Install packages from each directory with `npm install`. Create `BackEnd/.env` with `GOOGLE_GEMINI_KEY=...`, then run `npm run dev` in `BackEnd` and `Frontend` in two terminals. The frontend uses `http://localhost:3000` by default; optionally set `Frontend/.env` to override `VITE_API_URL`.
