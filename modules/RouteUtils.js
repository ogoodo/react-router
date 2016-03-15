import React from 'react'
import warning from './routerWarning'

// 类型验证(是React Element返回true)
function isValidChild(object) {
  return object == null || React.isValidElement(object)
}

// 类型验证(是React Element返回true)
export function isReactChildren(object) {
  return isValidChild(object) || (Array.isArray(object) && object.every(isValidChild))
}

// 类型验证
function checkPropTypes(componentName, propTypes, props) {
  componentName = componentName || 'UnknownComponent'

  for (const propName in propTypes) {
    if (propTypes.hasOwnProperty(propName)) {
      //验证目的还不清楚， 这里是怎么验证的    看    看    看
      const error = propTypes[propName](props, propName, componentName)

      /* istanbul ignore if: error logging */
      if (error instanceof Error)
        warning(false, error.message)
    }
  }
}

//就是合并两个对象(plainObject)
function createRoute(defaultProps, props) {
  return { ...defaultProps, ...props }
}

/**
 * 作用: 将jsx格式的路由配置, 转换成plainObject树结构
 * 生成路由树返回(能处理嵌套 如: <route><route/></route>)
 */
export function createRouteFromReactElement(element) {
  const type = element.type
  const route = createRoute(type.defaultProps, element.props)

  if (type.propTypes)
    checkPropTypes(type.displayName || type.name, type.propTypes, route)

  if (route.children) {
    const childRoutes = createRoutesFromReactChildren(route.children, route)

    if (childRoutes.length)
      route.childRoutes = childRoutes

    delete route.children
  }

  return route
}

/**
 * Creates and returns a routes object from the given ReactChildren. JSX
 * provides a convenient way to visualize how routes in the hierarchy are
 * nested.
 *
 *   import { Route, createRoutesFromReactChildren } from 'react-router'
 *   
 *   const routes = createRoutesFromReactChildren(
 *     <Route component={App}>
 *       <Route path="home" component={Dashboard}/>
 *       <Route path="news" component={NewsFeed}/>
 *     </Route>
 *   )
 *
 * Note: This method is automatically used when you provide <Route> children
 * to a <Router> component.
 */
 /**
  * 作用: jsx树转plainObject树
  * 生成路由树返回(能处理嵌套)
  */
export function createRoutesFromReactChildren(children, parentRoute) {
  const routes = []

  React.Children.forEach(children, function (element) {
    if (React.isValidElement(element)) {
      // Component classes may have a static create* method.
      // 如果组件类有自生的静态创建方法
      if (element.type.createRouteFromReactElement) {
        const route = element.type.createRouteFromReactElement(element, parentRoute)

        if (route)
          routes.push(route)
      } else {
        routes.push(createRouteFromReactElement(element))
      }
    }
  })

  return routes
}

/**
 * Creates and returns an array of routes from the given object which
 * may be a JSX route, a plain object route, or an array of either.
 */
 /**
  * 作用: 传入jsx树或者plainObject树, 返回plainObject树数组(Array)
  * @param routes jsx创建的ReactElement 或者 plainObject定义的route
  */
export function createRoutes(routes) {
  if (isReactChildren(routes)) {
    routes = createRoutesFromReactChildren(routes)
  } else if (routes && !Array.isArray(routes)) {
    routes = [ routes ]
  }

  return routes
}
