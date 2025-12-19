import requests
from TestResult import TestResult
import json
import time
import os
import sys
from BITLogger import BITLogger

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

    # logger #
    bitLogger = BITLogger()

    def __init__(self, ip: str = '127.0.0.1', port: int = 3000):
        if ip:
            self.IP = ip
        if port:
            self.PORT = port
        
        self.bitLogger.addMessage('BIT Initialized')
        print(f'BIT Initialized:')
        print(f"IP: {self.IP}\nPORT: {self.PORT}\nTOKEN:{self.TOKEN}")
        self.bitLogger.addMessage(f"IP: {self.IP}\nPORT: {self.PORT}\nTOKEN:{self.TOKEN}")
    
    # wrapper to make POST request #
    # @route is what would follow the port on server #
    # data can be any dict # 
    def makePostReqWrapper(self, route: str, data: dict):
        # to do
        url = f"{self.HTTP}{self.IP}:{self.PORT}{route}"
        # print(f"connecting to server POST endpoint: {url}")
        self.bitLogger.addMessage(f"makePostReqWrapper() connecting to server at {url}")
        header = {
            'Content-Type': 'application/json',
            #'Authorization': f"Bearer {self.TOKEN}"
        }
        self.bitLogger.addMessage(f"makePostReqWrapper() -> adding header: {header}")
        self.bitLogger.addMessage(f"makePostReqWrapper() -> data: {data}")
        try:
            response = requests.post(url, headers=header, json=data)
            self.bitLogger.addMessage(f"makePostReqWrapper() -> got response: ")
            self.bitLogger.addMessage(f"{response}")
            return response
        except Exception as e:
            self.bitLogger.addMessage(f"makePostReqWrapper() -> exception thrown:")
            self.bitLogger.addMessage(f"{e}")
            return str(e)
    
    # wrapper for GET request #
    def makeGetRequest(self, route: str):
        url = f"{self.HTTP}{self.IP}:{self.PORT}{route}"
        self.bitLogger.addMessage(f"makeGetRequest() connecting to server at {url}")
        header = {
            'Content-Type': 'application/json',
            'Authorization': f"Bearer {self.TOKEN}"
        }
        self.bitLogger.addMessage(f"makeGetRequest() -> adding header: {header}")
        try:
            response = requests.get(url, headers=header)
            self.bitLogger.addMessage(f"makeGetRequest() -> got response: ")
            self.bitLogger.addMessage(f"{response}")
            return response
        except Exception as e:
            self.bitLogger.addMessage(f"makeGetRequest() -> exception thrown:")
            self.bitLogger.addMessage(f"{e}")
            return str(e)
    
    # wrapper for processing #
    def processRequest(self, response):
        self.bitLogger.addMessage(f"processRequest() -> processing response:")
        self.bitLogger.addMessage(f"{response}")
        try:
            self.bitLogger.addMessage(f"processRequest() -> converting to JSON format")
            response = response.json()
            self.bitLogger.addMessage(f"processRequest() -> converted to json format:")
            self.bitLogger.addMessage(f"{response}")
            print(response)
        except Exception as e:
            self.bitLogger.addMessage(f"processRequest() -> exception thrown:")
            self.bitLogger.addMessage(f"{e}")
            return e

    # TODO #
    def runTests(self):
        self.userAuthTest()
        time.sleep(5)
        self.userRegistrationTest()
        time.sleep(5)
        self.leagueCreationTest()
        time.sleep(5)
        self.summarizeResults()

    # TODO #
    def summarizeResults(self):
        pass

    # tests that users can authenticate to the system
    def userAuthTest(self):
        authURL = "/users/auth"
        self.bitLogger.addMessage(f"userAuthTest() -> pinging server at {authURL}")
        # correct password test
        body = {
            "email": "Hannah",
            "password": "Banana"
        }
        self.bitLogger.addMessage(f"makeNotificationTest() -> body: {body}")
        try:
            response = self.makePostReqWrapper(authURL, body)
            self.bitLogger.addMessage(f"makeNotificationTest() -> got back response from makePostReq:")
            self.bitLogger.addMessage(f"{response}")
            # TODO: make sure response has a token #
            tr = TestResult('User Authentication Test (Correct Password)', True, response)
            self.results.append(tr)
        except Exception as e:
            self.bitLogger.addMessage(f"makeNotificationTest() -> exception thrown")
            tr = TestResult('User Authentication Test (Corret Password)', False, str(e))
            self.results.append(tr)
            self.bitLogger.addMessage(f"makeNotificationTest() -> {e}")


    # tests that users can register accounts # 
    def userRegistrationTest(self):
        registrationUrl = "/users/create"
        self.bitLogger(f"userRegistrationTest() -> pinging server at {registrationUrl}")
        # TODO: Add checkbox flag #
        body = {
            "email": "BIT@test.com",
            "password": "Temp"
        }
        self.bitLogger.addMessage(f"userRegistrationTest() -> body: {body}")
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
            'users': ["BIT@test.com"
            ""],
            'maxPlayers': 3
        }
        try:
            response = self.makePostReqWrapper(leagueCreationUrl, body)
            self.results.append(TestResult('League Creation Test', True, response))
        except Exception as e:
            self.results.append(TestResult('League Creation Test', False, str(e)))
    
    # get league by name #
    def getLeagueByNameTest(self) -> TestResult:
        leagueByNameUrl = '/league/getLeague'
        self.bitLogger.addMessage(f"getLeagueByNameTest() -> pinging URL: {leagueByNameUrl}")
        body = {
            'leaguename': f"Hannah's Hotties"
        }
        self.bitLogger.addMessage(f"getLeagueByNameTest() -> request body: {body}")
        response = self.makePostReqWrapper(leagueByNameUrl, body)
        self.bitLogger.addMessage(f"getLeagueByNameTest() -> response from makePostReqWrapper:")
        self.bitLogger.addMessage(f"{response}")
        response = self.processRequest(response)
        self.bitLogger.addMessage(f"getLeagueByNameTest() -> response from processRequest:")
        self.bitLogger.addMessage(response)


    # get all league test #
    def getAllLeaguesTest(self) -> TestResult:
        getLeagueUrl = '/league/getAllLeagues'
        self.bitLogger.addMessage(f"getAllLeaguesTest() -> pinging {getLeagueUrl}")
        response = self.processRequest(self.makeGetRequest(getLeagueUrl))
        self.bitLogger.addMessage(f"getAllLeaguesTest() -> got back response")
        self.bitLogger.addMessage(f"{response}")
        print(response)

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
    
    # make a notification in the notification center #
    def makeNotificationTest(self) -> TestResult:
        notifUrl = "/notifications/newNotification"
        self.bitLogger.addMessage(f"makeNotificationTest() -> pinging server at {notifUrl}")
        body = {
            'source': 'BIT@test.com',
            'destination': 'Brandon@test.com',
            'content': 'This is a test from BIT'
        }
        self.bitLogger.addMessage(f"makeNotificationTest() -> request body {body}")
        try:
            response = self.makePostReqWrapper(notifUrl, body)
            self.bitLogger.addMessage(f"makeNotificationTest() -> got back response {response}")
            self.results.append(TestResult('Make Notification Test', True, str(response)))
            self.bitLogger.addMessage(f"makeNotificationTest() -> added TestResult with response data")
        except Exception as e:
            self.bitLogger.addMessage(f"makeNotificationTest() -> exception thrown")
            self.results.append(TestResult('Make Notification Test', False, str(e)))
            self.bitLogger.addMessage(f"makeNotificationTest() -> {e}")
        
    
    # resolve the notification made earlier #
    # test that you can update notifs in the backend #
    def updateNotificationTest(self) -> TestResult:
        notifUpdateUrl = "/notifications/updateNotification"
        self.bitLogger.addMessage(f"updateNotificationTest() -> pinging server {notifUpdateUrl}")
        body = {
            'notifId': 1
        }
        self.bitLogger.addMessage(f"updateNotificationTest() -> body: {body}")
        try:
            response = self.makePostReqWrapper(notifUpdateUrl, body)
            self.bitLogger.addMessage(f"updateNotificationTest() -> got response from makePostReqWrapper")
            self.bitLogger.addMessage(f"updateNotificationTest() -> {response}")
            if response:
                self.results.append(TestResult('Update Notification Test', True, str(response.json())))
                self.bitLogger.addMessage(f"updateNotificationTest() -> added TestResult with data:")
                self.bitLogger.addMessage(f"updateNotificationTest() -> {response}")
        except Exception as e:
            self.bitLogger.addMessage(f"updateNotificationTest() -> exception thrown")
            self.bitLogger.addMessage(f"updateNotificationTest() -> {e}")
            self.results.append(TestResult('Update Notification Test', False, str(e)))
    
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

    print(f'Running BIT on {ip} and {port}')

    # for now: just parse out the ip/port
    # TODO: add test data arg to constructor
    bitInstance = BIT(ip, port)
    
    bitInstance.getLeagueByNameTest()
    # bitInstance.getAllLeaguesTest()
    # bitInstance.makeNotificationTest()
    # bitInstance.updateNotificationTest()

    time.sleep(5) # give BIT time to finish # 