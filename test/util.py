import requests
import time

def handleServerResponse(response):
    if response:
        print("Successful Response from Server:")
        print(response.json())
    else:
        print("Something went wrong")
        print(response.json())

# Step 1: Create a User
# data = {
#     "email": "HannahBanana@test.com",
#     "password": "Pickle"
# }
# response = requests.post('http://127.0.0.1:3000/users/create', json=data)

# handleServerResponse(response)

# time.sleep(5)

# HannahBanana@test.com hashedPW: $2b$10$aOLihWRg6bcWh9m2MIc4q.Ji999OfRC6waS0KSlEjbIKsGgXUQTYq

# Step 2: Create a League
# data = {
#     "leagueName": "Hannah's Hotties",
#     "owner": "HannahBanana@test.com",
#     "users": [],
#     "maxPlayers": 10
# }
# print(data)
# response = requests.post('http://127.0.0.1:3000/league/createLeague', json=data)

# handleServerResponse(response)

# Step 3: Create another user and register him to Hannah's Hotties
# data = {
#     "email": "Brandon@test.com",
#     "password": "TempPw"
# }
# response = requests.post('http://127.0.0.1:3000/users/create', json=data)
# handleServerResponse(response)

# Brandon@test.com hashed pw: $2b$10$Em.4Qi3ugi5lnF3hAgbcTeYW.FO6IzNw22JPTTpZhVcc3IIZEJDnq

# Step 4: Register Brandon@test.com to Hannah's Hotties league
# this simulates joining an existing league, after registering for an account #
# data = {
#     "leagueName": "Hannah's Hotties",
#     "email": "Brandon@test.com",
#     "queens": ["Bianca Del Rio", "Adore Delano", "Plane Jane"]
# }
# response = requests.post('http://127.0.0.1:3000/leagueOps/addUserToLeague', json=data)
# handleServerResponse(response)


''' USE THIS LATER TO TEST WEEKLY UPDATES '''
weekly_update_data = {
    "maxiWinner": [],
    "isSnatchGame": False,
    "miniWinner": [],
    "topsOfWeek": [],
    "safeQueens": [],
    "bottomsOfWeek": [],
    "lipSyncWinner": [],
    "eliminated": []s
}

response = requests.post('http://127.0.0.1:3000/leagueOps/weeklyUpdate', json=weekly_update_data)
handleServerResponse(response)

weekly_summary_data = {
    "toots": [],
    "boots": [],
    "iconicQueens": [],
    "cringeQueens": []
    "queenOfTheWeek": []
}

response = requests.post("http://127.0.0.1:3000/leagueOps/weeklySurvey", json=weekly_summary_data)
handleServerResponse(response)
