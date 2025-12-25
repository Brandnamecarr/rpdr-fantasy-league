'''
This file is going to help automate the following components:
1. Weekly Updates

'''
from utilLogger import utilLogger
import json
from appTypes import *

import os
import json
import requests

class QueenOps:
    _token = f"Bearer "
    dataFile = "data/episode_data.json"
    weeklyUpdateData = None
    queenOpsLogger = None

    def __init__(self):
        self.queenOpsLogger = utilLogger()
    
    def addBlankRecord(self, filename: str, franchise: str, season: int, episode: int) -> bool:
        data = None
        # read the config file #
        with open(filename, 'r') as weeklyUpdateDataFile:
            data = json.load(weeklyUpdateDataFile)

            if not data or len(data) <= 0:
                return False
        
        # make the new, blank record #
        newRecord = {
            "Franchise": franchise,
            "Season": season,
            "Episode Number": episode,
            "maxiWinner": "", 
            "isSnatchGame": "", 
            "miniWinner": "", 
            "topQueens": [], 
            "safeQueens": [], 
            "bottomQueens": [], 
            "linSyncWinner": "", 
            "eliminated": ""
        }

        # add the new record to the data
        data.append(newRecord)
        with open(filename, 'w') as weeklyUpdateDataFile:
            try:
                json.dump(data, weeklyUpdateDataFile, indent=4)
                return True
            except Exception as e:
                queenOpsLogger.addMessage(f"addBlankRecord() -> exception thrown: {e}")
                return False


    # read weekly update file #
    def readWeeklyUpdateFile(self, filename: str) -> bool:
       
        filename = os.getcwd() + '/' + filename
        self.queenOpsLogger.addMessage(f"QueenOps.readWeeklyFileUpdate() -> reading {filename}")
        try:
            with open(filename, 'r') as inFile:
                self.weeklyUpdateData = json.load(inFile)
                self.queenOpsLogger.addMessage(f"QueenOps.readWeeklyFileUpdate() -> successfully read data and initialized weeklyUpdateData")
                return True
        except Exception as e:
            self.queenOpsLogger.addMessage(f"QueenOps.readWeeklyFileUpdate() -> failed to read data, returning False")
            return False


    # sends data to the weekly update route #
    def sendWeeklyUpdate(self, Franchise: str, Season: int, EpisodeNum: int) -> bool:
        update = self.gatherWeeklyUpdateData(Franchise, Season, EpisodeNum)
        if update is None:
            self.queenOpsLogger.addMessage(f"QueenOps.sendWeeklyUpdateData() -> update is None, returning False")
            return False
        update = update[0]
        
        requiredKeys = ["Franchise", "Season", "Episode Number", "maxiWinner", "isSnatchGame", "miniWinner", "topQueens", "safeQueens", "bottomQueens", "linSyncWinner", "eliminated"]
        
        if update is not None:
            if all(key in update for key in requiredKeys):
                self.queenOpsLogger.addMessage(f"QueenOps.sendWeeklyUpdateData() -> SEND UPDATE for episode {update['Episode Number']} of szn {update['Season']} of RPDR-{update['Franchise']}")
                return True
            else:
                print('ERROR')
                return False

    def gatherWeeklyUpdateData(self, Franchise: str, Season: int, EpisodeNum: int):
        matchingData = [ 
            item for item in self.weeklyUpdateData
            if item['Franchise'] == Franchise
            and item['Season'] == Season
            and item['Episode Number'] == EpisodeNum
        ]
        if len(matchingData) > 0:
            return matchingData
        else:
            return None
    