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
        mutable: true,
        growable: true,
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

      if (!lastSegment.growable) {
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

    ForkableList.prototype.set = function(index, item) {

      var list = this

      fastForward(this.segments, index, function(segment, previousSegmentTotal) {

        var indexWithinStore = index - previousSegmentTotal

        if (segment.mutable) {
          addToSegment(segment, list, indexWithinStore, item)
        } else {
          list.splice(index, 1, item)
        }
      })

    }

    function addToSegment(segment, list, indexWithinStore, item) {

      segment.store[indexWithinStore] = item

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
    }

    ForkableList.prototype.get = function(index) {

      var segment = segmentFor(index, this.segments)

      if (!segment) { return }

      var indexWithinStore = indexIn(segment, index)

      return segment.store[indexWithinStore]
    }

    ForkableList.prototype.splice = function(index, deleteCount, item1, item2, etc) {

      var newItemCount = Math.max(0, arguments.length - 2)

      var list = this
      var segments = this.segments
      var segmentIndex = 0
      var previousSegmentTotal = 0

      debugger
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

      if (parent.growable && indexWithinStore == whereParentEnds) {
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
        mutable: false,
        growable: false,
        store: parent.store,
        start: parent.start,
        length: firstSegmentLength,
      }



      list.length = list.length + newItemCount

      var middle = {
        mutable: true,
        growable: true,
        store: items,
        start: 0,
        length: gap + newItemCount,
      }

      // store = [a,b,c,d]
      // items = [x,y]
      // indexWithinStore = 2


      var lastSegmentStart = indexWithinStore

      var lastSegmentLength = parent.length - indexWithinStore

      debugger

      list.segments = [beginning, middle]

      if (lastSegmentLength > 0) {
        var end = {
          mutable: false,
          growable: false,
          store: parent.store,
          start: lastSegmentStart,
          length: lastSegmentLength
        }

        list.segments.push(end)
      }

      parent.mutable = false

    }

    ForkableList.prototype.fork = function() {
      var fork = new ForkableList()

      var segment = this.segments[0]

      if (this.segments.length > 1) {
        throw new Error("how to fork segmented list?")
      }

      segment.mutable = false

      var clone = {
        mutable: false,
        growable: false,
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


