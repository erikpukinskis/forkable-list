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
At this point the original list is stored using a single array:
```javascript
alphabet.values()

// returns ["a", "b", "c", "d", "e", "f". "g"]
```
And then the second array will pull "a", "b", and "c" from the first array and create just one more array to store the second of half of the list:
```javascript
spell.join("")
// returns "abracadabra"
```

There are a few additional methods for convenience:

```javascript
spell.forEach(function(letter) {
  console.log(letter)
})

spell.length
// returns 11, the length of abracadabra

var codes = spell.map(function(letter) {
  return letter.charCodeAt(0)
})
```

You can search for an item and splice relative to it:

```javascript
alphabet.spliceRelativeTo("g", "after", 0, "h")
// alphabet is now ["a", "b", "c", "d", "e", "f", "g", "h"]
```