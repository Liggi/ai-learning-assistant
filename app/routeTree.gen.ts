/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as StaticFlowImport } from './routes/static-flow'
import { Route as StaticChatImport } from './routes/static-chat'
import { Route as StaticImport } from './routes/static'
import { Route as PillTestImport } from './routes/pill-test'
import { Route as LoadingImport } from './routes/loading'
import { Route as KnowledgeNodesImport } from './routes/knowledge-nodes'
import { Route as ChatImport } from './routes/chat'
import { Route as IndexImport } from './routes/index'
import { Route as StaticFlowIndexImport } from './routes/static-flow.index'
import { Route as StaticFlowRoadmapImport } from './routes/static-flow.roadmap'
import { Route as StaticFlowMindmapImport } from './routes/static-flow.mindmap'
import { Route as StaticFlowChatImport } from './routes/static-flow.chat'

// Create/Update Routes

const StaticFlowRoute = StaticFlowImport.update({
  id: '/static-flow',
  path: '/static-flow',
  getParentRoute: () => rootRoute,
} as any)

const StaticChatRoute = StaticChatImport.update({
  id: '/static-chat',
  path: '/static-chat',
  getParentRoute: () => rootRoute,
} as any)

const StaticRoute = StaticImport.update({
  id: '/static',
  path: '/static',
  getParentRoute: () => rootRoute,
} as any)

const PillTestRoute = PillTestImport.update({
  id: '/pill-test',
  path: '/pill-test',
  getParentRoute: () => rootRoute,
} as any)

const LoadingRoute = LoadingImport.update({
  id: '/loading',
  path: '/loading',
  getParentRoute: () => rootRoute,
} as any)

const KnowledgeNodesRoute = KnowledgeNodesImport.update({
  id: '/knowledge-nodes',
  path: '/knowledge-nodes',
  getParentRoute: () => rootRoute,
} as any)

const ChatRoute = ChatImport.update({
  id: '/chat',
  path: '/chat',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const StaticFlowIndexRoute = StaticFlowIndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => StaticFlowRoute,
} as any)

const StaticFlowRoadmapRoute = StaticFlowRoadmapImport.update({
  id: '/roadmap',
  path: '/roadmap',
  getParentRoute: () => StaticFlowRoute,
} as any)

const StaticFlowMindmapRoute = StaticFlowMindmapImport.update({
  id: '/mindmap',
  path: '/mindmap',
  getParentRoute: () => StaticFlowRoute,
} as any)

const StaticFlowChatRoute = StaticFlowChatImport.update({
  id: '/chat',
  path: '/chat',
  getParentRoute: () => StaticFlowRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/chat': {
      id: '/chat'
      path: '/chat'
      fullPath: '/chat'
      preLoaderRoute: typeof ChatImport
      parentRoute: typeof rootRoute
    }
    '/knowledge-nodes': {
      id: '/knowledge-nodes'
      path: '/knowledge-nodes'
      fullPath: '/knowledge-nodes'
      preLoaderRoute: typeof KnowledgeNodesImport
      parentRoute: typeof rootRoute
    }
    '/loading': {
      id: '/loading'
      path: '/loading'
      fullPath: '/loading'
      preLoaderRoute: typeof LoadingImport
      parentRoute: typeof rootRoute
    }
    '/pill-test': {
      id: '/pill-test'
      path: '/pill-test'
      fullPath: '/pill-test'
      preLoaderRoute: typeof PillTestImport
      parentRoute: typeof rootRoute
    }
    '/static': {
      id: '/static'
      path: '/static'
      fullPath: '/static'
      preLoaderRoute: typeof StaticImport
      parentRoute: typeof rootRoute
    }
    '/static-chat': {
      id: '/static-chat'
      path: '/static-chat'
      fullPath: '/static-chat'
      preLoaderRoute: typeof StaticChatImport
      parentRoute: typeof rootRoute
    }
    '/static-flow': {
      id: '/static-flow'
      path: '/static-flow'
      fullPath: '/static-flow'
      preLoaderRoute: typeof StaticFlowImport
      parentRoute: typeof rootRoute
    }
    '/static-flow/chat': {
      id: '/static-flow/chat'
      path: '/chat'
      fullPath: '/static-flow/chat'
      preLoaderRoute: typeof StaticFlowChatImport
      parentRoute: typeof StaticFlowImport
    }
    '/static-flow/mindmap': {
      id: '/static-flow/mindmap'
      path: '/mindmap'
      fullPath: '/static-flow/mindmap'
      preLoaderRoute: typeof StaticFlowMindmapImport
      parentRoute: typeof StaticFlowImport
    }
    '/static-flow/roadmap': {
      id: '/static-flow/roadmap'
      path: '/roadmap'
      fullPath: '/static-flow/roadmap'
      preLoaderRoute: typeof StaticFlowRoadmapImport
      parentRoute: typeof StaticFlowImport
    }
    '/static-flow/': {
      id: '/static-flow/'
      path: '/'
      fullPath: '/static-flow/'
      preLoaderRoute: typeof StaticFlowIndexImport
      parentRoute: typeof StaticFlowImport
    }
  }
}

// Create and export the route tree

interface StaticFlowRouteChildren {
  StaticFlowChatRoute: typeof StaticFlowChatRoute
  StaticFlowMindmapRoute: typeof StaticFlowMindmapRoute
  StaticFlowRoadmapRoute: typeof StaticFlowRoadmapRoute
  StaticFlowIndexRoute: typeof StaticFlowIndexRoute
}

const StaticFlowRouteChildren: StaticFlowRouteChildren = {
  StaticFlowChatRoute: StaticFlowChatRoute,
  StaticFlowMindmapRoute: StaticFlowMindmapRoute,
  StaticFlowRoadmapRoute: StaticFlowRoadmapRoute,
  StaticFlowIndexRoute: StaticFlowIndexRoute,
}

const StaticFlowRouteWithChildren = StaticFlowRoute._addFileChildren(
  StaticFlowRouteChildren,
)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/chat': typeof ChatRoute
  '/knowledge-nodes': typeof KnowledgeNodesRoute
  '/loading': typeof LoadingRoute
  '/pill-test': typeof PillTestRoute
  '/static': typeof StaticRoute
  '/static-chat': typeof StaticChatRoute
  '/static-flow': typeof StaticFlowRouteWithChildren
  '/static-flow/chat': typeof StaticFlowChatRoute
  '/static-flow/mindmap': typeof StaticFlowMindmapRoute
  '/static-flow/roadmap': typeof StaticFlowRoadmapRoute
  '/static-flow/': typeof StaticFlowIndexRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/chat': typeof ChatRoute
  '/knowledge-nodes': typeof KnowledgeNodesRoute
  '/loading': typeof LoadingRoute
  '/pill-test': typeof PillTestRoute
  '/static': typeof StaticRoute
  '/static-chat': typeof StaticChatRoute
  '/static-flow/chat': typeof StaticFlowChatRoute
  '/static-flow/mindmap': typeof StaticFlowMindmapRoute
  '/static-flow/roadmap': typeof StaticFlowRoadmapRoute
  '/static-flow': typeof StaticFlowIndexRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/chat': typeof ChatRoute
  '/knowledge-nodes': typeof KnowledgeNodesRoute
  '/loading': typeof LoadingRoute
  '/pill-test': typeof PillTestRoute
  '/static': typeof StaticRoute
  '/static-chat': typeof StaticChatRoute
  '/static-flow': typeof StaticFlowRouteWithChildren
  '/static-flow/chat': typeof StaticFlowChatRoute
  '/static-flow/mindmap': typeof StaticFlowMindmapRoute
  '/static-flow/roadmap': typeof StaticFlowRoadmapRoute
  '/static-flow/': typeof StaticFlowIndexRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/chat'
    | '/knowledge-nodes'
    | '/loading'
    | '/pill-test'
    | '/static'
    | '/static-chat'
    | '/static-flow'
    | '/static-flow/chat'
    | '/static-flow/mindmap'
    | '/static-flow/roadmap'
    | '/static-flow/'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/chat'
    | '/knowledge-nodes'
    | '/loading'
    | '/pill-test'
    | '/static'
    | '/static-chat'
    | '/static-flow/chat'
    | '/static-flow/mindmap'
    | '/static-flow/roadmap'
    | '/static-flow'
  id:
    | '__root__'
    | '/'
    | '/chat'
    | '/knowledge-nodes'
    | '/loading'
    | '/pill-test'
    | '/static'
    | '/static-chat'
    | '/static-flow'
    | '/static-flow/chat'
    | '/static-flow/mindmap'
    | '/static-flow/roadmap'
    | '/static-flow/'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  ChatRoute: typeof ChatRoute
  KnowledgeNodesRoute: typeof KnowledgeNodesRoute
  LoadingRoute: typeof LoadingRoute
  PillTestRoute: typeof PillTestRoute
  StaticRoute: typeof StaticRoute
  StaticChatRoute: typeof StaticChatRoute
  StaticFlowRoute: typeof StaticFlowRouteWithChildren
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  ChatRoute: ChatRoute,
  KnowledgeNodesRoute: KnowledgeNodesRoute,
  LoadingRoute: LoadingRoute,
  PillTestRoute: PillTestRoute,
  StaticRoute: StaticRoute,
  StaticChatRoute: StaticChatRoute,
  StaticFlowRoute: StaticFlowRouteWithChildren,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/chat",
        "/knowledge-nodes",
        "/loading",
        "/pill-test",
        "/static",
        "/static-chat",
        "/static-flow"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/chat": {
      "filePath": "chat.tsx"
    },
    "/knowledge-nodes": {
      "filePath": "knowledge-nodes.tsx"
    },
    "/loading": {
      "filePath": "loading.tsx"
    },
    "/pill-test": {
      "filePath": "pill-test.tsx"
    },
    "/static": {
      "filePath": "static.tsx"
    },
    "/static-chat": {
      "filePath": "static-chat.tsx"
    },
    "/static-flow": {
      "filePath": "static-flow.tsx",
      "children": [
        "/static-flow/chat",
        "/static-flow/mindmap",
        "/static-flow/roadmap",
        "/static-flow/"
      ]
    },
    "/static-flow/chat": {
      "filePath": "static-flow.chat.tsx",
      "parent": "/static-flow"
    },
    "/static-flow/mindmap": {
      "filePath": "static-flow.mindmap.tsx",
      "parent": "/static-flow"
    },
    "/static-flow/roadmap": {
      "filePath": "static-flow.roadmap.tsx",
      "parent": "/static-flow"
    },
    "/static-flow/": {
      "filePath": "static-flow.index.tsx",
      "parent": "/static-flow"
    }
  }
}
ROUTE_MANIFEST_END */
