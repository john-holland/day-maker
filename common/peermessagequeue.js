import * as messaging from "messaging";
import { peerSocket } from "messaging";
const SEND_MESSAGE_INTERVAL = 15 * 60 * 1000

export class PeerMessageQueue {
  messageQueue = []
  queueId = undefined

  constructor() {
    
  }
  
  sendMessage(data) {
    if (peerSocket.readyState === peerSocket.OPEN) {      
      try {
        let nonSentData = this.getNonSentData()
        peerSocket.send(data)
        return true
      } catch (e) {
        this.messageQueue.push(data)
        this.queueId = setInterval(() => sendMessage(this.messageQueue.unshift(), SEND_MESSAGE_INTERVAL))
        return false
      }
    }
  }

  serviceQueue() {
    this.queueId = setInterval(() => sendMessage(this.messageQueue.unshift(), SEND_MESSAGE_INTERVAL))
  }
}