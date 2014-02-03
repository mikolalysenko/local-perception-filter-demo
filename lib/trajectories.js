"use strict"

module.exports = StateTrajectories

var bsearch = require("binary-search-bounds")
var hermite = require("cubic-hermite")


function createId() {
  return (Math.random() * (1<<10))|0
}

function State(x, v, t, event) {
  this.x = x
  this.v = v
  this.t = t
  this.event = event
}

function StateTrajectories() {
  this.counter = 0
  this.id = createId() << 20
  this.particles = {}
  this.numIters = 5
}

var proto = StateTrajectories.prototype

proto.createParticle = function(id, x, v, t) {
  if(!id) {
    id = this.id + (this.counter++)
  }
  this.particles[id] = [ new State(x, v, t, "create") ]
  return id
}

proto.moveParticle = function(id, x, v, t) {
  this.particles[id].push(new State(x, v, t))
}

proto.destroyParticle = function(id, x, v, t) {
  this.particles[id].push(new State(x, v, t, "destroy"))
}

function testState(a, t) {
  return a.t - t
}

function getState(trajectory, t) {
  var idx = bsearch.le(trajectory, t, testState)
  if(idx < 0) {
    return new State(trajectory[0].x.slice(), trajectory[0].v.slice(), t, "create")
  }
  if(idx === trajectory.length - 1) {
    var a = trajectory[idx]
    if("destroy" === a.event) {
      return new State(trajectory[idx].x.slice(), [0,0], t, "destroy")
    }
    var dt = t - a.t
    var nx = [a.x[0] + a.v[0] * dt, a.x[1] + a.v[1] * dt]
    return new State(nx, a.v.slice(), t)
  }
  var a = trajectory[idx]
  var b = trajectory[idx+1]
  var dt = (t - a.t) / (b.t - a.t)
  return new State(
    hermite(a.x, a.v, b.x, b.v, dt), 
    hermite.derivative(a.x, a.v, b.x, b.v, dt),
    t)
}

proto.getParticle = function(id, t) {
  return getState(this.particles[id], t)
}

proto.getState = function(lpf) {
  var t0 = lpf(0, 0)
  var states = {}
outer_loop:
  for(var id in this.particles) {
    var trajectory = this.particles[id]
    var s = getState(trajectory, t0)
    for(var i=0; i<this.numIters; ++i) {
      var t = lpf(s.x[0], s.x[1])
      if(s.event === "create") {
        if(t < s.t) {
          break
        }
      }
      if(s.event === "destroy") {
        if(s.t < t) {
          continue outer_loop
        }
      }
      s = getState(trajectory, t)
    }
    states[id] = s
  }
  return states
}

proto.listen = function(events) {
  var state = this
  events.on("create", this.createParticle.bind(this))
  events.on("move", this.moveParticle.bind(this))
  events.on("destroy", this.destroyParticle.bind(this))
}