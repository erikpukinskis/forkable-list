var library = require("module-library")(require)

module.exports = library.export(
  "forkable-list",
  function () {

    function forkableList(array) {
      var list = new ForkableList()

      list.segments.push(segment(array))

      if (array) {
        list.length = array.length
      }

      return list
    }

    function segment(array) {
      return {
        mutableAfter: -1,
        extendable: true,
        store: array||[],
        start: 0,
        length: array ? array.length : 0,
      }
    }
    
    function ForkableList() {
      this.segments = []
      this.length = 0
    }

    ForkableList.prototype.next = function() {

      var lastSegment = this.segments[this.segments.length-1]
      var isWriteable = isMutableAt(lastSegment.length, lastSegment)

      if (!isWriteable) {
        lastSegment = segment()
        this.segments.push(lastSegment)
      }

      var pos = this.length
      this.length++
      lastSegment.length++
      return pos
    }

    function fastForward(segments, index, callback) {

      var i = 0
      var previousSegmentTotal = 0
      do {
        var segment = segments[i]
        var lastExpectedIndex = previousSegmentTotal + segment.length - 1

        var next = segments[i+1]
        if (index <= lastExpectedIndex) {
          break;
        } else if (next) {
          previousSegmentTotal += segment.length
          i++
          continue;
        }
      } while(next)


      callback(segment, previousSegmentTotal)
    }

    function isMutableAt(index, segment) {
      if (index < 0) {
        return false
      } else if (segment.mutableAfter == null) {
        return false
      } else if (index > segment.mutableAfter) {
        return true
      }
    }

    ForkableList.prototype.set = function(index, item) {

      var list = this

      fastForward(this.segments, index, function(segment, previousSegmentTotal) {

        var indexWithinStore = index - previousSegmentTotal
        var lastExpectedIndex = segment.start + segment.length

        if (isMutableAt(indexWithinStore, segment)) {
          addToSegment(segment, list, indexWithinStore, item)
        } else {
          list.splice(index, 1, item)
        }
      })

    }

    function addToSegment(segment, list, indexWithinStore, item) {

      if (!isMutableAt(indexWithinStore, segment)) {
        throw new Error("trying to mutate an immutable segment")
      }

      var lastExpectedIndex = segment.start + segment.length - 1

      var isOutOfBounds = indexWithinStore > lastExpectedIndex

      if (isOutOfBounds) {
        var lastSegment = list.segments[list.segments.length - 1]

        if (segment != lastSegment) {
          throw new Error("trying to auto-expand a segment that's not the last segment")
        }
        var oldLength = segment.length
        segment.length = indexWithinStore + 1
        var added = segment.length - oldLength
        list.length += added
      }

      segment.store[indexWithinStore] = item
    }

    ForkableList.prototype.get = function(index) {
      var value

      fastForward(this.segments, index, function(segment, previousSegmentTotal) {
        var indexWithinStore = index - previousSegmentTotal
        value = segment.store[indexWithinStore]
      })

      return value
    }

    ForkableList.prototype.join = function(separator) {
      if (typeof separator == "undefined") {
        separator = ", "
      }
      var it = newIterator(this)

      var item
      var string
      while((item = it()) != DONEZO) {
        if (typeof string == "string") {
          string += separator
        } else {
          string = ""
        }
        string += item
      }
      if (typeof string == "undefined") {
        return ""
      } else {
        return string
      }
    }

    ForkableList.prototype.map = function(callback) {
      var it = newIterator(this)
      var item
      var values = []
      while((item = it()) != DONEZO) {
        values.push(callback(item))
      }
      return values
    }

    ForkableList.prototype.forEach = function(callback) {
      var it = newIterator(this)
      var item
      while((item = it()) != DONEZO) {
        callback(item)
      }
    }

    ForkableList.prototype.spliceRelativeTo = function(relativeToThisItem, relationship, deleteThisMany, item1, item2, etc) {

      if (typeof deleteThisMany != "number") {
        throw new Error("Third argument to list.spliceRelativeTo was "+deleteThisMany+". It should be a number of how many to delete.")
      }

      if (relationship == "inPlaceOf" && deleteThisMany != 1) {
        throw new Error("splicing something inPlaceOf means deleting 1. Try list.spliceRelativeTo(whatever, \"inPlaceOf\", 1, yourReplacement)")
      }

      var index = this.find(relativeToThisItem)

      if (relationship == "after") {
        index++
      }

      var spliceArguments = [index, deleteThisMany]

      for(var i=3; i<arguments.length; i++) {
        spliceArguments.push(arguments[i])
      }

      this.splice.apply(this, spliceArguments)
    }

    ForkableList.prototype.find = function(item) {
      for(var i=0; i<this.length; i++) {
        var index = i
        if (this.get(i) == item) {
          return i
        }
      }

      throw new Error(item+" is not in list "+this.join())
    }

    ForkableList.prototype.splice = function(index, deleteCount, item1, item2, etc) {

      var newItemCount = Math.max(0, arguments.length - 2)
      var netItemCount = newItemCount - deleteCount
      var list = this
      var segments = this.segments
      var segmentIndex = 0
      var previousSegmentTotal = 0

      while(segments[segmentIndex]) {

        var segment = segments[segmentIndex]
        var lastExpectedIndex = previousSegmentTotal + segment.length - 1
        var next = segments[segmentIndex + 1]
        var isLastSegment = segmentIndex == segments.length
        var indexWithinStore = index - previousSegmentTotal
        var isMutableHere = isMutableAt(indexWithinStore, segment)
        var indexWithinNext = index - previousSegmentTotal - segment.length
        var nextCouldTakeIt = next && isMutableAt(indexWithinNext, next)


        if (!next) {
          break;

        } else if (index > lastExpectedIndex && !segment.extendable) {
          previousSegmentTotal += segment.length
          segmentIndex++
          continue;

        } else if (isMutableHere && !nextCouldTakeIt) {
          break;

        } else {
          previousSegmentTotal += segment.length
          segmentIndex++
          continue;
        }
      }

      var parent = segment

      var whereParentEnds = parent.start + parent.length
      var gap = Math.max(0, indexWithinStore - whereParentEnds)
      var isAtEnd = indexWithinStore ==whereParentEnds
      var hasRemainingItems = indexWithinStore + deleteCount < parent.length
      var availableToDelete = parent.length - indexWithinStore


      if (isAtEnd && isMutableHere) {

        for(var i=0; i<newItemCount; i++) {
          parent.store.push(arguments[2+i])
        }
        parent.length += netItemCount
        list.length += netItemCount
        return
      }

      if (isMutableHere) {
        var storeSplice = [
          indexWithinStore,
          deleteCount
        ]

        for(var i=0; i<newItemCount; i++) {
          storeSplice.push(arguments[2+i])
        }

        var originalLength = segment.length

        var remainingToDelete = Math.max(0, deleteCount - availableToDeleteAfter(indexWithinStore, segment))

        parent.store.splice.apply(parent.store, storeSplice)

        var deletedCount = deleteCount - remainingToDelete

        parent.length = parent.length + newItemCount - deletedCount

        while(next && remainingToDelete > 0) {
          var removeFromNextSegment = Math.min(next.length, remainingToDelete)

          next.start += removeFromNextSegment
          next.length -= removeFromNextSegment

          remainingToDelete -= removeFromNextSegment
          previousSegmentTotal += segment.length
          segmentIndex++
          next = segments[segmentIndex]
        }

        list.length += netItemCount

        return
      }


      var items = []

      for(var i=0; i<newItemCount; i++) {
        items[gap+i] = arguments[2+i]
      }

      if (gap > 0) {
        var firstSegmentLength = parent.length
        list.length += gap
      } else {
        var firstSegmentLength = indexWithinStore
      }

      var beginning = {
        mutableAfter: null,
        extendable: false,
        store: parent.store,
        start: parent.start,
        length: firstSegmentLength,
      }

      list.length = list.length + newItemCount

      var middle = {
        mutableAfter: -1,
        extendable: true,
        store: items,
        start: 0,
        length: gap + newItemCount,
      }

      var lastSegmentStart = indexWithinStore

      var lastSegmentLength = parent.length - indexWithinStore

      list.segments = [beginning, middle]

      if (lastSegmentLength > 0) {
        var end = {
          mutableAfter: null,
          extendable: false,
          store: parent.store,
          start: lastSegmentStart,
          length: lastSegmentLength
        }

        list.segments.push(end)
      }

      makeImmutableBefore(indexWithinStore, parent)
    }


    function availableToDeleteAfter(index, segment) {
      var countBeforeIndex = index - segment.start
      return segment.length - countBeforeIndex
    }

    function makeImmutableBefore(indexWithinStore, segment) {

      if (segment.mutableAfter == null) { return }

      var newMutableAfter = indexWithinStore - 1

      segment.mutableAfter = Math.max(newMutableAfter, segment.mutableAfter)
    }

    ForkableList.prototype.fork = function() {
      var fork = new ForkableList()

      var segment = this.segments[0]

      if (this.segments.length > 1) {
        throw new Error("how to fork segmented list?")
      }

      makeImmutableBefore(segment.length, segment)

      var clone = {
        mutableAfter: null,
        extendable: false,
        store: segment.store,
        start: segment.start,
        length: segment.length,
      }

      fork.segments.push(clone)
      fork.length = this.length
      
      return fork
    }

    ForkableList.prototype.values = function() {
      var it = newIterator(this)
      var item
      var values = []
      while((item = it()) != DONEZO) {
        values.push(item)
      }
      return values
    }

    function newIterator(list) {
      var context = {
        next: 0,
        list: list,
        segmentIndex: 0,
        previousSegmentTotal: 0
      }
      return iterator.bind(context)
    }

    var DONEZO = {}

    function iterator() {
      var segment = this.list.segments[this.segmentIndex]

      var indexWithinStore = this.next - this.previousSegmentTotal + segment.start

      var isInThis = indexWithinStore < segment.start + segment.length

      if (isInThis) {
        this.next++
        return segment.store[indexWithinStore]
      } else {
        this.segmentIndex++
        var next = this.list.segments[this.segmentIndex]

        if (next) {
          this.previousSegmentTotal += segment.length
          return iterator.call(this)
        } else {
          return DONEZO
        }
      }
    }

    return forkableList
  }
)


