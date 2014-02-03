"use strict"

module.exports = function(tr) {
  return new Server(tr)
}

var Client = require("./client.js")
var StateTrajectories = require("./trajectories.js")
var Channel = require("./local-channel.js")

function Server(tickRate) {
  this.tickCount = 0
  this.tickRate = tickRate
  this.state = new StateTrajectories()
  this.clientEvents = []
  this.clientChannels = []
  this.tickInterval = setInterval(this.tick.bind(this), tickRate)
}

var proto = Server.prototype

proto.createClient = function(lag, x) {
  var toClient = new Channel(lag)
  var fromClient = new Channel(lag)
  this.clientEvents.push(fromClient.events)
  this.state.listen(fromClient.events)
  var bcast = this.broadcast.bind(this)
  fromClient.events.on("create", function(id, x, v, t) {
    bcast(["create", id, x, v, t], toClient)
  })
  fromClient.events.on("move", function(id, x, v, t) {
    bcast(["move", id, x, v, t], toClient)
  })
  fromClient.events.on("delete", function(id, x, v, t) {
    bcast(["delete", id, x, v, t], toClient)
  })
  this.clientChannels.push(toClient)
  var client = new Client(this.tickCount, this.tickRate, fromClient, toClient.events)
  var curTime = this.tickCount
  var cparticles = this.state.getState(function(x,y) {
    return curTime
  })
  for(var id in cparticles) {
    var p = cparticles[id]
    toClient.send("create", id|0, p.x, p.v, curTime)
  }
  client.createCharacter(x)
  return client
}

proto.broadcast = function(msg, skip) {
  for(var i=0; i<this.clientChannels.length; ++i) {
    if(this.clientChannels[i] === skip) {
      continue
    }
    this.clientChannels[i].send.apply(this.clientChannels[i], msg)
  }
}

proto.tick = function() {
  this.tickCount += 1
  this.broadcast(["tick", this.tickCount])
}