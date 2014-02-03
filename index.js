"use strict"

var createShell = require("game-shell")
var createServer = require("./lib/server")
var renderState = require("./lib/render-state")

var tickRate = 50
var moveSpeed = 0.25
var shootSpeed = 1.0

var shell = createShell({ tickRate: tickRate })
var server = createServer(tickRate)
var players = [null, null]
var serverCanvas = null
var playerCanvases = [null, null]

//Bind keys
shell.bind("left-1", "A")
shell.bind("right-1", "D")
shell.bind("up-1", "W")
shell.bind("down-1", "S")
shell.bind("shoot-1", "Q")

shell.bind("left-2", "left")
shell.bind("right-2", "right")
shell.bind("up-2", "up")
shell.bind("down-2", "down")
shell.bind("shoot-2", "space")

function makeCanvas() {
  var canvas = document.createElement("canvas")
  canvas.width = 300
  canvas.height = 300
  shell.element.appendChild(canvas)
  var ctx = canvas.getContext("2d")
  ctx.translate(canvas.width/2, canvas.height/2)
  ctx.scale(canvas.width/20, canvas.height/20)
  return ctx
}

shell.on("init", function() {
  players = [
    server.createClient(100, [-1, 0]),
    server.createClient(100, [ 1, 0])
  ]
  players[0].lastVelocity = [ 1, 0]
  players[1].lastVelocity = [-1, 0]

  //Create canvases for players and server
  serverCanvas = makeCanvas()
  playerCanvases[0] = makeCanvas()
  playerCanvases[1] = makeCanvas()
})

//Handle inputs
shell.on("tick", function() {
  for(var i=1; i<=2; ++i) {
    var v = [0,0]
    if(shell.wasDown("left-" + i)) {
      v[0] -= 1
    }
    if(shell.wasDown("right-" + i)) {
      v[0] += 1
    }
    if(shell.wasDown("up-" + i)) {
      v[1] -= 1
    }
    if(shell.wasDown("down-" + i)) {
      v[1] += 1
    }
    var vm = v[0] * v[0] + v[1] * v[1]
    if(vm > 1e-6) {
      v[0] *= moveSpeed / Math.sqrt(vm)
      v[1] *= moveSpeed / Math.sqrt(vm)
    }
    players[i-1].setVelocity(v)
    if(shell.press("shoot-" + i)) {
      players[i-1].shoot(shootSpeed)
    }
  }
})

//Render state
shell.on("render", function(dt) {
  renderState(serverCanvas, server, function(x, y) {
    return server.tickCount
  })
  renderState(playerCanvases[0], players[0], function(x, y) {
    return players[0].localTick()
  })
  renderState(playerCanvases[1], players[1], function(x, y) {
    return players[1].localTick()
  })
})