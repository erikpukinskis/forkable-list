var library = require("module-library")(require)

module.exports = library.export(
  "forkable-list",
  function () {

    function forkableList(array) {
      var list = new ForkableList()

      list.segments.push(segment(array))

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
        var next = segments[i+1]

        var fitsInThis = index < previousSegmentTotal + segment.length

        if (fitsInThis) {
          break;
        }

        if (!fitsInThis && next) {
          previousSegmentTotal += segment.length
          continue;
        }
      } while(next)

      callback(segment, previousSegmentTotal)
    }

    ForkableList.prototype.set = function(index, item) {

      var list = this

      fastForward(this.segments, index, function(segment, previousSegmentTotal) {

        var indexWithinStore = index - previousSegmentTotal

        if (!segment.mutable) {
          list.splice(index, 1, item)
        }

        segment.store[indexWithinStore] = item

        if (indexWithinStore + 1 > segment.length) {
          var lastSegment = list.segments[list.segments.length - 1]
          if (segment != lastSegment) {
            throw new Error("trying to auto-expand a segment that's not the last segment")
          }
          var oldLength = segment.length
          segment.length = indexWithinStore + 1
          var added = segment.length - oldLength
          list.length += added
        }
      })

    }

    ForkableList.prototype.get = function(index) {

      var segment = segmentFor(index, this.segments)

      if (!segment) { return }

      var indexWithinStore = indexIn(segment, index)

      return segment.store[indexWithinStore]
    }

    ForkableList.prototype.splice = function(index, deleteCount, item1, item2, etc) {

      var list = this

      fastForward(this.segments, index, function(parent, previousSegmentTotal) {

        console.log("\nYAS QUEEN\n")

        var itemIndexWithinStore = index - previousSegmentTotal

        var items = Array.prototype.slice.call(arguments, 2)

        debugger
        list.length = list.length + items.length - deleteCount


        var beginning = {
          mutable: false,
          growable: false,
          store: parent.store,
          start: parent.start,
          length: itemIndexWithinStore,
        }

        var middle = {
          mutable: true,
          growable: true,
          store: items,
          start: 0,
          length: items.length,
        }

        var lastSegmentStart = null
        var lastSegmentLength = null

        var end = {
          mutable: false,
          growable: false,
          store: parent.store,
        }

        this.segments = [beginning, middle, end]

        parent.mutable = false
      })

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
      debugger
      fork.length = this.length
      
      return fork
    }

    ForkableList.prototype.values = function() {
      var iterator = this.iterator()

      var item
      var values = []
      while((item = iterator()) != DONEZO) {
        values.push(item)
      }
      return values
    }

    ForkableList.prototype.iterator = function() {
      var context = {
        next: 0,
        list: this,
        segmentIndex: 0,
        previousSegmentTotal: 0
      }
      return iterator.bind(context)
    }

    var DONEZO = {}

    function iterator() {
      console.log("need to get "+this.next)

      var segment = this.list.segments[this.segmentIndex]

      var indexWithinStore = this.next - this.previousSegmentTotal

      var isInThis = indexWithinStore < segment.length

      if (isInThis) {
        this.next++
        return segment.store[indexWithinStore]
      } else {
        this.segmentIndex++
        var next = this.list.segments[this.segmentIndex]

        if (!next) {
          return DONEZO
        } else {
          throw new Error("more segs?")
        }
      }
    }

    return forkableList
  }
)


