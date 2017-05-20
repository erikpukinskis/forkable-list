var runTest = require("run-test")(require)

runTest(
  "works",
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

    done()
  }
)
