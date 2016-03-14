import React from 'react'
import invariant from 'invariant'
import { createRouteFromReactElement } from './RouteUtils'
import { component, components } from './PropTypes'

const { string, func } = React.PropTypes

/**
 * A <Route> is used to declare which components are rendered to the
 * page when the URL matches a given pattern.
 *
 * Routes are arranged in a nested tree structure. When a new URL is
 * requested, the tree is searched depth-first to find a route whose
 * path matches the URL.  When one is found, all routes in the tree
 * that lead to it are considered "active" and their components are
 * rendered into the DOM, nested in the same order as in the tree.
 */
/**
 * <Route> 是将匹配到的Url渲染到相应的组建(做组建和url的配对)
 *
 * 路由保存在嵌套的route树结构里, 当以url请求时, 
 * 从路由树第一层查找出匹配URL的route， 如果有查找到，
 * 所有路由在route树结构里被找出激活,并且渲染出他们的组建
 * 嵌套的顺序和route树一样
 */
const Route = React.createClass({ 

  statics: {
    createRouteFromReactElement
  },

  propTypes: {
    path: string,
    component,
    components,
    getComponent: func,
    getComponents: func
  },

  /* istanbul ignore next: sanity check */
  render() {
    invariant(
      false,
      '<Route> elements are for router configuration only and should not be rendered'
    )
  }

})

export default Route
