import warning from './routerWarning'
import { REPLACE } from 'history/lib/Actions'
import computeChangedRoutes from './computeChangedRoutes'
import { runEnterHooks, runLeaveHooks } from './TransitionUtils'
import { default as _isActive } from './isActive'
import getComponents from './getComponents'
import matchRoutes from './matchRoutes'

function hasAnyProperties(object) {
  for (const p in object)
    if (object.hasOwnProperty(p))
      return true

  return false
}

/**
 * 这里输出了一个类(方法集合)
 */
export default function createTransitionManager(history, routes) {
  let state = {}

  // Signature should be (location, indexOnly), but needs to support (path,
  // query, indexOnly)
  function isActive(
    location, indexOnlyOrDeprecatedQuery=false, deprecatedIndexOnly=null
  ) {
    let indexOnly
    if (
      (indexOnlyOrDeprecatedQuery && indexOnlyOrDeprecatedQuery !== true) ||
      deprecatedIndexOnly !== null
    ) {
      warning(
        false,
        '`isActive(pathname, query, indexOnly) is deprecated; use `isActive(location, indexOnly)` with a location descriptor instead. http://tiny.cc/router-isActivedeprecated'
      )
      location = { pathname: location, query: indexOnlyOrDeprecatedQuery }
      indexOnly = deprecatedIndexOnly || false
    } else {
      location = history.createLocation(location)
      indexOnly = indexOnlyOrDeprecatedQuery
    }

    return _isActive(
      location, indexOnly, state.location, state.routes, state.params
    )
  }

  function createLocationFromRedirectInfo(location) {
    return history.createLocation(location, REPLACE)
  }

  let partialNextState

  /**
   * @param location[location对象]
   */
  function match(location, callback) {
    // 判断url是否有改变
    if (partialNextState && partialNextState.location === location) {
      // Continue from where we left off.
      finishMatch(partialNextState, callback)
    } else {
      matchRoutes(routes, location, function (error, nextState) {
        if (error) {
          callback(error)
        } else if (nextState) {
          //如果路径完全匹配上, 会来到这里
          //@param nextState[Object]
          //@param nextState.params[Object]
          //@param nextState.routes[Array]  匹配成功的route数组
          finishMatch({ ...nextState, location }, callback)
        } else {
          callback()
        }
      })
    }
  }

  function finishMatch(nextState, callback) {
    //计算出离开哪些路由, 进入那些路由
    const { leaveRoutes, enterRoutes } = computeChangedRoutes(state, nextState)

    // 给每个route触发onLeave(如果有设定onLeave回调的话)
    runLeaveHooks(leaveRoutes)

    // Tear down confirmation hooks for left routes
    // 清理重复使用路由hook数据(相当于初始化一下, route复用初始化)
    leaveRoutes
      .filter(route => enterRoutes.indexOf(route) === -1)
      .forEach(removeListenBeforeHooksForRoute)

    //看到这里了        看        看        看
    runEnterHooks(enterRoutes, nextState, function (error, redirectInfo) {
      if (error) {
        callback(error)
      } else if (redirectInfo) {
        callback(null, createLocationFromRedirectInfo(redirectInfo))
      } else {
        // TODO: Fetch components after state is updated.
        getComponents(nextState, function (error, components) {
          if (error) {
            callback(error)
          } else {
            // TODO: Make match a pure function and have some other API
            // for "match and update state".
            // 这里应该是获取到了, route和component两个队列
            // location解析到route和component的动作就完成了
            // 本文件的目的就是做这个事 by:ogoodo.com
            //      重点     重点     重点
            callback(null, null, (
              state = { ...nextState, components })
            )
          }
        })
      }
    })
  }

  let RouteGuid = 1

  function getRouteID(route, create = true) {
    return route.__id__ || create && (route.__id__ = RouteGuid++)
  }

  const RouteHooks = {}

  function getRouteHooksForRoutes(routes) {
    return routes.reduce(function (hooks, route) {
      hooks.push.apply(hooks, RouteHooks[getRouteID(route)])
      return hooks
    }, [])
  }

  function transitionHook(location, callback) {
    matchRoutes(routes, location, function (error, nextState) {
      if (nextState == null) {
        // TODO: We didn't actually match anything, but hang
        // onto error/nextState so we don't have to matchRoutes
        // again in the listen callback.
        callback()
        return
      }

      // Cache some state here so we don't have to
      // matchRoutes() again in the listen callback.
      partialNextState = { ...nextState, location }

      const hooks = getRouteHooksForRoutes(
        computeChangedRoutes(state, partialNextState).leaveRoutes
      )

      let result
      for (let i = 0, len = hooks.length; result == null && i < len; ++i) {
        // Passing the location arg here indicates to
        // the user that this is a transition hook.
        result = hooks[i](location)
      }

      callback(result)
    })
  }

  /* istanbul ignore next: untestable with Karma */
  function beforeUnloadHook() {
    // Synchronously check to see if any route hooks want
    // to prevent the current window/tab from closing.
    if (state.routes) {
      const hooks = getRouteHooksForRoutes(state.routes)

      let message
      for (let i = 0, len = hooks.length; typeof message !== 'string' && i < len; ++i) {
        // Passing no args indicates to the user that this is a
        // beforeunload hook. We don't know the next location.
        message = hooks[i]()
      }

      return message
    }
  }

  let unlistenBefore, unlistenBeforeUnload

  function removeListenBeforeHooksForRoute(route) {
    const routeID = getRouteID(route, false)
    if (!routeID) {
      return
    }

    delete RouteHooks[routeID]

    if (!hasAnyProperties(RouteHooks)) {
      // teardown transition & beforeunload hooks
      if (unlistenBefore) {
        unlistenBefore()
        unlistenBefore = null
      }

      if (unlistenBeforeUnload) {
        unlistenBeforeUnload()
        unlistenBeforeUnload = null
      }
    }
  }

  /**
   * Registers the given hook function to run before leaving the given route.
   *
   * During a normal transition, the hook function receives the next location
   * as its only argument and must return either a) a prompt message to show
   * the user, to make sure they want to leave the page or b) false, to prevent
   * the transition.
   *
   * During the beforeunload event (in browsers) the hook receives no arguments.
   * In this case it must return a prompt message to prevent the transition.
   *
   * Returns a function that may be used to unbind the listener.
   */
  function listenBeforeLeavingRoute(route, hook) {
    // TODO: Warn if they register for a route that isn't currently
    // active. They're probably doing something wrong, like re-creating
    // route objects on every location change.
    const routeID = getRouteID(route)
    let hooks = RouteHooks[routeID]

    if (!hooks) {
      let thereWereNoRouteHooks = !hasAnyProperties(RouteHooks)

      RouteHooks[routeID] = [ hook ]

      if (thereWereNoRouteHooks) {
        // setup transition & beforeunload hooks
        unlistenBefore = history.listenBefore(transitionHook)

        if (history.listenBeforeUnload)
          unlistenBeforeUnload = history.listenBeforeUnload(beforeUnloadHook)
      }
    } else {
      if (hooks.indexOf(hook) === -1) {
        warning(
          false,
          'adding multiple leave hooks for the same route is deprecated; manage multiple confirmations in your own code instead'
        )

        hooks.push(hook)
      }
    }

    return function () {
      const hooks = RouteHooks[routeID]

      if (hooks) {
        const newHooks = hooks.filter(item => item !== hook)

        if (newHooks.length === 0) {
          removeListenBeforeHooksForRoute(route)
        } else {
          RouteHooks[routeID] = newHooks
        }
      }
    }
  }

  /**
   * This is the API for stateful environments. As the location
   * changes, we update state and call the listener. We can also
   * gracefully handle errors and redirects.
   */
  /**
   * 入口  这个是url改变后调用的第一个函数       重要       重要       重要
   */
  function listen(listener) {
    // TODO: Only use a single history listener. Otherwise we'll
    // end up with multiple concurrent calls to match.
    // react-router-redux有hook了listory.listen函数, 在内部就和了redux的store做处理
    //这里就是调用react-router-redux里的listen函数(看sync.js 122行)
    return history.listen(function (location) {
      if (state.location === location) {
        listener(null, state)
      } else {
        match(location, function (error, redirectLocation, nextState) {
          if (error) {
            listener(error)
          } else if (redirectLocation) {
            history.transitionTo(redirectLocation)
          } else if (nextState) {
            //这里会回掉Router的函数, 最终调用setState
            listener(null, nextState)
          } else {
            warning(
              false,
              'Location "%s" did not match any routes',
              location.pathname + location.search + location.hash
            )
          }
        })
      }
    })
  }

  return {
    isActive,
    match,
    listenBeforeLeavingRoute,
    listen
  }
}

//export default useRoutes
