const express = require('express');
const aiRoutes = require('./routes/ai.routes')
const cors = require('cors')

const app = express()

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true)
        }
        return callback(new Error('Origin not allowed by CORS'))
    },
}))


app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello World')
})

app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
})

app.use('/ai', aiRoutes)

module.exports = app
