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
    users = [User]
    maxPlayers = 0
    createdOn = None

    def __init__(self, id, leagueName, leagueOwner, users, maxPlayers, createdOn):
        self.id = id
        self.leagueName = leagueName
        self.leaugeOwner = leagueOwner
        self.users = users
        self.maxPlayers = maxPlayers
        self.createdOn = createdOn

class Roster:
    id = 0
    leagueName = ''
    username = ''
    teamName = ''
    queens = []
    currentPoints = 0

    def __init__(self, id, leagueName, username, teamName, queens, currentPoints):
        self.id = id
        self.leagueName = leagueName
        self.username = username
        self.teamName = teamName
        self.queens = queens
        self.currentPoints = currentPoints

class AuthTokens:
    
    userID = 0
    email = ''
    token = ''

    def __init__(self, id, email, token):
        self.userID = id
        self.email = email
        self.token = token
    