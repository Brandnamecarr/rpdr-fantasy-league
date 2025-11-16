
export class MessageQueue {
    private messages: string[] = [];

    constructor() {
        this.messages.length = 0;
    }

    enqueue(newMessage: string): void {
        this.messages.push(newMessage);
    }

    dequeue(): string | undefined {
        return this.messages.shift();
    }

    isEmpty(): boolean {
        return this.messages.length === 0;
    }

    size(): number {
        return this.messages.length;
    }
} // MessageQueue //