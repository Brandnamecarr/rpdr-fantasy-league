'''
Going to be used to generate the HTML templates for:
1. Weekly Surveys
2. Season Surveys
'''

import os
import json
from string import Template
from utilLogger import utilLogger

class TemplateGenerator:
    tgLogger = None
    QUEENS_DIR = "queens"
    TEMPLATE_DIR = "templates"

    def __init__(self):
        self.tgLogger = utilLogger()
    
    # returns json file contents of weekly survey config #
    def loadQueenData(self, Franchise: str, Season: int, Episode: int):
        Season = f"Season {str(Season)}"
        self.tgLogger.addMessage(f"TemplateGenerator.loadQueenData() -> looking for {Season} in the {Franchise} directory")
        filename = f"{self.QUEENS_DIR}/{Franchise}/{Season}/{Episode}"
        self.tgLogger.addMessage(f"TemplateGenerator.loadQueenData() -> full filepath should be here: {filename}")

        totalFilepath = os.getcwd() + "/" + filename
        if not os.path.exists(totalFilepath):
            self.tgLogger.addMessage(f"TemplateGenerator.loadQueenData() -> file not found here: {totalFilepath}")
            return
        
        data = None
        try:
            with open(totalFilepath, 'r') as jsonFile:
                data = json.load(jsonFile)
                self.tgLogger(f"TemplateGenerator.loadQueenData() -> successfully read json file")
                return data
        except Exception as e:
            self.tgLogger(f"TemplateGenerator.loadQueenData() -> exception thrown when reading file: {e}")
            return None
    
    # fills out template file #
    def fillTemplateFile(self):
        pass

    # moves files to output dir #
    def moveContentToOutput(self):
        pass

    # writes manifesto for output drop #
    def writeManifesto(self, content: str):
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

