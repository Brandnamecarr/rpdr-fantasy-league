'''
    TestResult class to track if tests are passing or failing
    used in test.py
'''

class TestResult:
    test_name: str = ''
    test_result: bool = False
    detail_str: str = ''

    def __init__(self, name, result, detail):
        self.test_name = name
        self.test_result = result
        self.detail_str = detail
    
    def getResult(self) -> str:
        if self.test_result:
            return f"Test {self.test_name} has PASSED"
        else:
            return f"Test {self.test_name} FAILED\n\t Detail: {self.detail_str}"