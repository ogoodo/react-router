import { getParamNames } from './PatternUtils'

function routeParamsChanged(route, prevState, nextState) {
  if (!route.path)
    return false

  const paramNames = getParamNames(route.path)

  return paramNames.some(function (paramName) {
    return prevState.params[paramName] !== nextState.params[paramName]
  })
}

/**
 * Returns an object of { leaveRoutes, enterRoutes } determined by
 * the change from prevState to nextState. We leave routes if either
 * 1) they are not in the next state or 2) they are in the next state
 * but their params have changed (i.e. /users/123 => /users/456).
 *
 * leaveRoutes are ordered starting at the leaf route of the tree
 * we're leaving up to the common parent route. enterRoutes are ordered
 * from the top of the tree we're entering down to the leaf route.
 */
 /**
  * 返回一个对象{ leaveRoutes, enterRoutes }由prevState到nextState的改变(不同点)产生的
  * 这两种情况算leave routes(离开路由) 
  *   1.路由没有存在nextState内，
  *   2.他们存在nextState内， 但是参数有改变(i.e. /users/123 => /users/456)
  * leaveRoutes是从路由树的枝叶向根部排序， 我们是离开从共同的父路由
  * enterRoutes是从路由树的根部向枝叶排序, 我们是进入枝叶路由
  */
  // 这个函数的作用就是, 从新老路由计算出，哪些路由被舍弃, 哪些是新增(新老都存在的就没管)
function computeChangedRoutes(prevState, nextState) {
  const prevRoutes = prevState && prevState.routes
  const nextRoutes = nextState.routes

  let leaveRoutes, enterRoutes
  if (prevRoutes) {
    let parentIsLeaving = false
    leaveRoutes = prevRoutes.filter(function (route) {
      if (parentIsLeaving) {
        return true
      } else {
        const isLeaving = nextRoutes.indexOf(route) === -1 || routeParamsChanged(route, prevState, nextState)
        if (isLeaving)
          parentIsLeaving = true
        return isLeaving
      }
    })

    // onLeave hooks start at the leaf route.
    leaveRoutes.reverse()

    enterRoutes = nextRoutes.filter(function (route) {
      return prevRoutes.indexOf(route) === -1 || leaveRoutes.indexOf(route) !== -1
    })
  } else {
    leaveRoutes = []
    enterRoutes = nextRoutes
  }

  return {
    leaveRoutes,
    enterRoutes
  }
}

export default computeChangedRoutes
