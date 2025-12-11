import psycopg2 as pg
import json

''' python plumbing to interact with the postgres db and make visualizations and such '''

class PostgresAdapter:

    filename: str = '' # config file for db 
    configs: dict = {}

    # pg objects
    connection = None
    cursor = None

    def __init__(self, filename: str):
        self.filename = filename
        self.readConfig()

        print(f"{self.configs['user']}, {self.configs['password']}, host={self.configs['host']}, port={self.configs['port']}, database={self.configs['database']}")

    def readConfig(self):
        with open(self.filename, 'r') as configFile:
            self.configs = json.load(configFile)
    
    def makeConnection(self):
        self.connection = pg.connect(user=self.configs['user'], password=self.configs['password'], host=self.configs['host'], port=self.configs['port'], database=self.configs['database'])
    
    def selectAllFromTable(self, table:str):
        SELECT_ALL_QUERY = f'SELECT * FROM "{table}"'

        if not self.connection:
            self.makeConnection()
        
        self.cursor = self.connection.cursor()
        self.cursor.execute(SELECT_ALL_QUERY)
        results = self.cursor.fetchall()

        print(results)
