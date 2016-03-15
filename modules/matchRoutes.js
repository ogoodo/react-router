import warning from './routerWarning'
import { loopAsync } from './AsyncUtils'
import { matchPattern } from './PatternUtils'
import { createRoutes } from './RouteUtils'


/**
 * 获取子节点路由, 支持递归和异步,
 * 可以是childRoutes对象, 或者getChildRoutes()方法
 * @param route[出入<Router />的routes属性][应该<Router />的字节点也可以]
 */
function getChildRoutes(route, location, callback) {
  if (route.childRoutes) {
    return [ null, route.childRoutes ]
  }
  if (!route.getChildRoutes) {
    return []
  }

  //估计异步路由第一次加载是异步, 以后从缓存取就可以是同步了
  let sync = true, result

  // 这里可以是异步加载
  route.getChildRoutes(location, function (error, childRoutes) {
    // 异步加载完之后, 将新加载的路由标准化(jsx和plainObject统一为plainObject路由队列)
    childRoutes = !error && createRoutes(childRoutes)
    if (sync) {
      //异步加载路由, 第二次后从缓存取就会来到这里
      result = [ error, childRoutes ]
      return
    }

    callback(error, childRoutes)
  })

  sync = false
  return result  // Might be undefined.
}

/**
 * 获取indexRoute的函数
 */
function getIndexRoute(route, location, callback) {
  if (route.indexRoute) {
    callback(null, route.indexRoute)
  } else if (route.getIndexRoute) {
    route.getIndexRoute(location, function (error, indexRoute) {
      callback(error, !error && createRoutes(indexRoute)[0])
    })
  } else if (route.childRoutes) {
    const pathless = route.childRoutes.filter(function (obj) {
      return !obj.hasOwnProperty('path')
    })

    loopAsync(pathless.length, function (index, next, done) {
      getIndexRoute(pathless[index], location, function (error, indexRoute) {
        if (error || indexRoute) {
          const routes = [ pathless[index] ].concat( Array.isArray(indexRoute) ? indexRoute : [ indexRoute ] )
          done(error, routes)
        } else {
          next()
        }
      })
    }, function (err, routes) {
      callback(null, routes)
    })
  } else {
    callback()
  }
}

/**
 * 将paramNames 和paramValues值增加到 params里去(不会覆盖原来值,可能会影响存储结构)
 */
function assignParams(params, paramNames, paramValues) {
  return paramNames.reduce(function (params, paramName, index) {
    const paramValue = paramValues && paramValues[index]

    if (Array.isArray(params[paramName])) {
      params[paramName].push(paramValue)
    } else if (paramName in params) {
      params[paramName] = [ params[paramName], paramValue ]
    } else {
      params[paramName] = paramValue
    }

    return params
  }, params)
}

function createParams(paramNames, paramValues) {
  return assignParams({}, paramNames, paramValues)
}

function matchRouteDeep(
  route, location, remainingPathname, paramNames, paramValues, callback
) {
  let pattern = route.path || ''

  // 如果是绝对路径, 初始化些变量
  if (pattern.charAt(0) === '/') {
    remainingPathname = location.pathname
    paramNames = []
    paramValues = []
  }

  if (remainingPathname !== null) {
    // 待匹配路径remainingPathname用正则减去一匹配路径pattern
    // 如果matched.remainingPathname === null 路径没匹配上
    const matched = matchPattern(pattern, remainingPathname)
    remainingPathname = matched.remainingPathname
    paramNames = [ ...paramNames, ...matched.paramNames ]
    paramValues = [ ...paramValues, ...matched.paramValues ]

    //如果路径全部都匹配上了
    if (remainingPathname === '' && route.path) {
      const match = {
        routes: [ route ],
        params: createParams(paramNames, paramValues)
      }

      getIndexRoute(route, location, function (error, indexRoute) {
        if (error) {
          callback(error)
        } else {
          if (Array.isArray(indexRoute)) {
            warning(
              indexRoute.every(route => !route.path),
              'Index routes should not have paths'
            )
            match.routes.push(...indexRoute)
          } else if (indexRoute) {
            warning(
              !indexRoute.path,
              'Index routes should not have paths'
            )
            match.routes.push(indexRoute)
          }
          //默认的最终匹配(匹配深度最大)会到这里回调
          callback(null, match)
        }
      })
      return
    }
  }

  //如果路径还没匹配完成
  if (remainingPathname != null || route.childRoutes) {
    // Either a) this route matched at least some of the path or b)
    // we don't have to load this route's children asynchronously. In
    // either case continue checking for matches in the subtree.
    const onChildRoutes = (error, childRoutes) => {
      if (error) {
        callback(error)
      } else if (childRoutes) {
        // Check the child routes to see if any of them match.
        matchRoutes(childRoutes, location, function (error, match) {
          if (error) {
            callback(error)
          } else if (match) {
            // A child route matched! Augment the match and pass it up the stack.
            //匹配成功了的话， 这里会压入route
            match.routes.unshift(route)
            callback(null, match)
          } else {
            callback()
          }
        }, remainingPathname, paramNames, paramValues)
      } else {
        callback()
      }
    }

    const result = getChildRoutes(route, location, onChildRoutes)
    if (result) {
      onChildRoutes(...result)
    }
  } else {
    //没匹配到
    callback()
  }
}

/**
 * Asynchronously matches the given location to a set of routes and calls
 * callback(error, state) when finished. The state object will have the
 * following properties:
 *
 * - routes       An array of routes that matched, in hierarchical order
 * - params       An object of URL parameters
 *
 * Note: This operation may finish synchronously if no routes have an
 * asynchronous getChildRoutes method.
 */
//matchRoutes 方法会匹配出 Route 组件树中与当前 location 对象匹配的一个子集，并且得到了 nextState  
//参考: https://segmentfault.com/a/1190000004075348#articleHeader4
//没细看
/**
 * matchRoutes->matchRouteDeep->matchRoutes 会递归调用
 * matchRoutes就做个循环, 主要逻辑给matchRouteDeep传参routes[index]去运算了
 */
function matchRoutes(
  routes, location, callback,
  remainingPathname=location.pathname, paramNames=[], paramValues=[]
) {
  loopAsync(routes.length, function (index, next, done) {
    matchRouteDeep(
      routes[index], location, remainingPathname, paramNames, paramValues,
      function (error, match) {
        if (error || match) {
          done(error, match)
        } else {
          next()
        }
      }
    )
  }, callback)
}

export default matchRoutes
