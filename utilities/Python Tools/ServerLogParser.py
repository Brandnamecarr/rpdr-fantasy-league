from datetime import datetime
import json
from utilLogger import utilLogger

'''
    Parses logs from the server code 

    Current functionality:

    1. Grouping the log entries by level
    2. Finding if users are in the logs 
'''

class ServerLogParser:
    logParserLogger: utilLogger = None
    filename: str = 'app.log'
    logData = None

    def __init__(self, filename: str = 'app.log'):
        if filename:
            self.filename = filename
        
        self.logParserLogger = utilLogger()
    
    # loads the file into object #
    def LoadAndParse(self):
        try:
            with open(self.filename, 'r') as logFile:
                self.logParserLogger.addMessage(f"ServerLogParser.LoadAndParse() -> read log file {self.filename}")
                data = logFile.readlines()
                data = list(map(lambda s: s.strip(), data))
                self.logParserLogger.addMessage(f"ServerLogParser.LoadAndParse() -> just read {len(data)} lines")
                self.CleanData(data)
        except Exception as e:
            self.logParserLogger.addMessage(f"ServerLogParser.LoadAndParse() -> exception thrown {e}")
            return
    # cleans data #
    # (convert timestamps, etc etc) #
    def CleanData(self, data):
        cleanList = []
        if data is None:
            self.logParserLogger.addMessage(f"ServerLogParser.CleanData() -> data is none, returning")
            return
        for line in data:
            cleanList.append(json.loads(line))
        self.logData = cleanList
        self.logParserLogger.addMessage(f"ServerLogParser.CleanData() -> successfully initialized logData!")

    def getByUser(self, email: str) -> list:
        userLogMessages = []
        if self.logData is None or email is None or email == '':
            self.logParserLogger.addMessage(f"ServerLogParser.getByUser() -> self.logData is None, returning")
            return
        for line in self.logData:
            if email in line['message'] or email in line['context']:
                userLogMessages.append(line)
        self.logParserLogger.addMessage(f"ServerLogParser.getByUser() -> found {len(userLogMessages)} containing {email}")
        return userLogMessages
    
    def getByLevel(self, level: str) -> list:
        logMessagesAtLevel = []
        if self.logData is None or level is None or level == '':
            self.logParserLogger.addMessage(f"ServerLogParser.getByLevel() -> error in parameters or logData")
        
        # safeguard against case sensitivity #
        level = level.upper()

        for line in self.logData:
            if line['level'] == level:
                logMessagesAtLevel.append(line)
        self.logParserLogger.addMessage(f"ServerLogParser.getByLevel() -> found {len(logMessagesAtLevel)} matching level {level}")
        return logMessagesAtLevel

    def WriteToFile(self, outputFilename, dataToBePrinted):
        try:
            with open(outputFilename, 'w') as outFile:
                json.dump(dataToBePrinted, outFile)
            self.logParserLogger.addMessage(f"ServerLogParser.WriteToFile() -> just wrote to json flie")
        except Exception as e:
            self.logParserLogger.addMessage(f"ServerLogParser.WriteToFile() -> exception thrown: {e}")



