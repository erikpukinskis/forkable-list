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
      if (typeof segment.mutableAfter == "undefined") {
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

      for(var i=0; i<this.length; i++) {
        var index = i
        var isMatch = this.get(index) == relativeToThisItem

        if (!isMatch) { continue }

        debugger
        if (relationship == "after") {
          index++
        }

        var spliceArguments = [index, deleteThisMany]

        for(var i=3; i<arguments.length; i++) {
          spliceArguments.push(arguments[i])
        }

        this.splice.apply(this, spliceArguments)

        break;
      }

    }

    ForkableList.prototype.splice = function(index, deleteCount, item1, item2, etc) {

      var newItemCount = Math.max(0, arguments.length - 2)

      var list = this
      var segments = this.segments
      var segmentIndex = 0
      var previousSegmentTotal = 0

      do {
        var segment = segments[segmentIndex]
        var lastExpectedIndex = previousSegmentTotal + segment.length - 1
        var next = segments[segmentIndex + 1]
        var fits = index <= lastExpectedIndex
        var couldFit = index <= lastExpectedIndex + newItemCount
        var isLastSegment = segmentIndex == segments.length

        var isExtendable = isLastSegment && segment.extendable

        if (fits || couldFit || isExtendable) {
          break;
        } else if (next) {
          previousSegmentTotal += segment.length
          segmentIndex++
          continue;
        }
      } while(next)

      var parent = segment

      var indexWithinStore = index - previousSegmentTotal

      var whereParentEnds = parent.start + parent.length

      var gap = Math.max(0, indexWithinStore - whereParentEnds)

      var isAtEnd = indexWithinStore ==whereParentEnds

      if (isAtEnd && isMutableAt(indexWithinStore, parent)) {

        for(var i=0; i<newItemCount; i++) {
          parent.store.push(arguments[2+i])
        }
        parent.length += newItemCount
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
        mutableAfter: undefined,
        store: parent.store,
        start: parent.start,
        length: firstSegmentLength,
      }



      list.length = list.length + newItemCount

      var middle = {
        mutableAfter: -1,
        store: items,
        start: 0,
        length: gap + newItemCount,
      }

      // store = [a,b,c,d]
      // items = [x,y]
      // indexWithinStore = 2


      var lastSegmentStart = indexWithinStore

      var lastSegmentLength = parent.length - indexWithinStore

      list.segments = [beginning, middle]

      if (lastSegmentLength > 0) {
        var end = {
          mutableAfter: undefined,
          store: parent.store,
          start: lastSegmentStart,
          length: lastSegmentLength
        }

        list.segments.push(end)
      }

      makeImmutableBefore(indexWithinStore, parent)
    }

    function makeImmutableBefore(indexWithinStore, segment) {

      if (typeof segment.mutableAfter == "undefined") { return }

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
        mutableAfter: undefined,
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


