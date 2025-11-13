import requests
from TestResult import TestResult
from threading import Thread
import argparse
import time

''' class definition '''
class BIT:
    # relatively constant #
    URL: str = "http://127.0.0.1:3000"
    port: int = 3000

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
        if url:
            self.URL = url
        if port:
            self.port = port
    

    def run_all_tests(self):
        result = None
        while self.running:
            # user auth test
            result = self.userAuthTest()
            self.results.append(result)

    def userAuthTest(self) -> TestResult:
        
        authURL = self.URL + '/auth'
        body = {
            "username": "Hannah",
            "password": "Banana"
        }
        response = requests.post(authURL, json=body)

        if response:
            print('got response back:')
            print(response)
        else:
            print('error!')
