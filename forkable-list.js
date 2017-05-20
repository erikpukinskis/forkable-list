var library = require("module-library")(require)

module.exports = library.export(
  "forkable-list",
  function () {

    function forkableList() {
      var list = new ForkableList()

      var fresh = {
        mutable: true,
        growable: true,
        store: [],
        origin: 0,
        start: 0,
        length: 0,
      }

      list.segments.push(fresh)

      return list
    }

    function ForkableList() {
      this.segments = []
      this.length = 0
    }

    ForkableList.prototype.next = function() {
      var lastSegment = this.segments[this.segments.length-1]

      if (!lastSegment.growable) {
        throw new Error("don't know how to get the next position after an ungrowable segment")
      }

      var pos = lastSegment.origin + lastSegment.length

      lastSegment.length++
      this.length++

      return pos
    }

    function indexIn(segment, index) {
      var indexWithinStore = index - segment.origin
      var startsEarly = indexWithinStore < segment.start
      var endsLate = indexWithinStore >= segment.start + segment.length

      if (startsEarly || endsLate) {
        return -1
      } else {
        return indexWithinStore
      }
    }

    function segmentFor(index, segments) {
      for(var i=0; i<segments.length; i++) {
        var segment = segments[i]
        var indexWithin = indexIn(segment, index)
        if (indexWithin != -1) {
          return segment
        }
      }
    }

    ForkableList.prototype.set = function(index, item) {

      var segment = segmentFor(index, this.segments)

      if (!segment) {
        throw new Error("Tried to set position "+index+" in list, but that position doesn't exist. Try list.set(list.next(), yourValue)")
      }

      var indexWithinStore = indexIn(segment, index)

      segment.store[indexWithinStore] = item
    }

    ForkableList.prototype.get = function(index) {

      var segment = segmentFor(index, this.segments)

      if (!segment) { return }

      var indexWithinStore = indexIn(segment, index)

      return segment.store[indexWithinStore]
    }

    ForkableList.prototype.splice = function(index, deleteCount, item) {
      if (deleteCount != 0) {
        throw new Error("splice can't delete yet")
      }

      var parent = segmentFor(index, this.segments)

      var itemIndexWithinStore = indexIn(parent, index)

      var items = [item]
      this.length += items.length

      var beginning = {
        mutable: false,
        growable: false,
        store: parent.store,
        origin: parent.origin,
        start: parent.start,
        length: itemIndexWithinStore,
      }
      var middle = {
        mutable: true,
        growable: true,
        store: items,
        origin: index,
        start: 0,
        length: items.length,
      }
      var end = {
        mutable: false,
        growable: false,
        store: parent.store,
        origin: parent.origin + items.length,
        start: itemIndexWithinStore,
      }
      end.length = parent.length - end.start

      this.segments = [beginning, middle, end]

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
        origin: segment.origin,
        start: segment.start,
        length: segment.length,
      }

      fork.segments.push(clone)

      return fork
    }

    ForkableList.prototype.values = function() {
      var iterator = this.iterator()

      var item
      var values = []
      while(typeof (item = iterator()) != "undefined") {
        values.push(item)
      }
      return values
    }

    ForkableList.prototype.iterator = function() {
      var context = {
        next: 0,
        list: this,
        segmentIndex: 0,
      }
      return iterator.bind(context)
    }

    function iterator() {
      var indexWithinStore = -1

      do {
        var segment = this.list.segments[this.segmentIndex]

        var indexWithinStore = indexIn(segment, this.next)

        if (indexWithinStore == -1) {
          this.segmentIndex++
          var hasMoreSegments = !!this.list.segments[this.segmentIndex]
        } else {
          hasMoreSegments = false
        }
      } while(indexWithinStore == -1 && hasMoreSegments)

      if (indexWithinStore == -1) {
        return
      } else {
        var value = segment.store[indexWithinStore]
        this.next++
        return value
      }
    }

    return forkableList
  }
)


