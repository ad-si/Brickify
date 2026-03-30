import clone from "clone"
import { Request, Response, NextFunction } from "express"

interface Session {
  id: string;
  [key: string]: unknown;
}

const sessions: Partial<Record<string, Session>> = {}
const shareLinks: Partial<Record<string, string>> = {}

export function middleware (request: Request, response: Response, next: NextFunction) {
  // if in /app, do we have a share url?
  let sessionId: string
  if ((request.path === "/app") && (request.query.share != null)) {
    sessionId = Array.isArray(request.query.share) ? (request.query.share[0] as string) : request.query.share as string
    resolveShare(sessionId, request, response, next)
      return
    // if in /app, do we have a url parameter that indicates a session?
  }
  else if ((request.path === "/app") && (request.query.s != null)) {
    sessionId = Array.isArray(request.query.s) ? (request.query.s[0] as string) : request.query.s as string
    checkSession(sessionId, request, response, next)
      return
    // do we have a cookie that indicates a session?
  }
  else if (request.cookies.s != null) {
    sessionId = String(request.cookies.s)
    checkSession(sessionId, request, response, next)
      return
    // no session indication -> create a new session
  }
  else {
    newSession(request, response, next)
      return
  }
}

export function generateShareId (sid: string): string {
  // check if share id exists
  for (const key of Object.keys(shareLinks)) {
    if (shareLinks[key] === sid) {
      return key
    }
  }

  // create new one
  const id = generateId(10)
  shareLinks[id] = sid
  return id
}

const checkSession = function (sessionId: string, request: Request, response: Response, next: NextFunction) {
  // Does the session exist?
  if (sessions[sessionId] != null) {
    // if in /app, redirect to /app?s=id (always show session id)
    if ((request.path === "/app") && (request.query.s == null)) {
      response.redirect("/app?s=" + sessionId)
      return
    }

    // apply session for further processing
    (request as Request & { session: Session }).session = sessions[sessionId]
    response.cookie("s", sessionId)
    next()
      return
  }
  else {
    // create a new session for invalid Ids and redirect
    newSession(request, response, next)
      return
  }
}

const resolveShare = function (shareId: string, request: Request, response: Response, next: NextFunction) {
  // Is this a valid share link?
  if (shareLinks[shareId] != null) {
    // create a new session with a copy of the shared state
    const sid = shareLinks[shareId]
    const session = sessions[sid]
    const cloned = clone(session)
    newSession(request, response, next, cloned)
      return
  }
  else {
    // invalid share id - generate new state
    newSession(request, response, next)
      return
  }
}

const newSession = function (request: Request, response: Response, next: NextFunction, sessionData: Partial<Session> | null = null) {
  (request as Request & { session: Session }).session = generateSession(sessionData)
  response.cookie("s", (request as Request & { session: Session }).session.id)

  // only redirect if already in /app (but maybe with wrong session id)
  // prevents from redirection from mainpage etc
  if (request.path === "/app") {
    response.redirect("/app?s=" + (request as Request & { session: Session }).session.id)
      return
  }
  else {
    next()
      return
  }
}

const generateSession = function (sessionData: Partial<Session> | null = null): Session {
  const id = generateId(10)
  sessions[id] = { ...sessionData, id } as Session
  return sessions[id]
}

const generateId = function (length: number): string {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyz"
  let result = ""
  for (let i = 0, end = length; i < end; i++) {
    const index = Math.floor(Math.random() * chars.length)
    const c = chars[index]
    result += c
  }
  return result
}
