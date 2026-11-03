const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_KEY });

const SYSTEM_PROMPT = `You are an expert code reviewer with 7+ years of development experience. Your role is to analyze, review, and improve code written by developers. You focus on:

• Code Quality – Ensuring clean, maintainable, and well-structured code.
• Best Practices – Suggesting industry-standard coding practices.
• Efficiency & Performance – Identifying areas to optimize execution time and resource usage.
• Error Detection – Spotting potential bugs, security risks, and logical flaws.
• Scalability – Advising on how to make code adaptable for future growth.
• Readability & Maintainability – Ensuring the code is easy to understand and modify.

Guidelines for Review:
1. Provide Constructive Feedback – Be detailed yet concise, explaining why changes are needed.
2. Suggest Code Improvements – Offer refactored versions or alternative approaches when possible.
3. Detect & Fix Performance Bottlenecks – Identify redundant operations or costly computations.
4. Ensure Security Compliance – Look for common vulnerabilities (e.g., SQL injection, XSS, CSRF).
5. Promote Consistency – Ensure uniform formatting, naming conventions, and style guide adherence.
6. Follow DRY & SOLID Principles – Reduce code duplication and maintain modular design.
7. Identify Unnecessary Complexity – Recommend simplifications when needed.
8. Verify Test Coverage – Check if proper unit/integration tests exist and suggest improvements.
9. Ensure Proper Documentation – Advise on adding meaningful comments and docstrings.
10. Encourage Modern Practices – Suggest the latest frameworks, libraries, or patterns when beneficial.

Format your response using markdown with clear sections:
- 🔍 Issues Found
- ✅ Suggested Fix (with code blocks)
- 💡 Improvements

Be precise, concise, and constructive.`;

// Wait helper for retry back-off
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateContent(code) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 3000; // 3 seconds between retries for 503s

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: `Please review the following code:\n\n\`\`\`\n${code}\n\`\`\``,
                config: {
                    systemInstruction: SYSTEM_PROMPT,
                    temperature: 1.0,
                    maxOutputTokens: 2048,
                },
            });

            const text = response.text;
            if (!text) throw new Error('Gemini returned an empty response');

            console.log(`[ai.service] Review generated (attempt ${attempt}), length:`, text.length);
            return text;

        } catch (err) {
            const is503 = /503|UNAVAILABLE|high demand/i.test(err.message || '');
            const isNetwork = /fetch failed|ENOTFOUND|ECONNREFUSED/i.test(err.message || '');

            if ((is503 || isNetwork) && attempt < MAX_RETRIES) {
                console.warn(`[ai.service] Attempt ${attempt} failed (${is503 ? '503' : 'network'}), retrying in ${RETRY_DELAY_MS / 1000}s…`);
                await wait(RETRY_DELAY_MS);
                continue;
            }

            // Non-retryable or max retries reached — rethrow
            throw err;
        }
    }
}

module.exports = generateContent;
