from QueenOps import QueenOps
from TemplateGenerator import TemplateGenerator
import os
from utilLogger import utilLogger
import time

# instantiations #
mainLogger = utilLogger()
queenOps = QueenOps()
tempGen = TemplateGenerator()

# main for sending weekly update #
def sendWeeklyUpdate(franchise, season, episode):
    filename = 'data/episode_data.json'
    # updates data field inside queenOps class #
    if not queenOps.readWeeklyUpdateFile(filename):
        mainLogger.addMessage(f"main.py.sendWeeklyUpdate() -> error with queenOps.readWeeklyUpdateFile()")
        return
    
    if not queenOps.sendWeeklyUpdate(franchise, season, episode):
        mainLogger.addMessage(f"main.py.sendWeeklyUpdate() -> error sending weekly update")
        return
    mainLogger.addMessage(f"main.py.sendWeeklyUpdate() -> sent weekly update")
    return

# main for making LeagueRegistration Component #
def makeLeagueRegistrationDrop():
    pass

# main for making the weekly survey drop #
def makeWeeklySurveyDrop():
    pass

if __name__ == '__main__':
    # TODO: Can incorporate argparser here, or python wheel, or both #
    sendWeeklyUpdate("USA", 18, 1)
    time.sleep(5)