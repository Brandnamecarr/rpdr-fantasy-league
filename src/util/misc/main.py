import PostgresAdapter as dbAdapter

# custom types #
from appTypes import User, League, Roster, AuthTokens

dbConn = dbAdapter.PostgresAdapter('./config.json')
dbConn.makeConnection()
if dbConn.connection is None:
    print('failed to make connection')
else:
    print('made connection')


dbConn.selectAllFromTable('League')