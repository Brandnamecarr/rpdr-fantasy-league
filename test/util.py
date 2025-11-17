import requests

# data = {
#     "username": "HannahBanana",
#     "email": "Hannah@hotmail.com",
#     "password": "Pickle",
#     "teamName": "Hannah's Hotties",
#     "queens": ["Plane Jane", "Jimbo", "Kori King"]
# }

data = {
    "username": "HannahBanana",
    "password": "Pickle"
}
response = requests.post('http://127.0.0.1:3000/users/auth', json=data)

if response:
    print('response:')
    print(response.json())
else:
    print('something went wrong')