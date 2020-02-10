import React, { Component } from 'react'
import PropTypes from 'prop-types'

const CANCEL_DISTANCE_ON_SCROLL = 20

const defaultStyles = {
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  sidebar: {
    zIndex: 2,
    position: 'absolute',
    transition: 'transform .3s ease-out',
    WebkitTransition: '-webkit-transform .3s ease-out',
    willChange: 'transform',
    overflowY: 'auto',
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    transition: 'left .3s ease-out, right .3s ease-out',
  },
  overlay: {
    zIndex: 1,
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    visibility: 'hidden',
    transition: 'opacity .3s ease-out, visibility .3s ease-out',
    backgroundColor: 'rgba(0,0,0,.3)',
  },
  dragHandle: {
    zIndex: 1,
    position: 'fixed',
    top: 0,
    bottom: 0,
  },
}

class Sidebar extends Component {
  constructor(props) {
    super(props)

    this.state = {
      // the detected width of the sidebar in pixels
      sidebarWidth: props.defaultSidebarWidth,
      sidebarHeight: props.defaultSidebarHeight,
      touchIdentifier: null,
      touchStartX: null,
      touchCurrentX: null,
      touchStartY: null,
      touchCurrentY: null,
      dragSupported: false,
    } // keep track of touching params // if touch is supported by the browser

    this.overlayClicked = this.overlayClicked.bind(this)
    this.onTouchStart = this.onTouchStart.bind(this)
    this.onTouchMove = this.onTouchMove.bind(this)
    this.onTouchEnd = this.onTouchEnd.bind(this)
    this.onScroll = this.onScroll.bind(this)
    this.saveSidebarRef = this.saveSidebarRef.bind(this)
  }

  componentDidMount() {
    const isIos = /iPad|iPhone|iPod/.test(navigator ? navigator.userAgent : '')
    this.setState({
      dragSupported: typeof window === 'object' && 'ontouchstart' in window && !isIos,
    })
    this.saveSidebarSize()
  }

  componentDidUpdate() {
    // filter out the updates when we're touching
    if (!this.isTouching()) {
      this.saveSidebarSize()
    }
  }

  onTouchStart(ev) {
    // filter out if a user starts swiping with a second finger
    if (!this.isTouching()) {
      const touch = ev.targetTouches[0]
      this.setState({
        touchIdentifier: touch.identifier,
        touchStartX: touch.clientX,
        touchCurrentX: touch.clientX,
        touchStartY: touch.clientY,
        touchCurrentY: touch.clientY,
      })
    }
  }

  onTouchMove(ev) {
    if (this.isTouching()) {
      for (let ind = 0; ind < ev.targetTouches.length; ind++) {
        // we only care about the finger that we are tracking
        if (ev.targetTouches[ind].identifier === this.state.touchIdentifier) {
          this.setState({
            touchCurrentX: ev.targetTouches[ind].clientX,
            touchCurrentY: ev.targetTouches[ind].clientY,
          })
          break
        }
      }
    }
  }

  onTouchEnd() {
    if (this.isTouching()) {
      // trigger a change to open if sidebar has been dragged beyond dragToggleDistance
      const touchSize = this.touchSidebarSize()
      switch (this.props.pullPosition) {
        default:
        case Sidebar.pullPositionTypes.left:
        case Sidebar.pullPositionTypes.right:
          if (
            (this.props.open && touchSize < this.state.sidebarWidth - this.props.dragToggleDistance) ||
            (!this.props.open && touchSize > this.props.dragToggleDistance)
          ) {
            this.props.onSetOpen(!this.props.open)
          }
          break
        case Sidebar.pullPositionTypes.top:
        case Sidebar.pullPositionTypes.bottom:
          if (
            (this.props.open && touchSize < this.state.sidebarHeight - this.props.dragToggleDistance) ||
            (!this.props.open && touchSize > this.props.dragToggleDistance)
          ) {
            this.props.onSetOpen(!this.props.open)
          }
          break
      }

      this.setState({
        touchIdentifier: null,
        touchStartX: null,
        touchCurrentX: null,
        touchStartY: null,
        touchCurrentY: null,
      })
    }
  }

  // This logic helps us prevents the user from sliding the sidebar horizontally
  // while scrolling the sidebar vertically. When a scroll event comes in, we're
  // cancelling the ongoing gesture if it did not move horizontally much.
  onScroll() {
    if (this.isTouching() && this.inCancelDistanceOnScroll()) {
      this.setState({
        touchIdentifier: null,
        touchStartX: null,
        touchCurrentX: null,
        touchStartY: null,
        touchCurrentY: null,
      })
    }
  }

  // True if the on going gesture X distance is less than the cancel distance
  inCancelDistanceOnScroll() {
    let cancelDistanceOnScroll

    switch (this.props.pullPosition) {
      default:
      case Sidebar.pullPositionTypes.left:
        cancelDistanceOnScroll = Math.abs(this.state.touchStartX - this.state.touchCurrentX) < CANCEL_DISTANCE_ON_SCROLL
        break
      case Sidebar.pullPositionTypes.right:
        cancelDistanceOnScroll = Math.abs(this.state.touchCurrentX - this.state.touchStartX) < CANCEL_DISTANCE_ON_SCROLL
        break
      case Sidebar.pullPositionTypes.top:
        cancelDistanceOnScroll = Math.abs(this.state.touchStartY - this.state.touchCurrentY) < CANCEL_DISTANCE_ON_SCROLL
        break
      case Sidebar.pullPositionTypes.bottom:
        cancelDistanceOnScroll = Math.abs(this.state.touchCurrentY - this.state.touchStartY) < CANCEL_DISTANCE_ON_SCROLL
        break
    }
    return cancelDistanceOnScroll
  }

  isTouching() {
    return this.state.touchIdentifier !== null
  }

  overlayClicked() {
    if (this.props.open) {
      this.props.onSetOpen(false)
    }
  }

  saveSidebarSize() {
    const width = this.sidebar.offsetWidth
    if (width !== this.state.sidebarWidth) {
      this.setState({ sidebarWidth: width })
    }
  }

  saveSidebarRef(node) {
    this.sidebar = node
  }

  // calculate the width/height based on current touch info
  touchSidebarSize() {
    // if the sidebar is open and start point of drag is inside the sidebar
    // we will only drag the distance they moved their finger
    // otherwise we will move the sidebar to be below the finger.

    switch (this.props.pullPosition) {
      default:
      case Sidebar.pullPositionTypes.left:
        if (this.props.open && this.state.touchStartX < this.state.sidebarWidth) {
          if (this.state.touchCurrentX > this.state.touchStartX) {
            return this.state.sidebarWidth
          }
          return this.state.sidebarWidth - this.state.touchStartX + this.state.touchCurrentX
        }
        return Math.min(this.state.touchCurrentX, this.state.sidebarWidth)
      case Sidebar.pullPositionTypes.right:
        if (this.props.open && window.innerWidth - this.state.touchStartX < this.state.sidebarWidth) {
          if (this.state.touchCurrentX > this.state.touchStartX) {
            return this.state.sidebarWidth + this.state.touchStartX - this.state.touchCurrentX
          }
          return this.state.sidebarWidth
        }
        return Math.min(window.innerWidth - this.state.touchCurrentX, this.state.sidebarWidth)
      case Sidebar.pullPositionTypes.top:
        if (this.props.open && this.state.touchStartY < this.state.sidebarHeight) {
          if (this.state.touchCurrentY > this.state.touchStartY) {
            return this.state.sidebarHeight
          }
          return this.state.sidebarHeight - this.state.touchStartY + this.state.touchCurrentY
        }
        return Math.min(this.state.touchCurrentX, this.state.sidebarWidth)
      case Sidebar.pullPositionTypes.bottom:
        if (this.props.open && window.innerHeight - this.state.touchStartY < this.state.sidebarHeight) {
          if (this.state.touchCurrentY > this.state.touchStartY) {
            return this.state.sidebarHeight + this.state.touchStartY - this.state.touchCurrentY
          }
          return this.state.sidebarHeight
        }
        return Math.min(window.innerHeight - this.state.touchCurrentY, this.state.sidebarHeight)
    }
  }

  render() {
    const sidebarStyle = {
      ...defaultStyles.sidebar,
      ...this.props.styles.sidebar,
    }
    const contentStyle = {
      ...defaultStyles.content,
      ...this.props.styles.content,
    }
    const overlayStyle = {
      ...defaultStyles.overlay,
      ...this.props.styles.overlay,
    }
    const useTouch = this.state.dragSupported && this.props.touch
    const isTouching = this.isTouching()
    const rootProps = {
      className: this.props.rootClassName,
      style: { ...defaultStyles.root, ...this.props.styles.root },
      role: 'navigation',
      id: this.props.rootId,
    }
    let dragHandle

    const hasBoxShadow = this.props.shadow && (isTouching || this.props.open || this.props.docked)
    // sidebar position styles

    switch (this.props.pullPosition) {
      default:
      case Sidebar.pullPositionTypes.left:
        sidebarStyle.right = 0
        sidebarStyle.top = 0
        sidebarStyle.bottom = 0
        sidebarStyle.transform = 'translateX(100%)'
        sidebarStyle.WebkitTransform = 'translateX(100%)'
        if (hasBoxShadow) {
          sidebarStyle.boxShadow = '-2px 2px 4px rgba(0, 0, 0, 0.15)'
        }
        break
      case Sidebar.pullPositionTypes.right:
        sidebarStyle.left = 0
        sidebarStyle.top = 0
        sidebarStyle.bottom = 0
        sidebarStyle.transform = 'translateX(-100%)'
        sidebarStyle.WebkitTransform = 'translateX(-100%)'
        if (hasBoxShadow) {
          sidebarStyle.boxShadow = '2px 2px 4px rgba(0, 0, 0, 0.15)'
        }
        break
      case Sidebar.pullPositionTypes.bottom:
        sidebarStyle.right = 0
        sidebarStyle.left = 0
        sidebarStyle.bottom = 0
        sidebarStyle.height = window.innerHeight
        sidebarStyle.transform = 'translateY(100%)'
        sidebarStyle.WebkitTransform = 'translateY(100%)'
        if (hasBoxShadow) {
          sidebarStyle.boxShadow = '2px -2px 4px rgba(0, 0, 0, 0.15)'
        }
        break
      case Sidebar.pullPositionTypes.top:
        sidebarStyle.right = 0
        sidebarStyle.left = 0
        sidebarStyle.height = window.innerHeight
        sidebarStyle.top = 0
        sidebarStyle.transform = 'translateY(0%)'
        sidebarStyle.WebkitTransform = 'translateY(0%)'
        if (hasBoxShadow) {
          sidebarStyle.boxShadow = '2px 2px 4px rgba(0, 0, 0, 0.15)'
        }
        break
    }
    if (isTouching) {
      let percentage
      // slide open to what we dragged

      switch (this.props.pullPosition) {
        default:
        case Sidebar.pullPositionTypes.left:
          percentage = this.touchSidebarSize() / this.state.sidebarWidth
          sidebarStyle.transform = `translateX(-${(1 - percentage) * 100}%)`
          sidebarStyle.WebkitTransform = `translateX(-${(1 - percentage) * 100}%)`
          break
        case Sidebar.pullPositionTypes.right:
          percentage = this.touchSidebarSize() / this.state.sidebarWidth
          sidebarStyle.transform = `translateX(${(1 - percentage) * 100}%)`
          sidebarStyle.WebkitTransform = `translateX(${(1 - percentage) * 100}%)`
          break
        case Sidebar.pullPositionTypes.top:
          percentage = this.touchSidebarSize() / this.state.sidebarHeight
          sidebarStyle.transform = `translateY(-${(1 - percentage) * 100}%)`
          sidebarStyle.WebkitTransform = `translateY(-${(1 - percentage) * 100}%)`
          break
        case Sidebar.pullPositionTypes.bottom:
          percentage = this.touchSidebarSize() / this.state.sidebarHeight
          sidebarStyle.transform = `translateY(${(1 - percentage) * 100}%)`
          sidebarStyle.WebkitTransform = `translateY(${(1 - percentage) * 100}%)`
          break
      }

      // fade overlay to match distance of drag
      overlayStyle.opacity = percentage
      overlayStyle.visibility = 'visible'
    } else if (this.props.docked) {
      // show sidebar

      // make space on the left/right side of the content for the sidebar
      switch (this.props.pullPosition) {
        case Sidebar.pullPositionTypes.left:
          contentStyle.left = `${this.state.sidebarWidth}px`
          if (this.state.sidebarWidth !== 0) {
            sidebarStyle.transform = `translateX(0%)`
            sidebarStyle.WebkitTransform = `translateX(0%)`
          }
          break
        default:
        case Sidebar.pullPositionTypes.right:
          contentStyle.right = `${this.state.sidebarWidth}px`
          if (this.state.sidebarWidth !== 0) {
            sidebarStyle.transform = `translateX(0%)`
            sidebarStyle.WebkitTransform = `translateX(0%)`
          }
          break
        case Sidebar.pullPositionTypes.bottom:
          contentStyle.top = `${this.state.sidebarHeight}px`
          if (this.state.sidebarHeight !== 0) {
            sidebarStyle.transform = `translateY(0%)`
            sidebarStyle.WebkitTransform = `translateY(0%)`
          }
          break
        case Sidebar.pullPositionTypes.top:
          contentStyle.bottom = `${this.state.sidebarHeight}px`
          if (this.state.sidebarHeight !== 0) {
            sidebarStyle.transform = `translateY(0%)`
            sidebarStyle.WebkitTransform = `translateY(0%)`
          }
          break
      }
    } else if (this.props.open) {
      // slide open sidebar

      switch (this.props.pullPosition) {
        default:
        case Sidebar.pullPositionTypes.left:
        case Sidebar.pullPositionTypes.right:
          sidebarStyle.transform = `translateX(0%)`
          sidebarStyle.WebkitTransform = `translateX(0%)`
          break
        case Sidebar.pullPositionTypes.bottom:
        case Sidebar.pullPositionTypes.top:
          sidebarStyle.transform = `translateY(0%)`
          sidebarStyle.WebkitTransform = `translateY(0%)`
          break
      }

      // show overlay
      overlayStyle.opacity = 1
      overlayStyle.visibility = 'visible'
    }

    if (isTouching || !this.props.transitions) {
      sidebarStyle.transition = 'none'
      sidebarStyle.WebkitTransition = 'none'
      contentStyle.transition = 'none'
      overlayStyle.transition = 'none'
    }

    if (useTouch) {
      if (this.props.open) {
        rootProps.onTouchStart = this.onTouchStart
        rootProps.onTouchMove = this.onTouchMove
        rootProps.onTouchEnd = this.onTouchEnd
        rootProps.onTouchCancel = this.onTouchEnd
        rootProps.onScroll = this.onScroll
      } else {
        const dragHandleStyle = { ...defaultStyles.dragHandle, ...this.props.styles.dragHandle }

        switch (this.props.pullPosition) {
          default:
          case Sidebar.pullPositionTypes.left:
            dragHandleStyle.width = this.props.touchHandleSize
            dragHandleStyle.left = 0
            break
          case Sidebar.pullPositionTypes.right:
            dragHandleStyle.width = this.props.touchHandleSize
            dragHandleStyle.right = 0
            break
          case Sidebar.pullPositionTypes.top:
            dragHandleStyle.height = this.props.touchHandleSize
            dragHandleStyle.top = 0
            break
          case Sidebar.pullPositionTypes.bottom:
            dragHandleStyle.height = this.props.touchHandleSize
            dragHandleStyle.bottom = 0
            break
        }

        dragHandle = (
          <div
            style={dragHandleStyle}
            onTouchStart={this.onTouchStart}
            onTouchMove={this.onTouchMove}
            onTouchEnd={this.onTouchEnd}
            onTouchCancel={this.onTouchEnd}
          />
        )
      }
    }

    return (
      <div {...rootProps}>
        <div className={this.props.sidebarClassName} style={sidebarStyle} ref={this.saveSidebarRef} id={this.props.sidebarId}>
          {this.props.sidebar}
        </div>
        {/* eslint-disable */}
        <div className={this.props.overlayClassName} style={overlayStyle} onClick={this.overlayClicked} id={this.props.overlayId} />
        {/* eslint-enable */}
        <div className={this.props.contentClassName} style={contentStyle} id={this.props.contentId}>
          {dragHandle}
          {this.props.children}
        </div>
      </div>
    )
  }
}

Sidebar.propTypes = {
  // main content to render
  children: PropTypes.node.isRequired,

  // styles
  styles: PropTypes.shape({
    root: PropTypes.object,
    sidebar: PropTypes.object,
    content: PropTypes.object,
    overlay: PropTypes.object,
    dragHandle: PropTypes.object,
  }),

  // root component optional class
  rootClassName: PropTypes.string,

  // sidebar optional class
  sidebarClassName: PropTypes.string,

  // content optional class
  contentClassName: PropTypes.string,

  // overlay optional class
  overlayClassName: PropTypes.string,

  // sidebar content to render
  sidebar: PropTypes.node.isRequired,

  // boolean if sidebar should be docked
  docked: PropTypes.bool,

  // boolean if sidebar should slide open
  open: PropTypes.bool,

  // boolean if transitions should be disabled
  transitions: PropTypes.bool,

  // boolean if touch gestures are enabled
  touch: PropTypes.bool,

  // max distance from the edge we can start touching
  touchHandleSize: PropTypes.number,

  // Place the sidebar on the right
  pullPosition: PropTypes.number,

  // Enable/Disable sidebar shadow
  shadow: PropTypes.bool,

  // distance we have to drag the sidebar to toggle open state
  dragToggleDistance: PropTypes.number,

  // callback called when the overlay is clicked
  onSetOpen: PropTypes.func,

  // Initial sidebar width when page loads, if displaying horizontally
  defaultSidebarWidth: PropTypes.number,

  // Initial sidebar width when page loads, if displaying vertically
  defaultSidebarHeight: PropTypes.number,

  // root component optional id
  rootId: PropTypes.string,

  // sidebar optional id
  sidebarId: PropTypes.string,

  // content optional id
  contentId: PropTypes.string,

  // overlay optional id
  overlayId: PropTypes.string,
}

Sidebar.pullPositionTypes = {
  left: 0,
  right: 1,
  top: 2,
  bottom: 3,
}

Sidebar.defaultProps = {
  docked: false,
  open: false,
  transitions: true,
  touch: true,
  touchHandleSize: 20,
  pullPosition: 0,
  shadow: true,
  dragToggleDistance: 30,
  onSetOpen: () => {},
  styles: {},
  defaultSidebarWidth: 256,
  defaultSidebarHeight: 256,
}

export default Sidebar
