"use strict"

module.exports = drawState

var hashInt = require("hash-int")
var pad = require("pad")

function drawState(context, client, lpf) {
  var particles = client.state.getState(lpf)
  context.fillStyle = "#000000"
  context.fillRect(-10, -10, 20, 20)
  for(var id in particles) {
    var color = (hashInt(id|0)>>>0) & 0xffffff
    var p = particles[id]
    context.fillStyle = "#" + pad(6, color.toString(16), "0")
    context.beginPath()
    context.arc(p.x[0], p.x[1], 0.5, 0, Math.PI * 2, true)
    context.closePath()
    context.fill()
  }
}