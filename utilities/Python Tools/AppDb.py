from PostgresAdapter import PostgresAdapter
from utilLogger import utilLogger
import time

# custom types #
from appTypes import User, League, Roster, AuthTokens

class AppDb:
    adapter: PostgresAdapter = None
    appDbLogger: utilLogger = None

    def __init__(self, filename: str = './config.json'):
        try:
            print(f"using {filename}")
            self.appDbLogger = utilLogger()
            self.adapter = PostgresAdapter(filename)
            self.appDbLogger.addMessage('AppDb: init() -> just made postgres adapter')
        except Exception as e:
            self.appDbLogger.addMessage(f"AppDb.init() -> exception thrown in constructor: {e}")
    
    def getAllFromTable(self, table: str):
        self.appDbLogger.addMessage(f"AppDb.getAllFromTable() -> loading all records from {table}")
        return self.adapter.selectAllFromTable(table)

    def addNewQueensToTable(self, table: str, data):
        print('inside addNewQueensToTable, data:')
        queensTuples = [
            (q['franchise'], q['season'], q['name'], q['status'], q['location'])
            for q in data
        ]
        print(queensTuples)