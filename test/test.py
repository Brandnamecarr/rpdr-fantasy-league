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
        url = ''
        header = {
            'Content-Type': 'application/json',
            'Authorization': f"{self.TOKEN}"
        }
        
        try:
            response = requests.post(url, headers=header, json=data)
            return response
        except Exception as e:
            return str(e)
    
    def runTests(self):

        self.summarizeResults()

    def summarizeResults(self):
        # to do #
        pass

    # tests that users can authenticate to the system
    def userAuthTest(self) -> list[TestResult]:
        authURL = "/users/auth"

        # correct password test
        body = {
            "username": "Hannah",
            "password": "Banana"
        }
        try:
            response = requests.post(authURL, json=body)
            print(response)
            if response:
                print('got response back:')
                print(response)
            else:
                print('error!')
            
            tr = TestResult('User Authentication Test (Correct Password)', True, '')
            testList.append(tr)
        except Exception as e:
            tr = TestResult('User Authentication Test (Corret Password)', False, str(e))
            testList.append(tr)


    # tests that users can register accounts # 
    def userRegistrationTest(self) -> TestResult:
        registrationUrl = "/"
        body = {
            "email": "BIT@test.com",
            "password": "Temp"
        }
        try:
            response = self.makePostReqWrapper(registrationUrl, body)
            if response:
                tr = TestResult('User Registration Test', True, '')
                return tr
        except Exception as e:
            tr = TestResult('User Registration Test', False, str(e))
            return tr

    # tests that users can register their league
    def leagueCreationTest(self) -> TestResult:
        leagueCreationUrl = f"{self.URL}:{self.port}/createNewLeague"
        body = {
            "TODO": "Populate with data"
        }
        try:
            response = requests.post(leagueCreationUrl, json=body)
            tr = TestResult('League Creation Test', True, '')
            return tr
        except Exception as e:
            tr = TestResult('League Creation Test', False, str(e))
            return tr

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