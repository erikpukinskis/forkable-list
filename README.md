**forkable-list** lets you add stuff to an array, and then fork it so that you've got two versions you can add to and splice stuff into, _without_ duplicating the whole array.

```javascript
var forkableList = require("forkable-list")

var alphabet = forkableList(["a", "b", "c", "d"])

var spell = alphabet.fork()

spell.splice(2, 0, "r", "a")
spell.splice(3, 1, "a", "d", "a", "b", "r", "a")

alphabet.set(4, "e")
alphabet.splice(5, 0, "f", "g")
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
alphabet.values()
// returns ["a", "b", "c", "d", "e", "f". "g"]

spell.join("")
// returns "abracadabra"

spell.forEach(function(letter) {
  console.log(letter)
})

spell.length
// returns 11, the length of abracadabra

spell.get(2)
// returns "r", the third letter of abracadabra

var codes = spell.map(function(letter) {
  return letter.charCodeAt(0)
})
```

You can also search for an item and splice relative to it:

```javascript
alphabet.spliceRelativeTo("g", "after", 0, "h")
// alphabet is now ["a", "b", "c", "d", "e", "f", "g", "h"]
```
