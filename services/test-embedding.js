
'use strict';

const { Ollama } = require('ollama');

const EmbeddingService =
    require('./EmbeddingService');

// Initialize Ollama client.
const ollama = new Ollama({
    host: 'http://127.0.0.1:11434'
});

async function test() {

    const embeddingService =
        new EmbeddingService(ollama);

    const vector = await embeddingService.embed(
        'Find the function that calculates the sum of two numbers.'
    );

    console.log('\n========== EMBEDDING TEST ==========');

    console.log('Embedding length:', vector.length);

    console.log('First five values:', vector.slice(0, 5));

    console.log('====================================');

}

test().catch(error => {
    console.error('[TEST ERROR]', error);
});
