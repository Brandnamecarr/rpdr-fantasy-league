import { MessageQueue } from "../util/MessageQueue";

export class ActivityTracker {
    private messageQueue: MessageQueue = new MessageQueue();

    constructor() {}

    public writeMessage(message: string): void {
        this.messageQueue.enqueue(message);
    }
}