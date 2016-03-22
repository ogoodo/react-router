import { mapAsync } from './AsyncUtils'

function getComponentsForRoute(location, route, callback) {
  if (route.component || route.components) {
    callback(null, route.component || route.components)
  } else if (route.getComponent) {
    route.getComponent(location, callback)
  } else if (route.getComponents) {
    route.getComponents(location, callback)
  } else {
    callback()
  }
}

/**
 * Asynchronously fetches all components needed for the given router
 * state and calls callback(error, components) when finished.
 *
 * Note: This operation may finish synchronously if no routes have an
 * asynchronous getComponents method.
 */
 /**
  * 异步获取所有路由需要的组件， 并且在完成后回掉callback函数
  * 注意: 这个操作可能会同步完成, 如果没有路由的组建要通过调用异步函数getComponents获取的话
  */
  // 这里就是一个简单的获取路由组建的功能(可以异步)
function getComponents(nextState, callback) {
  mapAsync(nextState.routes, function (route, index, callback) {
    getComponentsForRoute(nextState.location, route, callback)
  }, callback)
}

export default getComponents
