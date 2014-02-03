"use strict"

module.exports = LocalChannel

var EventEmitter = require("events").EventEmitter

function LocalChannel(lag) {
  this.lag = lag
  this.events = new EventEmitter()
}

var proto = LocalChannel.prototype

proto.send = function() {
  var args = Array.prototype.slice.call(arguments)
  var events = this.events
  setTimeout(function() {
    events.emit.apply(events, args)
  }, this.lag)
}