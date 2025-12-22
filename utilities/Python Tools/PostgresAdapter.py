import psycopg2 as pg
import json
from utilLogger import utilLogger

''' python plumbing to interact with the postgres db and make visualizations and such '''

class PostgresAdapter:

    filename: str = '' # config file for db 
    configs: dict = {}

    # pg objects
    connection = None
    cursor = None

    PgAdapterLogger = None

    def __init__(self, filename: str):
        self.PgAdapterLogger = utilLogger()
        self.filename = filename
        self.PgAdapterLogger.addMessage(f"PgAdapter.init() -> reading {filename}")
        self.readConfig()

        self.PgAdapterLogger.addMessage(f"PgAdapter.init() -> postgres configs below:")
        self.PgAdapterLogger.addMessage(f"{self.configs['user']}, {self.configs['password']}, host={self.configs['host']}, port={self.configs['port']}, database={self.configs['database']}")

    def readConfig(self):
        try:
            with open(self.filename, 'r') as configFile:
                self.configs = json.load(configFile)
                self.PgAdapterLogger.addMessage(f"PgAdapter.readConfig() -> read data from {self.filename}")
        except Exception as e:
            self.PgAdapterLogger.addMessage(f"PgAdapter.readConfig() -> exception thrown: {e}")
    
    def makeConnection(self):
        self.connection = pg.connect(user=self.configs['user'], password=self.configs['password'], host=self.configs['host'], port=self.configs['port'], database=self.configs['database'])
    
    def selectAllFromTable(self, table:str):
        SELECT_ALL_QUERY = f'SELECT * FROM "{table}"'

        if not self.connection:
            self.makeConnection()
        
        self.cursor = self.connection.cursor()
        self.cursor.execute(SELECT_ALL_QUERY)
        self.PgAdapterLogger.addMessage(f"PgAdapter.selectAllFromTable() -> executed query")
        results = self.cursor.fetchall()
        
        return results
