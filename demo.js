var forkableList = require(".")

var alphabet = forkableList(["a", "b", "c", "d"])

var spell = alphabet.fork()

spell.splice(2, 0, "r", "a")

spell.splice(3, 1, "a")

// expect(spell.join("")).to.equal("abraca")

alphabet.set(4, "e")
alphabet.splice(5, 0, "f", "g")

console.log("alphabet = "+JSON.stringify(alphabet, null, 2))

console.log("spell = "+JSON.stringify(spell, null, 2))

console.log("alphabet:", alphabet.values())

console.log("spell:", spell.values())