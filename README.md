**forkable-list** lets you add stuff to an array, and then fork it so that you've got two versions you can add to and splice stuff into, _without_ duplicating the whole array.

```javascript
var forkableList = require("forkable-list")

var alphabet = forkableList(["a", "b", "c", "d"])

var spell = alphabet.fork()

spell.splice(2, 0, "r", "a")
spell.splice(3, 1, "a", "d", "a", "b", "r", "a")

alphabet.set(4, "e")
alphabet.splice(5, 0, "f", "g")

alphabet.values()
// returns ["a", "b", "c", "d", "e", "f". "g"]

spell.join("")
// returns "abracadabra"
```
At this point the original list is stored using a single array. This is what is created in memory:
```javascript
alphabet = {
  "segments": [
    { 
      "mutableAfter": 3,   // <-- this is the original segment
      "store": [
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g"
      ],
      "start": 0,
      "length": 7
    }
  ],
  "length": 5
}
spell = {
  "segments": [
    <<< reference to original segment >>>,
    {
      "mutableAfter": -1,
      "store": [
        null,
        "a",
        "d",
        "a",
        "b",
        "r",
        "a"
      ],
      "start": 0,
      "length": 7
    }
  ],
  "length": 13
}
```
So, it's useful if you want to create a giant array and then make a bunch of forks of it without storing a giant array for every fork. You just store a bunch of little arrays with the changed segments of the fork.

There are bunch of methods for iterating through the list:

```javascript
spell.forEach(function(letter) {
  console.log(letter)
})

spell.length
// returns 11, the length of abracadabra

spell.get(2)
// returns "r", the third letter of abracadabra

spell.find("r")
// returns 2

var codes = spell.map(function(letter) {
  return letter.charCodeAt(0)
})
```

You can also search for an item and splice relative to it:

```javascript
alphabet.spliceRelativeTo("g", "after", 0, "h")
// alphabet is now ["a", "b", "c", "d", "e", "f", "g", "h"]
```

## Why?

You can use to implement an undo feature without keeping a full copy of your data at every save point.

You can also have multiple users making small changes to a document without creating a full copy of each version.

## Isn't this just an immutable array?

Well... sorta.

## Why not use immutable.js

Immutable.js makes a new data structure on *every write*. So if you call `set` 3 times, you get 3 references to unique data structures.

ForkableList only forks the data structure when you explicitly `fork`. In between forks you can `set` and `splice` as many times as you want. It will mutate the underlying segments as long as doing so doesn't modify any of the forks. So pushing 20 items to a list just gives you a 20 item array with a little packaging around it.

Immutable.js is also built of like 100 files and written in ES6, so you have to transpile it to use it in the browser. ForkableList is less than 400 lines of plain old ES5 in a single file. If you want to understand what it's doing and how it performs, you just read that one file.

ForkableList also doesn't let you do too much crazy stuff like deep merging, so you can be reasonably sure of its performance characteristics.

## Won't that still take up a lot of memory if you have lots of discontinuous segments?

Yes, if you make a a lot of discontinuous modifications, like changing every other item, and then fork that X times, it will have to make X arrays that have one reference to each segment. You may want to snapshot arrays if that is a common case for your data:

```javascript
var mixedCase = alphabet.fork()
mixedCase.set(1, "B")
mixedCase.set(3, "D")
mixedCase.set(5, "F")

mixedCase.join("")
// returns "aBcDeFg"
```
This list has 4 segments: a reference to the original abcdefg plus three new segments for the capital letters. If we forked it three times, we'd have three lists with four segments each. If we make a snapshot we have three lists with just one reference to the same segment, using just a little bookkeeping memory:

```javascript
var clean = forkableList(abracadabra.values())
var fork1 = clean.fork()
var fork2 = fork1.fork()
var fork3 = fork2.fork()
```

## SWEET! IMMUTABLE ALL THE THINGS!! AMIRITE?

No, you are wrong. No pattern should be used everywhere, and people who treat immutability like a religion are destined to write bad code. ForkableList is intentionally a blend of mutable and immutable ideas, because it allows you to get fast write performance when changing multiple items in a row while also allowing you to keep multiple references to state.

ForkableList is written this way because I adhere to a different religion: Data Driven Programming. We start by asking, what is the minimum number of operations we must do. We write code that makes it easy to do just those operations, not code which arbitrarily snapshots every action in order to present a "pure" abstraction.
