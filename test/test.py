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
    databasePath = "database/"

    # running list of results
    results = [TestResult]

    # thread to run tests on #
    testing_thread: Thread = None
    testing_thread_timer: int = 0 # in seconds
    running = False

    def __init__(self, running, testing_thread_timer: int = 0, url: str = 'http://127.0.0.1', port: int = 3000):
        self.running = running
        if testing_thread_timer:
            self.testing_thread_timer = testing_thread_timer
            print(f"self.testing_thread_timer: {self.testing_thread_timer}")
        if url:
            self.URL = url
        if port:
            self.port = port
        
        files = os.listdir(self.databasePath)
        print(files)

        if self.testing_thread_timer > 0:
            self.testing_thread = Thread(target=self.run_all_tests, daemon=True)
            self.testing_thread.start()
    
    def is_running(self) -> bool:
        return self.running

    def __del__(self):
        self.running = False
        if self.testing_thread:
            self.testing_thread.join()
    
    # Returns results to API to serve to statusPage on front end. 
    def getTestResults(self) -> list[TestResult]:
        if len(self.results > 0):
            return self.results
        else:
            return None

    ''' Main thread function. Runs all unit tests and adds to list '''
    def run_all_tests(self):
        result = None
        while self.running:
            # user auth test
            result = self.userAuthTest()
            self.results.append(result)

            time.sleep(self.testing_thread_timer) # sleep for configurable time

    # tests that users can authenticate to the system
    def userAuthTest(self) -> TestResult:
        
        authURL = f"{self.URL}:{self.port}/auth"
        body = {
            "username": "Hannah",
            "password" "Banana"
        }
        try:
            response = requests.post(authURL, json=body)
            if response:
                print('got response back:')
                print(response)
            else:
                print('error!')
            
            tr = TestResult('User Authentication Test', True, '')
            return tr
        except Exception as e:
            tr = TestResult('User Authentication Test', False, str(e))
            return tr

    # tests that users can register their team to a league
    def userRegistrationTest(self) -> TestResult:
        registrationUrl = f"{self.URL}:{self.port}/"
        body = {
            "league_name": "RPDR Fantasy League",
            "username": "Hannah",
            "password" "Banana",
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
    parser.add_argument('--interval', help="How often the tests run", default=0, type=int)
    parser.add_argument('--url', help="URL of Server to ping", default="http://127.0.0.1")
    parser.add_argument('--port', help="Port the server is runnign on", default=3000, type=int)
    
    args = parser.parse_args()
    bitInstance = None

    if args.h:
        print(usage())
    if args.interval and args.url and args.port:
        bitInstance = BIT(True, args.interval, args.url, args.port)
    else:
        bitInstance = BIT(False) # just does the constructor for right now
    
    print('starting BIT instance')
    while bitInstance.is_running():
        time.sleep(5)