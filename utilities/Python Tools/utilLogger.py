from queue import Queue
from threading import Thread, Lock
import time
import os

class utilLogger:

    filename: str = './util.log'
    messageQueue = Queue()
    messageThread = None
    messageThreadTimer = 0
    messageThreadLock = None

    # test value #
    removeIfFileExists = os.path.exists(filename)

    def __init__(self, filename = None, messageThreadTimer = 0):
        if filename:
            self.filename = filename
        if messageThreadTimer:
            self.messageThreadTimer = messageThreadTimer
        
        if self.removeIfFileExists:
            print('removing old log file')
            os.remove(self.filename)

        self.messageThreadLock = Lock()
        self.messageThread = Thread(target=self.threadFunction, daemon=True)
        self.messageThread.start()

    def __del__(self):
        if self.messageThread:
            self.messageThread.stop()
        if open(self.filename):
            self.filename.close()

    def addMessage(self, message):
        with self.messageThreadLock:
            self.messageQueue.put(str(message))
    
    def writeToFile(self, message):
        with open(self.filename, 'a') as logFile:
            logFile.write(message + '\n')

    def threadFunction(self):
        while True:
            message = self.messageQueue.get()
            self.writeToFile(message)
            time.sleep(self.messageThreadTimer)