'''
Going to be used to generate the HTML templates for:
1. Weekly Surveys
2. Season Surveys
'''

import os
import json
from string import Template
from utilLogger import utilLogger
from pathlib import Path
from UTILS import *
import CONSTS
from AppDb import AppDb

class TemplateGenerator:
    tgLogger = None
    appDb = None
    QUEENS_DIR = "queens"
    TEMPLATE_DIR = "templates"
    REG_OUTPUT_DIR = "output/Registration"
    WEEKLY_SURVEY_OUT_DIR = "output/WeeklySurvey"
    REACT_IMG_DIR = "src/components/data/queens"
    SWIFT_DIR = "" # TO DO #

    def __init__(self):
        self.tgLogger = utilLogger()
        self.appDb = AppDb('./config.json')


    ################################################ WEEKLY SURVEY #########################################################################
    # makes directory for weekly survey #
    def makeWeeklySurveyDir(self, franchise: str, season: str, episode: int) -> bool:
        if episode <= 0:
            self.tgLogger.addMessage(f"TemplateGenerator.makeWeeklySurveyDir() -> episode number must be > 1")
            return False
        
        dirPath = f"{self.QUEENS_DIR}/{franchise}/Season {season}/{episode}"
        self.tgLogger.addMessage(f"TemplateGenerator.makeWeeklySurveyDir() -> making path {dirPath}")
        try:
            Path(dirPath).mkdir(parents=True, exist_ok=True)
            self.tgLogger.addMessage(f"TemplateGenerator.makeWeeklySurveyDir() -> made path!")
            return True
        except Exception as e:
            self.tgLogger.addMessage(f"TemplateGenerator.makeWeeklySurveyDir() -> exception thrown: {e}")
            return False
        
    # returns json file contents of weekly survey config #
    def loadQueenEpisodeData(self, Franchise: str, Season: int, Episode: int):
        Season = f"Season {str(Season)}"
        self.tgLogger.addMessage(f"TemplateGenerator.loadQueenEpisodeData() -> looking for {Season} in the {Franchise} directory")
        filename = f"{self.QUEENS_DIR}/{Franchise}/{Season}/{Episode}"
        self.tgLogger.addMessage(f"TemplateGenerator.loadQueenEpisodeData() -> full filepath should be here: {filename}")

        totalFilepath = os.getcwd() + "/" + filename
        if not os.path.exists(totalFilepath):
            self.tgLogger.addMessage(f"TemplateGenerator.loadQueenEpisodeData() -> file not found here: {totalFilepath}")
            return
        
        data = None
        try:
            with open(totalFilepath, 'r') as jsonFile:
                data = json.load(jsonFile)
                self.tgLogger.addMessage(f"TemplateGenerator.loadQueenEpisodeData() -> successfully read json file")
                return data
        except Exception as e:
            self.tgLogger.addMessage(f"TemplateGenerator.loadQueenEpisodeData() -> exception thrown when reading file: {e}")
            return None
    
    # makes the weekly survey template with links and all #
    # TODO: ? add 'output' dir to dictate what i need to move to the UIs #
    def makeWeeklySurveyTemplate(self, franchise, season, episode):
        # read config file #
        weeklySurveyData = self.loadQueenData(franchise, season, episode)
        if not weeklySurveyData:
            self.tgLogger.addMessage(f"TemplateGenerator.makeWeeklySurveyTemplate() -> error reading Queen Config File")
            return
        
        # fill template #
        # move copies to output/ #
    
    ################################################ LEAGUE REGISTRATION #########################################################################
    
    # makes directory for league registration #
    def makeLeagueRegistrationDir(self, franchise: str, season: int) -> bool:
        dirPath = f"{self.QUEENS_DIR}/{franchise}/Season {season}/Registration"
        self.tgLogger.addMessage(f"TemplateGenerator.makeLeagueRegistrationDir() -> making path {dirPath}")
        try:
            Path(dirPath).mkdir(parents=True, exist_ok=True)
            self.tgLogger.addMessage(f"TemplateGenerator.makeLeagueRegistrationDir() -> path made!")
            return True
        except Exception as e:
            self.tgLogger.addMessage(f"TemplateGenerator.makeLeagueRegistrationDir() -> exception thrown: {e}")
            return False
    
    # if the images are dropped into the directory first, can generate the json file #
    def makeLeagueRegistrationFile(self, franchise: str, season: int) -> bool:
        dirPath = f"{self.QUEENS_DIR}/{franchise}/Season {season}/Registration"
        queensData = []
        if os.path.exists(dirPath):
            files = None
            try:
                files = os.listdir(dirPath)
                idCounter = 1
                for file in files:
                    queenName = ''
                    if file.split('.')[1] == 'json':
                        continue
                    else:
                        queenName = file.split('.')[0]
                        queenData = {
                            'id': idCounter,
                            'franchise': franchise,
                            'season': season,
                            'name': queenName,
                            'img': f"{self.REACT_IMG_DIR}/{franchise}/Season {season}/Registration/{file}",
                            'location': 'UNKNOWN',
                            'status': 'ACTIVE'
                        }
                        queensData.append(queenData)
                        idCounter += 1
                try:
                    with open(dirPath+'/Queens.json', 'w') as outFile:
                        json.dump(queensData, outFile, indent=4)
                        return True
                except Exception as e:
                    print('1st exception thrown: ', e)
                    return False
            except Exception as e:
                print('2nd exception thrown: ', e)
                return False
    
    # add queens to Queen db table #
    def addNewQueensToTable(self, franchise, season) -> bool:
        data = self.loadQueenRegistrationData(franchise, season)

        if data is None:
            self.tgLogger.addMessage(f"TemplateGenerator.addNewQueensToTable() -> data is None, returning False")
            return False
        
        for record in data:
            del record['id']
            del record['img']
        
        self.appDb.addNewQueensToTable("Queen", data=data)
        return True
    
    # returns json data for league registration view #
    def loadQueenRegistrationData(self, Franchise: str, Season: int):
        dirPath = f"{self.QUEENS_DIR}/{Franchise}/Season {Season}/Registration"
        self.tgLogger.addMessage(f"TemplateGenerator.loadQueenRegistrationData() -> going to read {dirPath}")
        if not os.path.exists(dirPath):
            self.tgLogger.addMessage(f"TemplateGenerator.loadQueenRegistrationData() -> path doesn't exist")
            return None
        
        with open(dirPath+'/Queens.json', 'r') as File:
            data = json.load(File)
            if not data:
                self.tgLogger.addMessage(f"TemplateGenerator.loadQueenRegistrationData() -> failed to read data from file")
                return None
            self.tgLogger.addMessage(f"TemplateGenerator.loadQueenRegistrationData() -> successfully read file")
            return data
    
    # makes the League Registration Template, where users can select their queens and teams #
    def makeLeagueRegistrationTemplate(self, franchise, season):
        # read config file #
        leagueRegistrationData = self.loadQueenData(franchise, season, 0) # drafting should occurr after meet the queens/first looks (episode 0)
        if not leagueRegistrationData:
            self.tgLogger.addMessage(f"TemplateGenerator.makeLeagueRegistrationTemplate() -> error reading queen config file")
            return
        
        # fill template #
        # move copies to output/ #
    
    ######################################### SEASON SURVEY #########################################
    def makeSeasonSurveyTemplate(self):
        pass

    ##################################### HELPER FUNCTIONS ######################################
    # fills out template file #
    def fillTemplateFile(self):
        pass

    # moves files to output dir #
    def moveContentToOutput(self):
        pass

    # writes manifesto for output drop #
    def writeManifesto(self, content: str, directory: str):
        pass







