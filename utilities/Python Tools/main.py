from QueenOps import QueenOps
from TemplateGenerator import TemplateGenerator
import os
from utilLogger import utilLogger
import time

# instantiations #
mainLogger = utilLogger()
queenOps = QueenOps()
tempGen = TemplateGenerator()

# add a new record to the weekly_update.json file #
# run this, then fill the data out #
def addBlankWeeklyUpdateRecord(franchise, season, episode):
    mainLogger.addMessage(f"addBlankWeeklyUpdateRecord() -> adding record for {franchise}/{season}/{episode}")
    if not queenOps.addBlankRecord(franchise, season, episode):
        mainLogger.addMessage(f"addBlankWeeklyUpdateRecord() -> failed to add record")
        raise Exception("Error in addBlankWeeklyUpdateRecord")
    mainLogger.addMessage(f"addBlankWeeklyUpdateRecord() -> successfully added new record")

# main for sending weekly update #
# run addBlankWeeklyUpdateRecord first #
# modify the data in data/weekly_update.json#
# then run this to send to server #
def sendWeeklyUpdate(franchise, season, episode):
    filename = 'data/weekly_update.json'
    # updates data field inside queenOps class #
    if not queenOps.readWeeklyUpdateFile(filename):
        mainLogger.addMessage(f"main.py.sendWeeklyUpdate() -> error with queenOps.readWeeklyUpdateFile()")
        return
    # maybe add data verification step here, before sending the update #
    if not queenOps.sendWeeklyUpdate(franchise, season, episode):
        mainLogger.addMessage(f"main.py.sendWeeklyUpdate() -> error sending weekly update")
        return
    mainLogger.addMessage(f"main.py.sendWeeklyUpdate() -> sent weekly update")
    return

# make league registration dir #
# then populate with json data file and images #
def makeLeagueRegistrationDir(franchise, season):
    if not tempGen.makeLeagueRegistrationDir(franchise, season):
        mainLogger.addMessage(f"main.py.makeLeagueRegistrationDir() -> failed to make dir")
        return
    mainLogger.addMessage(f"main.py.makeLeagueRegistrationDir() -> made new directory")

# make weekly survey dir #
# then populate with json data file and images #
def makeWeeklySurveyDir(franchise, season, episode):
    if episode <= 0:
        mainLogger.addMessage(f"main.py.makeWeeklySurveyDir() -> episode must be > 0")
        return
    if not tempGen.makeWeeklySurveyDir(franchise, season, episode):
        mainLogger.addMessage(f"main.py.makeWeeklySurveyDir() -> failed to make directory")
        return
    
    mainLogger.addMessage(f"main.py.makeWeeklySurveyDir() -> successfully made directory")

# main for making LeagueRegistration Component #
def makeLeagueRegistrationDrop(franchise: str, season: int):
    if not tempGen.loadQueenRegistrationData(franchise, season):
        mainLogger.addMessage(f"main.py.makeLeagueRegistrationDrop() -> failed to make dir")
        return
    mainLogger.addMessage(f"main.py.makeLeagueRegistrationDrop() -> successfully made directory for {franchise}, season {season}")

# main for making the weekly survey drop #
def makeWeeklySurveyDrop(franchise: str, season: int, episode: int):
    if episode <= 0:
        mainLogger.addMessage(f"main.py.makeWeeklySurveyDrop() -> episode must be > 0")
        return

if __name__ == '__main__':
    # TODO: Can incorporate argparser here, or python wheel, or both #
    # sendWeeklyUpdate("USA", 18, 1)
    # makeLeagueRegistrationDrop("USA", 18)
    # makeLeagueRegistrationDir("Canada", 99)
    makeWeeklySurveyDir("USA All Stars", 11, 1)
    time.sleep(5)