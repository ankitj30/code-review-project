const aiService = require('../services/ai.service')

module.exports.getReview = async (req, res) => {
    const code = req.body?.code

    if (!code || !code.trim()) {
        return res.status(400).json({ error: 'No code provided. Please paste some code and try again.' })
    }

    try {
        const response = await aiService(code)
        res.send(response)
    } catch (err) {
        // Log the real error (status + raw message) so it's visible in backend terminal
        const status  = err.status ?? err.statusCode ?? '?'
        const rawMsg  = err.message ?? String(err)
        console.error(`[ai.controller] Gemini error  status=${status}  msg=${rawMsg}`)

        // Classify and return a sanitized message to the frontend
        let userMsg

        if (/ENOTFOUND|ECONNREFUSED|fetch failed|network/i.test(rawMsg)) {
            userMsg = 'Could not reach the Gemini API. Check your internet connection or firewall and try again.'
        } else if (status === 400 || /bad request/i.test(rawMsg)) {
            userMsg = 'The review request was malformed. Please check your code and try again.'
        } else if (status === 401 || status === 403 || /api.?key|unauthorized|permission/i.test(rawMsg)) {
            userMsg = 'The Gemini API key is missing, invalid, or not enabled. Please update GOOGLE_GEMINI_KEY in your .env file.'
        } else if (status === 404 || /not found|not supported/i.test(rawMsg)) {
            userMsg = 'The selected Gemini model is not available for your API key. Contact support if this persists.'
        } else if (status === 429 || /quota|rate.?limit|resource.?exhausted/i.test(rawMsg)) {
            userMsg = 'The Gemini API rate limit has been reached. Please wait a moment and try again.'
        } else if (status >= 500 || /internal|server error/i.test(rawMsg)) {
            userMsg = 'The Gemini API returned a server error. Please try again in a moment.'
        } else {
            userMsg = 'The review request failed. Please try again.'
        }

        res.status(502).json({ error: userMsg })
    }
}
