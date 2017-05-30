var runTest = require("run-test")(require)

// runTest.only("skipping ahead")
// runTest.only("inserting in a later segment")
runTest.only("splice twice in the middle")

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
    var list = forkableList(["do", "fa"])
    var fork = list.fork()

    fork.splice(1, 0, "re")
    expect(fork.values()).to.eql(["do", "re", "fa"])
    done.ish("splice one in the middle")

    debugger
    fork.splice(2, 0, "mi")
    expect(fork.segments.length).to.equal(3)
    expect(fork.segments[1].store).to.equal(["re", "mi"])
    expect(fork.values()).to.eql(["do", "re", "mi", "fa"])
    done.ish("spliced another")

    var next = orig.next()
    expect(next).to.equal(2)
    orig.set(2, "blah")
    expect(orig.values()).to.eql(["do", "fa", "blah"])

    done()
  }
)

runTest(
  "forking",
  ["./"],
  function(expect, done, forkableList) {
    var odd = forkableList()

    odd.set(odd.next(), "one")
    odd.set(odd.next(), "three")

    var numbers = odd.fork()
    numbers.splice(1, 0, "two")

    odd.set(odd.next(), "five")

    expect(odd.values()).to.eql(["one", "three", "five"])

    done.ish("original list is unaffected")

    expect(numbers.values()).to.eql(["one", "two", "three"])

    numbers.next() // just to test this code path

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

