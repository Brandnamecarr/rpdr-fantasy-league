import requests
from TestResult import TestResult
from threading import Thread
import argparse
import time
import os

''' class definition '''
class BIT:
    # relatively constant #
    URL: str = "http://127.0.0.1:3000"
    port: int = 3000

    # running list of results
    results = [TestResult]

    def __init__(self, running, testing_thread_timer: int = 0, url: str = 'http://127.0.0.1', port: int = 3000):
        if url:
            self.URL = url
        if port:
            self.port = port
    
    def runTests(self):
        pass


    # tests that users can authenticate to the system
    def userAuthTest(self) -> list[TestResult]:
        testList = []
        authURL = f"{self.URL}:{self.port}/users/auth"

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
        
        # incorrect password test
        body = {
                "username": "Brandon",
                "password": "IncorrectPW"
            }
        try:
            response = requests.post(authURL, json=body)
            if response:
                print('got response back:')
                print(response)
            else:
                print('error!')
            
            tr = TestResult('User Authentication Test (Inorrect Password)', True, '')
            testList.append(tr)
        except Exception as e:
            tr = TestResult('User Authentication Test (Inorret Password)', False, str(e))
            testList.append(tr)
        
        return testList


    # tests that users can register their team to a league
    def userRegistrationTest(self) -> TestResult:
        registrationUrl = f"{self.URL}:{self.port}/"
        body = {
            "league_name": "RPDR Fantasy League",
            "username": "Hannah",
            "password": "Banana",
            "team_name": "Hannah's Hotties",
            "queens": ["Bianca Del Rio", "Plane Jane", "Jimbo", "Trinity the Tuck"]
        }
        try:
            response = requests.post(registrationUrl, json=body)
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
            response = request.post(leagueCreationUrl, json=body)
            tr = TestResult('League Creation Test', True, '')
            return tr
        except Exception as e:
            tr = TestResult('League Creation Test', False, str(e))
            return tr
        

def usage() -> str:
    help: str = f"Here is some help with the BIT Framework:\n"
    help += f""

if __name__ == '__main__':

    parser = argparse.ArgumentParser()
    parser.add_argument('--h', action="store_true")
    parser.add_argument('--url', help="URL of Server to ping", default="http://127.0.0.1")
    parser.add_argument('--port', help="Port the server is runnign on", default=3000, type=int)
    
    args = parser.parse_args()
    bitInstance = None

    if args.h:
        print(usage())
    if args.interval and args.url and args.port:
        bitInstance = BIT(args.url, args.port)
    else:
        bitInstance = BIT() # just does the constructor for right now
    
    bitInstance.runTests()