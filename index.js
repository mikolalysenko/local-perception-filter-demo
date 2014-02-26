"use strict"

var createShell = require("game-shell")
var createServer = require("./lib/server")
var renderState = require("./lib/render-state")

var tickRate = 50
var moveSpeed = 0.25
var shootSpeed = 1.0

var shell = createShell({ 
  element: "gameContainer",
  tickRate: tickRate 
})
var server = createServer(tickRate)
var players = [null, null]
var serverCanvas = null
var playerCanvases = [null, null]
var latencyFilter = ["Strict", "Strict"]

var useGL = true

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

function makeCanvas(element) {
  var canvas = document.getElementById(element)
  var ctx = canvas.getContext("2d")
  ctx.translate(canvas.width/2, canvas.height/2)
  ctx.scale(canvas.width/20, canvas.height/20)
  return ctx
}

function addLagListener(lagElement, player) {
  player.setLag(lagElement.value|0)
  lagElement.addEventListener("change", function() {
    player.setLag(lagElement.value|0)
  })
}

function addFilterListener(filterElement, player) {
  function updateFilter() {
    latencyFilter[player] = filterElement.value
  }
  filterElement.addEventListener("change", updateFilter)
  updateFilter()
}

shell.on("init", function() {
  shell.element.tabindex = 1
  players = [
    server.createClient(100, [-1, 0]),
    server.createClient(100, [ 1, 0])
  ]
  players[0].lastVelocity = [ 1, 0]
  players[1].lastVelocity = [-1, 0]

  //Fix up input stuff
  document.body.style.overflow = ""
  document.body.style.height = ""

  //Create canvases for players and server
  serverCanvas = makeCanvas("serverCanvas")
  
  //Attach listeners for players
  for(var i=0; i<2; ++i) {
    var playerStr = "player" + (i+1)
    playerCanvases[i] = makeCanvas(playerStr + "Canvas")
    var lagTime = document.getElementById(playerStr + "Lag")
    addLagListener(lagTime, players[i])
    var latencyFilter = document.getElementById(playerStr + "Filter")
    addFilterListener(latencyFilter, i)
  }

  var moveInput = document.getElementById("moveSpeed")
  moveInput.addEventListener("change", function() {
    moveSpeed = +moveInput.value
  })
  moveSpeed = +moveInput.value

  var shootInput = document.getElementById("particleSpeed")
  shootInput.addEventListener("change", function() {
    shootSpeed = +shootInput.value
  })
  shootSpeed = +shootInput.value

  var tickInput = document.getElementById("tickRate")
  tickInput.addEventListener("change", function() {
    server.setTickRate(tickInput.value|0)
    tickRate = tickInput.value|0
  })
  server.setTickRate(tickInput.value|0)
  tickRate = tickInput.value|0
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
  for(var i=0; i<2; ++i) {
    var local = players[i]
    var remote = players[i^1]
    var tl = local.localTick()
    var tr = tl - 2.0 * remote.lag / tickRate
    if(latencyFilter[i] === "Strict") {
      renderState(playerCanvases[i], players[i], function(x, y) {
        return tr
      })
    } else {
      var remoteP = local.state.getParticle(remote.character, tr)
      if(latencyFilter[i] !== "Optimistic" && remoteP) {
        var remoteX = remoteP.x
        var localX = local.state.getParticle(local.character, tl).x
        var c = 2 * Math.max(shootSpeed, moveSpeed)
        renderState(playerCanvases[i], players[i], function(x, y) {
          var dx = x - remoteX[0]
          var dy = y - remoteX[1]
          var d = Math.sqrt(dx * dx + dy * dy) / c
          return Math.min(tr + d - 1, tl)
        })
      } else {
        renderState(playerCanvases[i], players[i], function(x, y) {
          return tl
        })
      }
    }
  }
})