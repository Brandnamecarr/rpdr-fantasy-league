import requests
from TestResult import TestResult
import json
import time
import os
import sys

''' class definition '''
class BIT:
    # relatively constant #
    HTTP: str = "http://"
    IP: str = ""
    PORT: int = 3000
    TOKEN: str = "" # implement later with auth work #

    # config data (TODO)
    bitConfigData: dict = None

    # running list of results
    results = [TestResult]

    def __init__(self, ip: str = '127.0.0.1', port: int = 3000):
        if ip:
            self.IP = ip
        if port:
            self.PORT = port
    
    # wrapper to make POST request #
    # @route is what would follow the port on server #
    # data can be any dict # 
    def makePostReqWrapper(self, route: str, data: dict):
        # to do
        url = f"{self.HTTP}{self.IP}:{self.PORT}{self.route}"
        print(f"connecting to server endpoint: {url}")
        header = {
            'Content-Type': 'application/json',
            'Authorization': f"Bearer {self.TOKEN}"
        }
        
        try:
            response = requests.post(url, headers=header, json=data)
            return response
        except Exception as e:
            return str(e)
    
    # wrapper for GET request #
    def makeGetRequest(self, route: str, data: dict):
        url = f"{self.HTTP}{self.IP}:{self.PORT}{route}"
        header = {
            'Content-Type': 'application/json',
            'Authorization': f"Bearer {self.TOKEN}"
        }
        try:
            response = requests.get(url, headers=header, json=data)
            return response
        except Exception as e:
            return str(e)
    
    def runTests(self):
        self.userAuthTest()
        time.sleep(5)
        self.userRegistrationTest()
        time.sleep(5)
        self.leagueCreationTest()
        time.sleep(5)
        self.summarizeResults()

    def summarizeResults(self):
        # to do #
        pass

    # tests that users can authenticate to the system
    def userAuthTest(self):
        authURL = "/users/auth"

        # correct password test
        body = {
            "email": "Hannah",
            "password": "Banana"
        }
        try:
            response = self.makePostReqWrapper(authURL, body)
            # TODO: make sure response has a token #
            tr = TestResult('User Authentication Test (Correct Password)', True, response)
            self.results.append(tr)
        except Exception as e:
            tr = TestResult('User Authentication Test (Corret Password)', False, str(e))
            self.results.append(tr)


    # tests that users can register accounts # 
    def userRegistrationTest(self):
        registrationUrl = "/users/create"
        # TODO: Add checkbox flag #
        body = {
            "email": "BIT@test.com",
            "password": "Temp"
        }
        try:
            response = self.makePostReqWrapper(registrationUrl, body)
            if response:
                tr = TestResult('User Registration Test', True, response)
                self.results.append(tr)
        except Exception as e:
            tr = TestResult('User Registration Test', False, str(e))
            self.results.append(tr)

    # tests that users can register their league
    def leagueCreationTest(self) -> TestResult:
        leagueCreationUrl = "/league/createLeague"
        body = {
            'leagueName': "BIT's League",
            'owner': "BIT@test.com",
            'users': [],
            'maxPlayers': 3
        }
        try:
            response = self.makePostReqWrapper(leagueCreationUrl, body)
            self.results.append(TestResult('League Creation Test', True, response))
        except Exception as e:
            self.results.append(TestResult('League Creation Test', False, str(e)))
    
    # get league by name #
    def getLeagueByNameTest(self) -> TestResult:
        pass

    # get all league test #
    def getAllLeaguesTest(self) -> TestResult:
        pass

    # get available leagues test #
    def getAllAvailLeaguesTest(self) -> TestResult:
        pass
    
    # test to add user to league #
    def addUserToLeagueTest(self) -> TestResult:
        addUserUrl = "/leagueOps/"
        pass
    
    # test to remove user from league #
    def removeUserFromLeagueTest(self) -> TestResult:
        pass

    # test of weeklySurvey #
    def weeklySurveyTest(self) -> TestResult:
        pass

    # tests that data will be updated #
    # very important route: used to adjust user's points #
    def weeklyUpdateTest(self) -> TestResult:
        pass

    # gets all league rosters #
    def getAllLeagueRostersTest(self) -> TestResult:
        pass

    # gets rosters by league #
    def getRostersByLeagueTest(self) -> TestResult:
        pass
    
    
    # cleans up data in DB #
    # TODO #
    def tearDown(self, data:dict) -> bool:
        return False

def parseBitConfig(filename):
    with open(filename, 'r') as file:
        return json.load(file)

if __name__ == '__main__':
    filename: str = 'test_data.json'
    if not os.path.exists(filename):
        sys.exit(-1)

    bitConfigData = parseBitConfig(filename)
    ip = bitConfigData['Configs']['ip']
    port = bitConfigData['Configs']['port']

    # for now: just parse out the ip/port
    # TODO: add test data arg to constructor
    bitInstance = BIT(ip, port)
    
    # bitInstance.runTests()