var runTest = require("run-test")(require)

runTest(
  "iterate",
  ["./"],
  function(expect, done, forkableList) {
    var list = forkableList(["abra", "ca", "dabra"])
    var spell = ""
    list.forEach(function(item) {
      spell += item
    })
    expect(spell).to.equal("abracadabra")
    done()
  }
)

runTest(
  "join",
  ["./"],
  function(expect, done, forkableList) {
    var list = forkableList(["a", "list"])

    function toLength(word) {
      return word.length
    }

    expect(list.map(toLength)).to.eql([1,4])
    done.ish("map")

    expect(list.join("-")).to.eql("a-list")

    expect(forkableList([]).join("blah")).to.equal("")

    done()
  }
)



runTest(
  "splice relative",
  ["./"],
  function(expect, done, forkableList) {

    var list = forkableList(["one", "two", "three"])

    list.spliceRelativeTo("three", "before", 0, "and'a")

    expect(list.values()).to.eql(["one", "two", "and'a", "three"])

    done()
  }
)



runTest(
  "skipping ahead",
  ["./"],
  function(expect, done, forkableList) {
    var list = forkableList()
    list.set(2, "blah")
    list.set(0, "foop")
    expect(list.length).to.equal(3)

    expect(list.values()).to.eql(["foop", undefined, "blah"])
    done()
  }
)


runTest(
  "length after forking",
  ["./"],
  function(expect, done, forkableList) {
    var alphabet = forkableList(["a", "b", "c", "d"])

    var spell = alphabet.fork()

    alphabet.set(4, "e")
    alphabet.splice(5, 0, "f", "g")

    expect(alphabet.length).to.equal(7)
    done()
  }
)


runTest(
  "inserting in a later segment",
  ["./"],
  function(expect, done, forkableList) {
    var list = forkableList(["do"])
    expect(list.length).to.equal(1)
    done.ish("added an item")

    var fork = list.fork()
    fork.set(2, "mi")
    expect(fork.values()).to.eql(["do", undefined , "mi"])
    expect(fork.length).to.equal(3)
    done.ish("fork has new item and gap")

    fork.set(1, "re")
    expect(fork.values()).to.eql(["do", "re", "mi"])
    expect(fork.segments[1].store).to.eql(["re", "mi"])
    done.ish("filled the gap on the fork")

    list.set(1, "ray")
    expect(list.values()).to.eql(["do", "ray"])

    done()
  }
)


runTest(
  "splice twice in the middle",
  ["./"],
  function(expect, done, forkableList) {
    var original = forkableList(["do", "fa"])
    expect(original.length).to.equal(2)
    var fork = original.fork()

    fork.splice(1, 0, "re")
    expect(fork.values()).to.eql(["do", "re", "fa"])
    done.ish("splice one in the middle")

    fork.splice(2, 0, "mi")
    expect(fork.values()).to.eql(["do", "re", "mi", "fa"])
    expect(fork.segments.length).to.equal(3)
    expect(fork.segments[1].store).to.eql(["re", "mi"])
    done.ish("spliced another")

    var next = original.next()
    expect(next).to.equal(2)
    original.set(2, "blah")
    expect(original.values()).to.eql(["do", "fa", "blah"])

    done()
  }
)

runTest(
  "forking",
  ["./"],
  function(expect, done, forkableList) {
    var odd = forkableList()

    odd.set(odd.next(), "one")
    expect(odd.length).to.equal(1)
    expect(odd.values()).to.eql(["one"])
    done.ish("set one at next available position")

    odd.set(odd.next(), "three")
    expect(odd.values()).to.eql(["one", "three"])
    done.ish("set again")

    var numbers = odd.fork()
    numbers.splice(1, 0, "two")
    expect(numbers.values()).to.eql(["one", "two", "three"])
    done.ish("splicing after two sets")

    numbers.next() // just to test this code path

    debugger
    odd.set(odd.next(), "five")
    expect(odd.values()).to.eql(["one", "three", "five"])
    done.ish("original list is unaffected")

    done()
  }
)


runTest(
  "initialize from array",
  ["./"],
  function(expect, done, forkableList) {
    var some = forkableList(["doing", "the", "most"])
    expect(some.values()).to.eql(["doing", "the", "most"])
    done()
  }
)


runTest(
  "find",
  ["./"],
  function(expect, done, forkableList) {
    var list = forkableList(["a", "b", "c"])

    expect(list.find("c")).to.equal(2)
    done()
  }
)



