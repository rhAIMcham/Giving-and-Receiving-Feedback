require("dotenv").config();

console.log('=== Environment Variables ===');
console.log('API Key:', process.env.ELEVENLABS_API_KEY ? 'EXISTS' : 'MISSING');
console.log('Agent ID:', process.env.AGENT_ID ? 'EXISTS' : 'MISSING');
console.log('============================');

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());

app.use(express.json());


const PORT = process.env.PORT || 3001;

app.get("/api/get-signed-url", async (req, res) => {
    try {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${process.env.AGENT_ID}`,
            {
                headers: {
                    "xi-api-key": process.env.ELEVENLABS_API_KEY,
                },
            }
        );

        if (!response.ok) {
            throw new Error("Failed to get signed URL");
        }

        const data = await response.json();
        res.json({ signedUrl: data.signed_url });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Failed to generate signed URL" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
