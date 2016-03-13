import deprecateObjectProperties from './deprecateObjectProperties'

// 合并两者一些属性， 返回新obj
export function createRouterObject(history, transitionManager) {
  return {
    ...history,
    setRouteLeaveHook: transitionManager.listenBeforeLeavingRoute,
    isActive: transitionManager.isActive
  }
}

// deprecated
// 合并两个对象， 开发模式特殊对待了下(包装了下,输入访问日志)
export function createRoutingHistory(history, transitionManager) {
  history = {
    ...history,
    ...transitionManager
  }

  if (__DEV__) {
    history = deprecateObjectProperties(
      history,
      '`props.history` and `context.history` are deprecated. Please use `context.router`. http://tiny.cc/router-contextchanges'
    )
  }

  return history
}
