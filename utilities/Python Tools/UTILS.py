import requests
from CONSTS import *
from utilLogger import utilLogger

logger = utilLogger()

def sendDataToServer(url, data, token):
    # guard rail against no url in params #
    if not url:
        logger.addMessage(f"UTILS.sendDataToServer() -> url not provided in params")
        return
    
    # header obj
    header = {
        'Content-Type': 'application/json'
    }
    # TODO: circumvent token right now #
    if token:
        header['Authorization'] = f"Bearer {token}"
    
    try:
        response = requests.post(url, headers=header, json=data)
        logger.addMessage(f"UTILS.sendDataToServer() -> got back response: {response}")
        logger.addMessage(f"UTILS.sendDataToServer() -> returning {response.json}")
        return response.json
    except Exception as e:
        logger.addMessage(f"UTILS.sendDataToServer() -> exception thrown below:")
        logger.addMessage(f"UTILS.sendDataToServer() -> {e}")
        return None

def getDataFromServer(url, token):
    # guard rail against url param #
    if not url:
        logger.addMessage(f"UTILS.getDataFromServer() -> url not provided in params")
        return
    
    header = {
        'Content-Type': 'application/json'
    }

    if token:
        header['Authorization'] = f"Bearer {token}"
    
    try:
        response = requests.get(url, headers=header)
        logger.addMessage(f"UTILS.getDataFromServer() -> got back response {response}")
        logger.addMessage(f"UTILS.getDataFromServer() -> returning {response.json}")
        return response.json
    except Exception as e:
        logger.addMessage(f"UTILS.getDataFromServer() -> exception thrown below:")
        logger.addMessage(f"UTILS.getDataFromServer() -> {e}")
        return None
