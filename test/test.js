const { Ollama } = require('ollama');

async function run() {

    const client = new Ollama({
        host: 'http://127.0.0.1:11434'
    });

    const response = await client.chat({
        model: 'llama3.2:1b',
        messages: [
            {
                role: 'user',
                content: 'hello'
            }
        ]
    });

    console.log(response.message.content);
}

run().catch(console.error);