const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class GPT {
    constructor() {
        this.name = "GPT";
        this.type = "ChatCompletion";
        this.default_model = "gpt-4";
        this.url = "https://nexra.aryahcr.cc/api/chat/gpt";
        this.supports_message_history = true;
        this.need_slice_text = true;
        this.working = true;
    }

    async fetchData(messages, options) {
        const headers = { 'Content-Type': 'application/json' };
        const data = {
            messages: messages,
            prompt: messages[messages.length - 1].content,
            model: options?.model || "gpt-4",
            markdown: options?.markdown || false
        };

        try {
            const response = await axios.post(this.url, data, {
                headers: headers,
                proxy: options?.proxy ? { host: options.proxy.host, port: options.proxy.port } : undefined,
                responseType: options?.stream ? 'stream' : 'text'
            });

            return this.handleResponse(response.data, options?.stream || false);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    handleResponse(data, isStream) {
        if (isStream) {
            return data;
        }
        const text = data.substring(data.indexOf('{'));
        const obj = JSON.parse(text);
        if (!obj || !obj.gpt) throw new Error("Invalid response.");
        return obj.gpt;
    }
}

const app = express();
const gpt = new GPT();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const getFilePath = (id) => path.join(__dirname, 'userdata', `${id}.json`);

const createUserdataDirectory = async () => {
    const dirPath = path.join(__dirname, 'userdata');
    try {
        await fs.mkdir(dirPath, { recursive: true });
        console.log('Userdata directory is ready.');
    } catch (error) {
        console.error('Failed to create userdata directory:', error);
    }
};

createUserdataDirectory();

app.get('/api/gpt', async (req, res) => {
    const ask = req.query.ask;
    const id = req.query.id;

    if (!ask || !id) {
        return res.status(400).json({ error: 'Both "ask" and "id" parameters are required' });
    }

    const filePath = getFilePath(id);

    let messages = [{ role: "system", content: "You're now ChatGpt4o" }];

    try {
        const fileExists = await fs.access(filePath).then(() => true).catch(() => false);

        if (fileExists) {
            const data = await fs.readFile(filePath, 'utf8');
            messages = JSON.parse(data);
        }

        messages.push({ role: "user", content: ask });

        const response = await gpt.fetchData(messages, { model: "gpt-4" });

        messages.push({ role: "assistant", content: response });

        await fs.writeFile(filePath, JSON.stringify(messages, null, 2));

        res.json({ response });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
