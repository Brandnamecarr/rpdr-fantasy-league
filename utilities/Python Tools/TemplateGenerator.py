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

class TemplateGenerator:
    tgLogger = None
    QUEENS_DIR = "queens"
    TEMPLATE_DIR = "templates"
    REACT_IMG_DIR = "src/components/data/queens/"
    SWIFT_DIR = "" # TO DO #

    def __init__(self):
        self.tgLogger = utilLogger()
    
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

    # returns json data for league registration view #
    def loadQueenRegistrationData(self, Franchise: str, Season: int) -> bool:
        REGISTRATION_DIR = "Registration"
        dirPath = f"{self.QUEENS_DIR}/{Franchise}/Season {Season}/{REGISTRATION_DIR}"
        self.tgLogger.addMessage(f"TemplateGenerator.loadQueenRegistrationData() -> going to read {dirPath}")
        if os.path.exists(dirPath):
            self.tgLogger.addMessage(f"TemplateGenerator.loadQueenRegistrationData() -> {dirPath} exists!")
            return True
        else:
            self.tgLogger.addMessage(f"TemplateGenerator.loadQueenRegistrationData() -> returning false")
            return False

    # fills out template file #
    def fillTemplateFile(self):
        pass

    # moves files to output dir #
    def moveContentToOutput(self):
        pass

    # writes manifesto for output drop #
    def writeManifesto(self, content: str, directory: str):
        pass

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

    # makes the League Registration Template, where users can select their queens and teams #
    def makeLeagueRegistrationTemplate(self, franchise, season):
        # read config file #
        leagueRegistrationData = self.loadQueenData(franchise, season, 0) # drafting should occurr after meet the queens/first looks (episode 0)
        if not leagueRegistrationData:
            self.tgLogger.addMessage(f"TemplateGenerator.makeLeagueRegistrationTemplate() -> error reading queen config file")
            return
        
        # fill template #
        # move copies to output/ #

    def makeSeasonSurveyTemplate(self):
        pass

