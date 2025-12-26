import datetime

class User:
    id = 0
    email = ''
    hashedPw = ''
    createdOn = None

    def __init__(self, id, email, hashedPw, createdOn):
        self.id = id
        self.email = email
        self.hashedPw = hashedPw
        self.createdOn = createdOn

class League:
    id = 0
    leagueName = ''
    leagueOwner = ''
    franchise = ''
    season = 0
    users = [User]
    maxPlayers = 0
    createdOn = None
    maxQueensPerTeam = 0

    def __init__(self, id, leagueName, leagueOwner, franchise, season, users, maxPlayers, createdOn):
        self.id = id
        self.leagueName = leagueName
        self.leaugeOwner = leagueOwner
        self.franchise = franchise
        self.season = season
        self.users = users
        self.maxPlayers = maxPlayers
        self.createdOn = createdOn

class Roster:
    id = 0
    leagueName = ''
    username = ''
    teamName = ''
    franchise = ''
    season = 0
    queens = []
    currentPoints = 0
    pointUpdates = []

    def __init__(self, id, leagueName, username, teamName, franchise, season, queens, currentPoints, pointUpdates):
        self.id = id
        self.leagueName = leagueName
        self.username = username
        self.teamName = teamName
        self.franchise = franchise
        self.season = season
        self.queens = queens
        self.currentPoints = currentPoints
        self.pointUpdates = pointUpdates

class AuthTokens:
    
    userID = 0
    email = ''
    token = ''

    def __init__(self, id, email, token):
        self.userID = id
        self.email = email
        self.token = token

class Notification:
    notifId = 0
    source = ''
    destination = ''
    resolved = False
    content = ''
    createdAt = None
    updatedAt = None

    def __init__(self, notifId, source, destination, resolved, content, createdAt, updatedAt):
        self.notifId = notifId
        self.source = source
        self.destination = destination
        self.resolved = resolved
        self.content = content
        self.createdAt = createdAt
        self.updatedAt = updatedAt

class Queen:
    queenId = 0
    franchise = ''
    season = 0
    name = ''
    status = "ACTIVE" # QueenStatus enum #
    location = ''

    def __init__(self, queenId, franchise, season, name, status, location):
        self.queenId = queenId
        self.franchise = franchise
        self.season = season
        self.name = name
        self.status = status
        self.location = location
    