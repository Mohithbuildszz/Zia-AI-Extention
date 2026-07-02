'use strict';
class ChatHistoryService {
constructor(storage) {
    this.storage = storage;
    this.chats = storage.get("ziaChats", []);
    this.currentChatId = storage.get("ziaCurrentChat", null);
    if (this.chats.length === 0) {
        this.newChat();
    }
}
async save() {
    await this.storage.update(
        'ziaChats',
        this.chats
    );

    await this.storage.update(
        'ziaCurrentChat',
        this.currentChatId
    );

}
async newChat() {
    const chat = {
            id: Date.now().toString(),
            title: 'New Chat',
            createdAt: new Date(),
            updatedAt: new Date(),
       messages: [
    {
        role: 'assistant',
        content: 'Hello! I am Zia AI. How can I help you today?'
    }
]
        };
    this.chats.push(chat);
    this.currentChatId = chat.id;
    await this.save();
    return chat;
}

    getCurrentChat() {
        return this.chats.find(
            chat => chat.id === this.currentChatId
        );
    }
  

async loadChat(chatId) {
    const chat = this.chats.find(
        c => c.id === chatId
    );
    if (chat) {
        this.currentChatId = chatId;
        await this.save();
    }
    return chat;
}


async deleteChat(chatId) {
    this.chats = this.chats.filter(
        chat => chat.id !== chatId
    );

    if (this.currentChatId === chatId) {
        if (this.chats.length === 0) {
            await this.newChat();
        } else {
            this.currentChatId = this.chats[0].id;
        }
    }

    await this.save();
}


   async addMessage(role, content) {
    const chat = this.getCurrentChat();
    if (!chat) return;
    chat.messages.push({
        role,
        content
    });

    chat.updatedAt = new Date();
    await this.save();
}


async updateCurrentChatTitle(prompt) {
    const chat = this.getCurrentChat();
    if (!chat) return;
    if (chat.title === 'New Chat') {
        chat.title =
            prompt.length > 30
                ? prompt.substring(0, 30) + '...'
                : prompt;
        await this.save();
    }
}


async clearCurrentChat() {
    const chat = this.getCurrentChat();
    if (!chat) return;
  chat.messages = [
    {
        role: "assistant",
        content: "Hello! I am Zia AI. How can I help you today?"
    }
];
    chat.updatedAt = new Date();
    await this.save();
}



    getCurrentMessages() {
        const chat = this.getCurrentChat();
        return chat ? chat.messages : [];
    }



    getAllChats() {
        return this.chats;
    }



    getCurrentChatId() {
        return this.currentChatId;
    }


}
module.exports = ChatHistoryService;