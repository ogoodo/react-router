import createHashHistory from 'history/lib/createHashHistory'
import useQueries from 'history/lib/useQueries'
import React from 'react'

import createTransitionManager from './createTransitionManager'
import { routes } from './PropTypes'
import RouterContext from './RouterContext'
import { createRoutes } from './RouteUtils'
import { createRouterObject, createRoutingHistory } from './RouterUtils'
import warning from './routerWarning'

// 判断history是否过时了
function isDeprecatedHistory(history) {
  return !history || !history.__v2_compatible__
}

const { func, object } = React.PropTypes

/**
 * A <Router> is a high-level API for automatically setting up
 * a router that renders a <RouterContext> with all the props
 * it needs each time the URL changes.
 */
const Router = React.createClass({

  propTypes: {
    history: object,
    children: routes,
    routes, // alias for children
    render: func,
    createElement: func,
    onError: func,
    onUpdate: func,

    // PRIVATE: For client-side rehydration of server match.
    matchContext: object
  },

  getDefaultProps() {
    return {
      render(props) {
        return <RouterContext {...props} />
      }
    }
  },

  getInitialState() {
    return {
      location: null,
      routes: null,
      params: null,
      components: null
    }
  },

  handleError(error) {
    if (this.props.onError) {
      this.props.onError.call(this, error)
    } else {
      // Throw errors by default so we don't silently swallow them!
      throw error // This error probably occurred in getChildRoutes or getComponents.
    }
  },

  componentWillMount() {
    const { parseQueryString, stringifyQuery } = this.props
    warning(
      !(parseQueryString || stringifyQuery),
      '`parseQueryString` and `stringifyQuery` are deprecated. Please create a custom history. http://tiny.cc/router-customquerystring'
    )

    const { history, transitionManager, router } = this.createRouterObjects()

    //订阅url改变消息, 如果没出错触发setState()重新render
    // 其实最终还是调用history的订阅消息人
    this._unlisten = transitionManager.listen((error, state) => {
      if (error) {
        this.handleError(error)
      } else {
        this.setState(state, this.props.onUpdate)
      }
    })

    this.history = history
    this.router = router
  },

  // 没干啥高深事, 返回几个要使用的对象
  createRouterObjects() {
    const { matchContext } = this.props
    if (matchContext) {
      return matchContext
    }

    let { history } = this.props
    const { routes, children } = this.props

    if (isDeprecatedHistory(history)) {
      history = this.wrapDeprecatedHistory(history)
    }

    // 返回了一个方法集(类似:{a:func, b:func})
    const transitionManager = createTransitionManager(
      history, createRoutes(routes || children)
    )
    //合并两对象部分属性, 返回了个新对象
    const router = createRouterObject(history, transitionManager)
    //合并两对象, 返回了个新对象
    const routingHistory = createRoutingHistory(history, transitionManager)

    return { history: routingHistory, transitionManager, router }
  },

  wrapDeprecatedHistory(history) {
    const { parseQueryString, stringifyQuery } = this.props

    let createHistory
    if (history) {
      warning(false, 'It appears you have provided a deprecated history object to `<Router/>`, please use a history provided by ' +
                     'React Router with `import { browserHistory } from \'react-router\'` or `import { hashHistory } from \'react-router\'`. ' +
                     'If you are using a custom history please create it with `useRouterHistory`, see http://tiny.cc/router-usinghistory for details.')
      createHistory = () => history
    } else {
      warning(false, '`Router` no longer defaults the history prop to hash history. Please use the `hashHistory` singleton instead. http://tiny.cc/router-defaulthistory')
      createHistory = createHashHistory
    }

    return useQueries(createHistory)({ parseQueryString, stringifyQuery })
  },

  /* istanbul ignore next: sanity check */
  componentWillReceiveProps(nextProps) {
    warning(
      nextProps.history === this.props.history,
      'You cannot change <Router history>; it will be ignored'
    )

    warning(
      (nextProps.routes || nextProps.children) ===
        (this.props.routes || this.props.children),
      'You cannot change <Router routes>; it will be ignored'
    )
  },

  componentWillUnmount() {
    if (this._unlisten)
      this._unlisten()
  },

  render() {
    const { location, routes, params, components } = this.state
    const { createElement, render, ...props } = this.props

    if (location == null)
      return null // Async match

    // Only forward non-Router-specific props to routing context, as those are
    // the only ones that might be custom routing context props.
    Object.keys(Router.propTypes).forEach(propType => delete props[propType])

    // 这里实际调用getDefaultProps()里的render函数, 会返回return <RouterContext {...props} />
    // <Router />层是不是由<Provider />层创建的 by:ogoodo.com
    return render({
      ...props,
      history: this.history,
      router: this.router,
      location,
      routes,
      params,
      components,
      createElement
    })
  }

})
/**/
export default Router
// 

//